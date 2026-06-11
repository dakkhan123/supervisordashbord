const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an item name'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'Please add a SKU code'],
    unique: true,
    trim: true
  },
  cat: {
    type: String,
    required: [true, 'Please select a category'],
    trim: true
  },
  qty: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Quantity cannot go below zero'],
    default: 0
  },
  threshold: {
    type: Number,
    required: [true, 'Please add a minimum safety threshold'],
    min: [0, 'Threshold cannot be negative'],
    default: 0
  },
  val: {
    type: Number,
    required: [true, 'Please specify unit value in INR'],
    min: [0, 'Unit price cannot be negative'],
    default: 0
  },
  loc: {
    type: String,
    required: [true, 'Please add storage location'],
    trim: true
  },
  gst: {
    type: Number,
    required: [true, 'Please select GST rate'],
    default: 18
  },
  emoji: {
    type: String,
    default: '📦'
  },
  supplier: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating the status of an item dynamically
InventorySchema.virtual('status').get(function() {
  if (this.qty === 0) return 'critical';
  const pct = this.qty / this.threshold;
  if (pct < 0.5) return 'critical';
  if (pct < 1.0) return (pct > 0.9 ? 'near' : 'low');
  return 'ok';
});

module.exports = mongoose.model('Inventory', InventorySchema);
