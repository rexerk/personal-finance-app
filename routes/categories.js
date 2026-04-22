const express = require('express');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();

// GET all categories for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const categories = await Category.find({ user_id: req.user.userId });
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

// GET single category by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const category = await Category.findOne({ _id: req.params.id, user_id: req.user.userId });
        if (!category) return res.status(404).json({ error: 'Category not found.' });
        res.status(200).json(category);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch category.' });
    }
});

// POST create new category
router.post('/', auth, async (req, res) => {
    try {
        const { category_name, category_type } = req.body;

        // Prevent duplicate category names per user
        const existing = await Category.findOne({
            user_id: req.user.userId,
            category_name: { $regex: new RegExp(`^${category_name}$`, 'i') }
        });
        if (existing) {
            return res.status(400).json({ error: 'Category with that name already exists.' });
        }

        const category = await Category.create({
            user_id: req.user.userId,
            category_name,
            category_type
        });

        res.status(201).json({ message: 'Category created.', category });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create category.' });
    }
});

// PUT update category
router.put('/:id', auth, async (req, res) => {
    try {
        const { category_name, category_type } = req.body;

        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.userId },
            { category_name, category_type },
            { new: true, runValidators: true }
        );

        if (!category) return res.status(404).json({ error: 'Category not found.' });
        res.status(200).json({ message: 'Category updated.', category });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update category.' });
    }
});

// DELETE category
router.delete('/:id', auth, async (req, res) => {
    try {
        // Prevent deleting a category that has transactions linked to it
        const Transaction = require('../models/Transaction');
        const inUse = await Transaction.findOne({ category_id: req.params.id });
        if (inUse) {
            return res.status(400).json({ error: 'Cannot delete a category that has transactions.' });
        }

        const category = await Category.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user.userId
        });
        if (!category) return res.status(404).json({ error: 'Category not found.' });
        res.status(200).json({ message: 'Category deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category.' });
    }
});

module.exports = router;