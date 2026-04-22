const express = require('express');
const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();

// GET all budgets for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const budgets = await Budget.find({ user_id: req.user.userId })
            .populate('category_id', 'category_name category_type')
            .sort({ year: -1, month: -1 });

        res.status(200).json(budgets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch budgets.' });
    }
});

// GET single budget by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const budget = await Budget.findOne({ _id: req.params.id, user_id: req.user.userId })
            .populate('category_id', 'category_name category_type');

        if (!budget) return res.status(404).json({ error: 'Budget not found.' });
        res.status(200).json(budget);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch budget.' });
    }
});

// GET budget vs actual spending report
// Non-trivial query #3: $lookup to join budgets with actual spending
router.get('/reports/vs-actual', auth, async (req, res) => {
    try {
        const { month, year } = req.query;

        const userAccounts = await Account.find({ user_id: req.user.userId }).select('_id');
        const accountIds = userAccounts.map(a => a._id);

        const report = await Budget.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(req.user.userId),
                    month:   parseInt(month),
                    year:    parseInt(year)
                }
            },
            // Join to transactions to get actual spending
            {
                $lookup: {
                    from: 'transactions',
                    let:  { cat_id: '$category_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$category_id', '$$cat_id'] },
                                        { $eq: ['$transaction_type', 'expense'] },
                                        { $in:  ['$account_id', accountIds] },
                                        { $eq: [{ $month: '$transaction_date' }, parseInt(month)] },
                                        { $eq: [{ $year:  '$transaction_date' }, parseInt(year)]  }
                                    ]
                                }
                            }
                        },
                        { $group: { _id: null, total_spent: { $sum: '$amount' } } }
                    ],
                    as: 'spending'
                }
            },
            // Join to categories for names
            {
                $lookup: {
                    from:         'categories',
                    localField:   'category_id',
                    foreignField: '_id',
                    as:           'category'
                }
            },
            { $unwind: '$category' },
            {
                $project: {
                    category_name: '$category.category_name',
                    monthly_limit: 1,
                    month:         1,
                    year:          1,
                    total_spent:   { $ifNull: [{ $arrayElemAt: ['$spending.total_spent', 0] }, 0] },
                    remaining:     {
                        $subtract: [
                            '$monthly_limit',
                            { $ifNull: [{ $arrayElemAt: ['$spending.total_spent', 0] }, 0] }
                        ]
                    },
                    overspent: {
                        $gt: [
                            { $ifNull: [{ $arrayElemAt: ['$spending.total_spent', 0] }, 0] },
                            '$monthly_limit'
                        ]
                    }
                }
            },
            { $sort: { overspent: -1, total_spent: -1 } }
        ]);

        res.status(200).json(report);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate budget report.' });
    }
});

// GET unused categories (no transactions this month)
// Non-trivial query #4: $lookup with empty result detection
router.get('/reports/unused-categories', auth, async (req, res) => {
    try {
        const { month, year } = req.query;

        const userAccounts = await Account.find({ user_id: req.user.userId }).select('_id');
        const accountIds = userAccounts.map(a => a._id);

        const unused = await Category.aggregate([
            {
                $match: {
                    user_id:       new mongoose.Types.ObjectId(req.user.userId),
                    category_type: 'expense'
                }
            },
            {
                $lookup: {
                    from: 'transactions',
                    let:  { cat_id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$category_id', '$$cat_id'] },
                                        { $in:  ['$account_id', accountIds] },
                                        { $eq: [{ $month: '$transaction_date' }, parseInt(month)] },
                                        { $eq: [{ $year:  '$transaction_date' }, parseInt(year)]  }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'transactions'
                }
            },
            // Only keep categories with no transactions
            { $match: { transactions: { $size: 0 } } },
            { $project: { category_name: 1, category_type: 1 } }
        ]);

        res.status(200).json(unused);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch unused categories.' });
    }
});

// GET income vs expense summary
// Non-trivial query #5: grouped totals by transaction type
router.get('/reports/income-vs-expense', auth, async (req, res) => {
    try {
        const { month, year } = req.query;

        const userAccounts = await Account.find({ user_id: req.user.userId }).select('_id');
        const accountIds = userAccounts.map(a => a._id);

        const summary = await Transaction.aggregate([
            {
                $match: {
                    account_id: { $in: accountIds },
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
                    _id:   '$transaction_type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format into a clean object
        const result = { income: 0, expense: 0, net: 0 };
        summary.forEach(s => { result[s._id] = s.total; });
        result.net = result.income - result.expense;

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate income vs expense summary.' });
    }
});

// POST create budget
router.post('/', auth, async (req, res) => {
    try {
        const { category_id, monthly_limit, month, year } = req.body;

        // Prevent duplicate budget for same category/month/year
        const existing = await Budget.findOne({
            user_id: req.user.userId,
            category_id,
            month,
            year
        });
        if (existing) {
            return res.status(400).json({ error: 'Budget for this category and month already exists.' });
        }

        const budget = await Budget.create({
            user_id: req.user.userId,
            category_id,
            monthly_limit,
            month,
            year
        });

        res.status(201).json({ message: 'Budget created.', budget });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create budget.' });
    }
});

// PUT update budget
router.put('/:id', auth, async (req, res) => {
    try {
        const { monthly_limit } = req.body;

        const budget = await Budget.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.userId },
            { monthly_limit },
            { new: true, runValidators: true }
        );

        if (!budget) return res.status(404).json({ error: 'Budget not found.' });
        res.status(200).json({ message: 'Budget updated.', budget });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update budget.' });
    }
});

// DELETE budget
router.delete('/:id', auth, async (req, res) => {
    try {
        const budget = await Budget.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        if (!budget) return res.status(404).json({ error: 'Budget not found.' });
        res.status(200).json({ message: 'Budget deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete budget.' });
    }
});

module.exports = router;