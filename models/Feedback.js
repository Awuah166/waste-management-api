const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wasteRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteRequest',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number.',
    },
  },
  comment: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'feedback' });

module.exports = mongoose.model('Feedback', feedbackSchema);
