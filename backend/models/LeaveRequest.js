const mongoose = require('mongoose');

const LeaveRequestSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: [true, 'Worker ID is required']
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  },
  leaveType: {
    type: String,
    enum: ['Full Day Leave', 'Half Day Leave'],
    required: [true, 'Leave Type is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason for leave is required'],
    trim: true
  },
  fromDate: {
    type: Date,
    required: [true, 'From Date is required']
  },
  toDate: {
    type: Date,
    required: [true, 'To Date is required']
  },
  halfDaySession: {
    type: String,
    enum: ['First Half', 'Second Half', 'N/A'],
    default: 'N/A'
  },
  attachment: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  supervisorComment: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('LeaveRequest', LeaveRequestSchema);
