const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please specify a username'],
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: [true, 'Please specify an email address'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please specify a valid email address']
  },
  employeeId: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please specify a password']
  },
  role: {
    type: String,
    required: [true, 'Please specify a role'],
    enum: ['Worker', 'Supervisor', 'Owner', 'Employee', 'Manager', 'Admin'],
    default: 'Supervisor'
  },
  department: {
    type: String,
    default: 'General'
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be exactly 10 numeric digits'
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  isEmailVerified: {
    type: Boolean,
    default: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  },
  resetPasswordOTP: String,
  resetPasswordOTPExpire: Date,
  settings: {
    darkMode: { type: Boolean, default: false },
    fontSize: { type: String, enum: ['sm', 'base', 'lg', 'xl'], default: 'base' },
    language: { type: String, default: 'en' },
    taskAlerts: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
