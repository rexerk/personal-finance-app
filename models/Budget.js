const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  monthly_limit: { type: Number, required: true },
  month:         { type: Number, required: true, min: 1, max: 12 },
  year:          { type: Number, required: true }
});

module.exports = mongoose.model('Budget', budgetSchema);
