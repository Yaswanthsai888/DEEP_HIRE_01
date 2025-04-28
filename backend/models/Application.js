const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  resume: { type: String },
  status: { 
    type: String,
    default: 'pending',
    required: true
  },
  round: { 
    type: Number, 
    default: 0,
    required: true 
  },
  roundHistory: [{
    round: Number,
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    status: String,
    assignedAt: Date,
    completedAt: Date
  }],
  currentRoundTest: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Test'
  },
  appliedAt: { type: Date, default: Date.now }
});

// Add an index to improve query performance for job applications
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);