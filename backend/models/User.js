const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please specify a username'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Please specify a password']
  },
  role: {
    type: String,
    required: [true, 'Please specify a role'],
    enum: ['Worker', 'Supervisor', 'Owner'],
    default: 'Supervisor'
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
