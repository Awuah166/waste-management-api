const mongoose = require('mongoose');

const wasteRequestSchema = new mongoose.Schema({
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wasteType: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  preferredCollectionDate: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'wasteRequest' });

module.exports = mongoose.model('WasteRequest', wasteRequestSchema);
