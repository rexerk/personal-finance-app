const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: adjust account balance
const adjustBalance = async (accountId, amount, type, reverse = false) => {
    const multiplier = reverse ? -1 : 1;
    const change = type === 'income' ? amount * multiplier : -amount * multiplier;
    await Account.findByIdAndUpdate(accountId, { $inc: { balance: change } });
};

// Helper: check budget overspend
const checkBudget = async (userId, categoryId, month, year) => {
    const budget = await Budget.findOne({ user_id: userId, category_id: categoryId, month, year });
    if (!budget) return null;

    const result = await Transaction.aggregate([
        {
            $match: {
                category_id: new mongoose.Types.ObjectId(categoryId),
                transaction_type: 'expense',
                $expr: {
                    $and: [
                        { $eq: [{ $month: '$transaction_date' }, month] },
                        { $eq: [{ $year:  '$transaction_date' }, year]  }
                    ]
                }
            }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalSpent = result[0]?.total ?? 0;
    return {
        monthly_limit: budget.monthly_limit,
        total_spent:   totalSpent,
        remaining:     budget.monthly_limit - totalSpent,
        overspent:     totalSpent > budget.monthly_limit
    };
};

// GET all transactions for logged-in user
// Supports filters: ?account_id=&category_id=&type=&start=&end=
router.get('/', auth, async (req, res) => {
    try {
        const { account_id, category_id, type, start, end } = req.query;

        // Get all accounts belonging to user
        const userAccounts = await Account.find({ user_id: req.user.userId }).select('_id');
        const accountIds = userAccounts.map(a => a._id);

        const filter = { account_id: { $in: accountIds } };
        if (account_id)  filter.account_id  = account_id;
        if (category_id) filter.category_id = category_id;
        if (type)        filter.transaction_type = type;
        if (start || end) {
            filter.transaction_date = {};
            if (start) filter.transaction_date.$gte = new Date(start);
            if (end)   filter.transaction_date.$lte = new Date(end);
        }

        const transactions = await Transaction.find(filter)
            .populate('account_id',  'account_name')
            .populate('category_id', 'category_name category_type')
            .populate('tag_ids',     'tag_name')
            .sort({ transaction_date: -1 });

        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transactions.' });
    }
});

// GET single transaction
router.get('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('account_id',  'account_name')
            .populate('category_id', 'category_name category_type')
            .populate('tag_ids',     'tag_name');

        if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });
        res.status(200).json(transaction);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transaction.' });
    }
});

// GET monthly spending summary by category
// Non-trivial query #1: aggregation with grouping
router.get('/reports/monthly-summary', auth, async (req, res) => {
    try {
        const { month, year } = req.query;

        const userAccounts = await Account.find({ user_id: req.user.userId }).select('_id');
        const accountIds = userAccounts.map(a => a._id);

        const summary = await Transaction.aggregate([
            {
                $match: {
                    account_id: { $in: accountIds },
                    transaction_type: 'expense',
                    $expr: {
                        $and: [
                            { $eq: [{ $month: '$transaction_date' }, parseInt(month)] },
                            { $eq: [{ $year:  '$transaction_date' }, parseInt(year)]  }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id:   '$category_id',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from:         'categories',
                    localField:   '_id',
                    foreignField: '_id',
                    as:           'category'
                }
            },
            { $unwind: '$category' },
            { $sort: { total: -1 } }
        ]);

        res.status(200).json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate monthly summary.' });
    }
});

// GET recent high-value transactions
// Non-trivial query #2: filter + sort + limit
router.get('/reports/high-value', auth, async (req, res) => {
    try {
        const threshold = parseFloat(req.query.threshold) || 100;

        const userAccounts = await Account.find({ user_id: req.user.userId }).select('_id');
        const accountIds = userAccounts.map(a => a._id);

        const transactions = await Transaction.find({
            account_id: { $in: accountIds },
            amount:     { $gte: threshold }
        })
            .populate('account_id',  'account_name')
            .populate('category_id', 'category_name')
            .populate('tag_ids',     'tag_name')
            .sort({ amount: -1, transaction_date: -1 })
            .limit(10);

        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch high-value transactions.' });
    }
});

// POST create transaction
router.post('/', auth, async (req, res) => {
    try {
        const { account_id, category_id, tag_ids, amount, transaction_type, description, transaction_date } = req.body;

        // Verify account belongs to user
        const account = await Account.findOne({ _id: account_id, user_id: req.user.userId });
        if (!account) return res.status(404).json({ error: 'Account not found.' });

        // Prevent negative balance on expense
        if (transaction_type === 'expense' && account.balance < amount) {
            return res.status(400).json({ error: 'Insufficient account balance.' });
        }

        const transaction = await Transaction.create({
            account_id,
            category_id,
            tag_ids: tag_ids ?? [],
            amount,
            transaction_type,
            description,
            transaction_date
        });

        // Update account balance
        await adjustBalance(account_id, amount, transaction_type);

        // Check budget after creating expense
        let budgetStatus = null;
        if (transaction_type === 'expense') {
            const date = new Date(transaction_date);
            budgetStatus = await checkBudget(
                req.user.userId,
                category_id,
                date.getMonth() + 1,
                date.getFullYear()
            );
        }

        res.status(201).json({
            message: 'Transaction created.',
            transaction,
            budget_status: budgetStatus
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create transaction.' });
    }
});

// PUT update transaction
router.put('/:id', auth, async (req, res) => {
    try {
        const { tag_ids, description, transaction_date } = req.body;

        // Only allow editing non-financial fields
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            { tag_ids, description, transaction_date },
            { new: true, runValidators: true }
        );

        if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });
        res.status(200).json({ message: 'Transaction updated.', transaction });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update transaction.' });
    }
});

// DELETE transaction
router.delete('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });

        // Verify account belongs to user
        const account = await Account.findOne({ _id: transaction.account_id, user_id: req.user.userId });
        if (!account) return res.status(403).json({ error: 'Unauthorized.' });

        // Reverse the balance change
        await adjustBalance(transaction.account_id, transaction.amount, transaction.transaction_type, true);

        await Transaction.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Transaction deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete transaction.' });
    }
});

module.exports = router;