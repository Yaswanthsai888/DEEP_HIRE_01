const Question = require('../models/Question');
const asyncHandler = require('express-async-handler');

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private (Recruiter)
const createQuestion = asyncHandler(async (req, res) => {
  const {
    type, content, options, difficulty, category, points,
    testCases, allowedLanguages, constraints, score, examples, templateCode, explanation
  } = req.body;
  if (!content || !type || !difficulty) {
    res.status(400);
    throw new Error('Please provide type, content, and difficulty');
  }
  // For MCQ, validate options
  if (type === 'Multiple Choice') {
    if (!Array.isArray(options) || options.length < 2 || !options.some(opt => opt.isCorrect)) {
      res.status(400);
      throw new Error('Multiple Choice questions must have at least 2 options and one correct answer.');
    }
  }
  // For Coding, validate testCases and allowedLanguages
  if (type === 'Coding') {
    if (!Array.isArray(testCases) || testCases.length < 1) {
      res.status(400);
      throw new Error('Coding questions must have at least one test case.');
    }
    if (!Array.isArray(allowedLanguages) || allowedLanguages.length < 1) {
      res.status(400);
      throw new Error('Coding questions must have at least one allowed language.');
    }
  }
  const question = new Question({
    type,
    content,
    options: type === 'Multiple Choice' ? options : [],
    testCases: type === 'Coding' ? testCases : undefined,
    allowedLanguages: type === 'Coding' ? allowedLanguages : undefined,
    difficulty,
    category,
    points,
    constraints: type === 'Coding' ? constraints : undefined,
    score: type === 'Coding' ? score : undefined,
    examples: type === 'Coding' ? examples : undefined,
    templateCode: type === 'Coding' ? templateCode : undefined,
    explanation: type === 'Coding' ? explanation : undefined,
    createdBy: req.user._id || req.user.userId,
  });
  const createdQuestion = await question.save();
  res.status(201).json(createdQuestion);
});

// @desc    Get all questions (filterable by creator)
// @route   GET /api/questions
// @access  Private (Recruiter)
const getAllQuestions = asyncHandler(async (req, res) => {
  // Show all questions, not just those created by the current user
  const questions = await Question.find();
  res.json(questions);
});

// @desc    Get a single question by ID
// @route   GET /api/questions/:id
// @access  Private (Recruiter)
const getQuestionById = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (question) {
    res.json(question);
  } else {
    res.status(404);
    throw new Error('Question not found');
  }
});

// @desc    Update a question
// @route   PUT /api/questions/:id
// @access  Private (Recruiter - Owner)
const updateQuestion = asyncHandler(async (req, res) => {
  const {
    type, content, options, difficulty, category, points,
    testCases, allowedLanguages, constraints, score, examples, templateCode, explanation
  } = req.body;
  const question = await Question.findById(req.params.id);
  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }
  if (question.createdBy.toString() !== (req.user._id || req.user.userId).toString()) {
    res.status(403);
    throw new Error('User not authorized to update this question');
  }
  question.type = type || question.type;
  question.content = content || question.content;
  question.options = type === 'Multiple Choice' ? options : [];
  question.testCases = type === 'Coding' ? testCases : undefined;
  question.allowedLanguages = type === 'Coding' ? allowedLanguages : undefined;
  question.difficulty = difficulty || question.difficulty;
  question.category = category || question.category;
  question.points = points || question.points;
  question.constraints = type === 'Coding' ? constraints : undefined;
  question.score = type === 'Coding' ? score : undefined;
  question.examples = type === 'Coding' ? examples : undefined;
  question.templateCode = type === 'Coding' ? templateCode : undefined;
  question.explanation = type === 'Coding' ? explanation : undefined;
  const updatedQuestion = await question.save();
  res.json(updatedQuestion);
});

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private (Recruiter - Owner)
const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }
  if (question.createdBy.toString() !== (req.user._id || req.user.userId).toString()) {
    res.status(403);
    throw new Error('User not authorized to delete this question');
  }
  await question.deleteOne();
  res.json({ message: 'Question removed' });
});

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};
