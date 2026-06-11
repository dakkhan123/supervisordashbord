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
  amount: {
    type: Number,
    required: [true, 'Salary amount is required']
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Salary', SalarySchema);
