const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: [true, 'Worker ID is required']
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Leave'],
    default: 'Present'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
