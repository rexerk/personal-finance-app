const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  account_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  category_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tag_ids:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  amount:           { type: Number, required: true },
  transaction_type: { type: String, enum: ['income', 'expense'], required: true },
  description:      { type: String, trim: true },
  transaction_date: { type: Date, required: true },
  created_at:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
