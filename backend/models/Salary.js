const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: [true, 'Worker ID is required']
  },
  month: {
    type: String,
    required: [true, 'Month field is required (e.g. June 2026)']
  },
  baseSalary: {
    type: Number,
    default: 0
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  tasksIncentive: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  overtimeRate: {
    type: Number,
    default: 150
  },
  deductions: {
    type: Number,
    default: 0
  },
  advances: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    required: [true, 'Salary amount is required']
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Salary', SalarySchema);

