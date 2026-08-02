const mongoose = require('mongoose');

const OvertimeSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  hours: {
    type: Number,
    default: 0
  },
  overtimeDays: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Approved'
  },
  approvedBy: {
    type: String,
    default: 'Supervisor'
  },
  remarks: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Overtime', OvertimeSchema);
