const mongoose = require('mongoose');

const RestockRequestSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, 'Please add SKU code'],
    trim: true
  },
  itemName: {
    type: String,
    required: [true, 'Please add item name'],
    trim: true
  },
  qty: {
    type: Number,
    required: [true, 'Please specify quantity to reorder'],
    min: [1, 'Reorder quantity must be at least 1']
  },
  supplier: {
    type: String,
    trim: true
  },
  op: {
    type: String,
    default: 'Rajesh Kumar'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RestockRequest', RestockRequestSchema);
