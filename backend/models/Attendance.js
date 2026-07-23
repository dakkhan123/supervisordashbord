const mongoose = require('mongoose');

const breakLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Lunch', 'Tea Break', 'Custom Break'],
    required: true,
  },
  startTime: { type: Date, required: true },
  endTime: Date,
  durationMinutes: Number,
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const authLogMetadataSchema = new mongoose.Schema({
  time: Date,
  location: String,
  geofenceStatus: {
    type: String,
    enum: ['Within Range', 'Out of Range'],
  },
  deviceId: String,
  ipAddress: String,
  authMethod: {
    type: String,
    enum: ['Fingerprint Scan', 'Face Unlock', 'Touch ID', 'Face ID'],
  },
});

const AttendanceSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: [true, 'Worker ID is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Half Day', 'Leave', 'Holiday', 'Weekend', 'Overtime'],
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
  checkIn: Date,
  checkOut: Date,
  workingHours: {
    type: Number,
    default: 0
  },
  totalWorkedHours: {
    type: Number,
    default: 0
  },
  breakDurationMinutes: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  lateArrivalMinutes: { type: Number, default: 0 },
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
  },
  checkInDetails: authLogMetadataSchema,
  checkOutDetails: authLogMetadataSchema,
  breaks: [breakLogSchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);

