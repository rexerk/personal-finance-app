const express = require('express');
const Tag = require('../models/Tag');
const auth = require('../middleware/auth');

const router = express.Router();

// GET all tags for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const tags = await Tag.find({ user_id: req.user.userId });
        res.status(200).json(tags);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tags.' });
    }
});

// GET single tag by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const tag = await Tag.findOne({ _id: req.params.id, user_id: req.user.userId });
        if (!tag) return res.status(404).json({ error: 'Tag not found.' });
        res.status(200).json(tag);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tag.' });
    }
});

// POST create new tag
router.post('/', auth, async (req, res) => {
    try {
        const { tag_name } = req.body;

        // Prevent duplicate tag names per user
        const existing = await Tag.findOne({
            user_id: req.user.userId,
            tag_name: { $regex: new RegExp(`^${tag_name}$`, 'i') }
        });
        if (existing) {
            return res.status(400).json({ error: 'Tag with that name already exists.' });
        }

        const tag = await Tag.create({
            user_id: req.user.userId,
            tag_name
        });

        res.status(201).json({ message: 'Tag created.', tag });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create tag.' });
    }
});

// PUT update tag
router.put('/:id', auth, async (req, res) => {
    try {
        const { tag_name } = req.body;

        const tag = await Tag.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.userId },
            { tag_name },
            { new: true, runValidators: true }
        );

        if (!tag) return res.status(404).json({ error: 'Tag not found.' });
        res.status(200).json({ message: 'Tag updated.', tag });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update tag.' });
    }
});

// DELETE tag
router.delete('/:id', auth, async (req, res) => {
    try {
        // Remove this tag from any transactions that reference it
        const Transaction = require('../models/Transaction');
        await Transaction.updateMany(
            { tag_ids: req.params.id },
            { $pull: { tag_ids: req.params.id } }
        );

        const tag = await Tag.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user.userId
        });
        if (!tag) return res.status(404).json({ error: 'Tag not found.' });
        res.status(200).json({ message: 'Tag deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete tag.' });
    }
});

module.exports = router;