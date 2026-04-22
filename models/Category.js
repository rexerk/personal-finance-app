const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  user_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_name: { type: String, required: true, trim: true },
  category_type: { type: String, enum: ['income', 'expense'], required: true }
});

module.exports = mongoose.model('Category', categorySchema);
