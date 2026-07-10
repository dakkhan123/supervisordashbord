const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please specify worker name'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Please specify role (e.g. Worker, Supervisor)'],
    enum: ['Worker', 'Supervisor', 'Owner'],
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Worker', WorkerSchema);
