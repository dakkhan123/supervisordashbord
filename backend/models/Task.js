const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  isMandatory: { type: Boolean, default: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const taskCompletionNotesSchema = new mongoose.Schema({
  completionDate: Date,
  completionTime: String,
  summary: String,
  workPerformed: String,
  completedQuantity: Number,
  issuesFaced: String,
  qualityRemarks: String,
  suggestions: String,
  additionalNotes: String,
});

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  name: { type: String, trim: true }, // Alias for title compatibility
  description: { type: String, trim: true },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },   // supervisor 

  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Urgent', 'Critical'], 
    default: 'Medium' 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Started', 'In Progress', 'Submitted for Verification', 'Completed', 'Blocked', 'Overdue'], 
    default: 'Pending' 
  },

  taskType: { type: String, default: 'General' },
  estimatedDuration: { type: String },

  dueDate: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },

  progressPercent: { type: Number, min: 0, max: 100, default: 0 },
  progress: { type: Number, min: 0, max: 100, default: 0 }, // Alias for progressPercent

  completedQuantity: { type: Number, default: 0 },
  remainingQuantity: { type: Number, default: 0 },
  remarks: { type: String },

  checklist: [checklistItemSchema],
  completionNotes: taskCompletionNotesSchema,

  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  verifiedAt: Date,
  verificationRemarks: String,

  history: [{
    action: String,          
    fromStatus: String,
    toStatus: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    timestamp: { type: Date, default: Date.now }
  }],

  attachments: [String]    
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Pre-save hook to ensure title and name remain synced
TaskSchema.pre('save', function(next) {
  if (this.title && !this.name) this.name = this.title;
  if (this.name && !this.title) this.title = this.name;
  if (this.progressPercent !== undefined && this.progress === 0) this.progress = this.progressPercent;
  if (this.progress !== undefined && this.progressPercent === 0) this.progressPercent = this.progress;
  next();
});

module.exports = mongoose.model('Task', TaskSchema);

