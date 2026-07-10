const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },   //supervisor 

  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Blocked'], default: 'Pending' },

  dueDate: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },

  progressPercent: { type: Number, min: 0, max: 100, default: 0 },

  history: [{
    action: String,          
    fromStatus: String,
    toStatus: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    timestamp: { type: Date, default: Date.now }
  }],

  attachments: [String]    
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
