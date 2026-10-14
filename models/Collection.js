const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  wasteRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteRequest',
    required: true,
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  scheduledDate: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  completedAt: { type: Date },
  notes: { type: String, trim: true },
}, { collection: 'collections' });

module.exports = mongoose.model('Collection', collectionSchema);
