const mongoose = require('mongoose');

const EscalationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Escalation title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Open', 'Resolved'],
    default: 'Open'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Escalation', EscalationSchema);
