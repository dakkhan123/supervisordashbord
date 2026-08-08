const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: [true, 'Worker ID is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  month: {
    type: String,
    required: [true, 'Month field is required (e.g. August 2026)']
  },
  monthlySalary: {
    type: Number,
    default: 0
  },
  baseSalary: {
    type: Number,
    default: 0
  },
  basicSalary: {
    type: Number,
    default: 0
  },
  totalDays: {
    type: Number,
    default: 30
  },
  totalDaysInMonth: {
    type: Number,
    default: 30
  },
  perDaySalary: {
    type: Number,
    default: 0
  },
  presentDays: {
    type: Number,
    default: 0
  },
  absentDays: {
    type: Number,
    default: 0
  },
  totalLeaveDays: {
    type: Number,
    default: 0
  },
  exemptedLeaveDays: {
    type: Number,
    default: 0
  },
  freeLeaveDays: {
    type: Number,
    default: 0
  },
  deductibleLeaveDays: {
    type: Number,
    default: 0
  },
  leaveDeduction: {
    type: Number,
    default: 0
  },
  halfDays: {
    type: Number,
    default: 0
  },
  halfDayDeduction: {
    type: Number,
    default: 0
  },
  excusedAbsentDays: {
    type: Number,
    default: 0
  },
  chargeableAbsentDays: {
    type: Number,
    default: 0
  },
  absentDeduction: {
    type: Number,
    default: 0
  },
  lateCount: {
    type: Number,
    default: 0
  },
  excusedLateCount: {
    type: Number,
    default: 0
  },
  chargeableLateCount: {
    type: Number,
    default: 0
  },
  lateDeduction: {
    type: Number,
    default: 0
  },
  overtimeDays: {
    type: Number,
    default: 0
  },
  overtimePay: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  finalSalary: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Processing', 'On Hold'],
    default: 'Pending'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Processing', 'On Hold'],
    default: 'Pending'
  },
  paymentDate: Date,
  slipId: {
    type: String
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

SalarySchema.pre('save', function(next) {
  if (!this.monthlySalary && this.baseSalary) this.monthlySalary = this.baseSalary;
  if (!this.baseSalary && this.monthlySalary) this.baseSalary = this.monthlySalary;
  if (!this.basicSalary && this.monthlySalary) this.basicSalary = this.monthlySalary;
  if (!this.totalDays && this.totalDaysInMonth) this.totalDays = this.totalDaysInMonth;
  if (!this.totalDaysInMonth && this.totalDays) this.totalDaysInMonth = this.totalDays;
  if (!this.amount && this.finalSalary) this.amount = this.finalSalary;
  if (!this.finalSalary && this.amount) this.finalSalary = this.amount;
  if (!this.netSalary && this.finalSalary) this.netSalary = this.finalSalary;
  if (!this.paymentStatus && this.status) this.paymentStatus = this.status;
  if (!this.status && this.paymentStatus) this.status = this.paymentStatus;
  if (!this.slipId) {
    this.slipId = 'PAY-' + Math.floor(100000 + Math.random() * 900000);
  }
  next();
});

module.exports = mongoose.model('Salary', SalarySchema);
