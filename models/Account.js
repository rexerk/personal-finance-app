const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  user_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  account_name: { type: String, required: true, trim: true },
  account_type: { type: String, enum: ['checking', 'savings', 'credit', 'cash'], required: true },
  balance:      { type: Number, required: true, default: 0 },
  created_at:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Account', accountSchema);
