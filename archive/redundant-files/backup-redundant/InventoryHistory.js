const mongoose = require('mongoose');

const InventoryHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  item: {
    type: String,
    required: [true, 'Please specify the item name'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'Please specify the SKU code'],
    trim: true
  },
  type: {
    type: String,
    enum: ['in', 'out'],
    required: [true, 'Transaction type is required (in/out)']
  },
  qty: {
    type: Number,
    required: [true, 'Transaction quantity is required'],
    min: [1, 'Transaction quantity must be at least 1']
  },
  gst: {
    type: Number,
    required: true
  },
  op: {
    type: String,
    default: 'System',
    trim: true
  },
  loc: {
    type: String,
    trim: true
  },
  val: {
    type: Number,
    required: true,
    min: [0, 'Transaction value cannot be negative']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InventoryHistory', InventoryHistorySchema);
