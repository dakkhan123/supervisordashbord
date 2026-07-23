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
    lowercase: true
  },
  employeeId: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Worker', WorkerSchema);

