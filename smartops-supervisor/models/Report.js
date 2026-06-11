const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Inventory', 'Attendance', 'Salary', 'General'],
    default: 'General'
  },
  generatedBy: {
    type: String,
    default: 'System'
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', ReportSchema);
