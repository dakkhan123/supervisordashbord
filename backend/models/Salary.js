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
    required: [true, 'Month field is required (e.g. June 2026)']
  },
  baseSalary: {
    type: Number,
    default: 0
  },
  basicSalary: {
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
  bonus: {
    type: Number,
    default: 0
  },
  allowances: {
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
  overtime: {
    type: Number,
    default: 0
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
  if (!this.basicSalary && this.baseSalary) this.basicSalary = this.baseSalary;
  if (!this.baseSalary && this.basicSalary) this.baseSalary = this.basicSalary;
  if (!this.netSalary && this.amount) this.netSalary = this.amount;
  if (!this.amount && this.netSalary) this.amount = this.netSalary;
  if (!this.paymentStatus && this.status) this.paymentStatus = this.status;
  if (!this.status && this.paymentStatus) this.status = this.paymentStatus;
  if (!this.slipId) {
    this.slipId = 'PAY-' + Math.floor(100000 + Math.random() * 900000);
  }
  next();
});

module.exports = mongoose.model('Salary', SalarySchema);


