const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please specify worker name'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please specify a valid email address']
  },
  employeeId: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be exactly 10 numeric digits'
    }
  },
  department: {
    type: String,
    default: 'Operations'
  },
  designation: {
    type: String,
    default: 'Worker'
  },
  role: {
    type: String,
    required: [true, 'Please specify role (e.g. Worker, Supervisor)'],
    enum: ['Worker', 'Supervisor', 'Owner', 'Employee', 'Manager', 'Admin'],
    default: 'Worker'
  },
  salary: {
    type: Number,
    required: [true, 'Please specify base salary']
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  assignedSite: {
    type: String,
    default: 'Pune Head Office'
  },
  branch: {
    type: String,
    default: 'Pune Head Office',
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  photo: {
    type: String
  },
  shiftTiming: {
    type: String,
    default: '9:00 AM - 6:00 PM'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Worker', WorkerSchema);
