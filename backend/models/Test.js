const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required.'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  durationMinutes: { // Duration allowed for the test
    type: Number,
    required: [true, 'Test duration is required.'],
    min: 1,
  },
  // Option 1: For random selection based on difficulty
  difficultyDistribution: {
    totalQuestions: {
      type: Number,
      min: 1,
    },
    easyPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    mediumPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    hardPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  // Option 2: For manual selection
  manualQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
  selectionType: {
    type: String,
    required: true,
    enum: ['random', 'manual'], // Determines which selection method is used
  },
  // Type of test including new interview round
  testType: {
    type: String,
    required: true,
    enum: ['aptitude', 'coding', 'both', 'interview'],
    default: 'aptitude'
  },
  interviewConfig: {
    duration: { type: Number, default: 15 }, // Duration in minutes
    minQuestions: { type: Number, default: 5 },
    maxQuestions: { type: Number, default: 6 },
    skillFocus: [String] // Skills to focus on during interview
  },
  createdBy: { // Link to the recruiter who created the test
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure only one selection method is primarily defined
testSchema.pre('save', function(next) {
  if (this.selectionType === 'random') {
    if (!this.difficultyDistribution || this.difficultyDistribution.totalQuestions === undefined) {
      return next(new Error('Random tests require difficulty distribution and total questions.'));
    }
    const { easyPercent = 0, mediumPercent = 0, hardPercent = 0 } = this.difficultyDistribution;
    const totalPercent = easyPercent + mediumPercent + hardPercent;
    if (Math.abs(totalPercent - 100) > 0.1) {
      return next(new Error('Difficulty percentages must add up to 100 for random selection tests.'));
    }
    this.manualQuestions = undefined; // Clear manual questions if random
  } else if (this.selectionType === 'manual') {
    if (!this.manualQuestions || this.manualQuestions.length === 0) {
      return next(new Error('Manual tests require at least one selected question.'));
    }
    this.difficultyDistribution = undefined; // Clear distribution if manual
  } else {
    return next(new Error('Invalid selection type.'));
  }
  next();
});

module.exports = mongoose.model('Test', testSchema);
