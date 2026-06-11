const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  item: {
    type: String,
    required: [true, 'Please add item name'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'Please add SKU code'],
    trim: true
  },
  type: {
    type: String,
    enum: ['critical', 'low'],
    required: [true, 'Please specify alert severity type']
  },
  qty: {
    type: Number,
    required: [true, 'Please specify quantity level']
  },
  threshold: {
    type: Number,
    required: [true, 'Please specify threshold limit']
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  muted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', AlertSchema);
