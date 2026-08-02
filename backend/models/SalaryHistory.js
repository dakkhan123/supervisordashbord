const mongoose = require('mongoose');

const SalaryHistorySchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  month: {
    type: String,
    required: true
  },
  monthlySalary: Number,
  perDaySalary: Number,
  totalDays: Number,
  presentDays: Number,
  absentDays: Number,
  excusedAbsentDays: Number,
  chargeableAbsentDays: Number,
  absentDeduction: Number,
  lateCount: Number,
  excusedLateCount: Number,
  chargeableLateCount: Number,
  lateDeduction: Number,
  overtimeDays: Number,
  overtimePay: Number,
  finalSalary: Number,
  action: {
    type: String,
    default: 'Updated'
  },
  updatedBy: String
}, {
  timestamps: true
});

module.exports = mongoose.model('SalaryHistory', SalaryHistorySchema);
