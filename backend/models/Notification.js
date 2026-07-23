const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  },
  title: {
    type: String,
    required: [true, 'Please add notification title'],
    trim: true
  },
  message: {
    type: String,
    trim: true
  },
  description: {
    type: String,
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
      'restock_rejected',
      'assignment',
      'due',
      'overdue',
      'announcement',
      'approval',
      'attendance',
      'salary'
    ]
  },
  itemId: {
    type: String,
    default: null
  },
  taskId: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  time: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

NotificationSchema.pre('save', function(next) {
  if (this.title && !this.message && this.description) this.message = this.description;
  if (this.title && !this.description && this.message) this.description = this.message;
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);

