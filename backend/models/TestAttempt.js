const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedOption: { type: mongoose.Schema.Types.Mixed }, // For MCQ: option index or id; for subjective: text
  isCorrect: { type: Boolean }, // For MCQ, can be null for subjective
  pointsAwarded: { type: Number, default: 0 },
});

const testAttemptSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [answerSchema],
  score: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  durationMinutes: { type: Number },
  resultsReleased: { type: Boolean, default: false },
});

module.exports = mongoose.model('TestAttempt', testAttemptSchema);