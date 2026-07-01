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
  },
  checkInTime: {
    type: String,
    default: '-'
  },
  checkOutTime: {
    type: String,
    default: '-'
  },
  workingHours: {
    type: Number,
    default: 0
  },
  shift: {
    type: String,
    default: 'General'
  },
  supervisorName: {
    type: String,
    default: 'Supervisor'
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
