const mongoose = require('mongoose');

const RegistrationOTPSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, trim: true },
  role: { type: String, default: 'Supervisor' },
  department: { type: String, default: 'Operations' },
  branch: { type: String, default: 'Pune Head Office', trim: true },
  dateOfJoining: { type: Date, default: Date.now },
  otpHash: { type: String, required: true },
  lastSentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 600 } // 10 minutes TTL
});

module.exports = mongoose.model('RegistrationOTP', RegistrationOTPSchema);
