const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add notification title'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Please add notification message'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please specify notification type'],
    enum: [
      'item_added',
      'item_updated',
      'item_deleted',
      'stock_increase',
      'stock_decrease',
      'low_stock',
      'critical_stock',
      'stock_replenished',
      'restock_created',
      'restock_approved',
      'restock_rejected'
    ]
  },
  itemId: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema);
