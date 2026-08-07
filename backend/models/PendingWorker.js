const mongoose = require('mongoose');

const PendingWorkerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  branch: {
    type: String,
    default: 'Pune Head Office',
    trim: true
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  photo: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  salary: {
    type: Number,
    default: 0
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String
  },
  otpExpires: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('PendingWorker', PendingWorkerSchema);
