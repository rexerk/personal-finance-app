const express = require('express');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();

// GET all accounts for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const accounts = await Account.find({ user_id: req.user.userId });
        res.status(200).json(accounts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch accounts.' });
    }
});

// GET single account by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const account = await Account.findOne({ _id: req.params.id, user_id: req.user.userId });
        if (!account) return res.status(404).json({ error: 'Account not found.' });
        res.status(200).json(account);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch account.' });
    }
});

// POST create new account
router.post('/', auth, async (req, res) => {
    try {
        const { account_name, account_type, balance } = req.body;

        const account = await Account.create({
            user_id: req.user.userId,
            account_name,
            account_type,
            balance: balance ?? 0
        });

        res.status(201).json({ message: 'Account created.', account });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create account.' });
    }
});

// PUT update account
router.put('/:id', auth, async (req, res) => {
    try {
        const { account_name, account_type } = req.body;

        const account = await Account.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.userId },
            { account_name, account_type },
            { new: true, runValidators: true }
        );

        if (!account) return res.status(404).json({ error: 'Account not found.' });
        res.status(200).json({ message: 'Account updated.', account });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update account.' });
    }
});

// DELETE account
router.delete('/:id', auth, async (req, res) => {
    try {
        const account = await Account.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
        if (!account) return res.status(404).json({ error: 'Account not found.' });
        res.status(200).json({ message: 'Account deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete account.' });
    }
});

module.exports = router;