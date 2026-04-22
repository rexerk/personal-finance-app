const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tag_name: { type: String, required: true, trim: true }
});

module.exports = mongoose.model('Tag', tagSchema);
