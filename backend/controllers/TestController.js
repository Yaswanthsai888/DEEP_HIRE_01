const Test = require('../models/Test');
const Question = require('../models/Question');
const Application = require('../models/Application');
const Job = require('../models/Job');
const asyncHandler = require('express-async-handler');

// @desc    Create a new test (random or manual selection)
// @route   POST /api/tests
// @access  Private (Recruiter)
const createTest = asyncHandler(async (req, res) => {
  const { title, description, durationMinutes, selectionType, difficultyDistribution, manualQuestions, testType } = req.body;

  if (!title || !durationMinutes || !selectionType) {
    res.status(400);
    throw new Error('Title, duration, and selectionType are required');
  }

  let testData = {
    title,
    description,
    durationMinutes,
    selectionType,
    testType,
    createdBy: req.user._id,
  };

  if (selectionType === 'random') {
    if (!difficultyDistribution || !difficultyDistribution.totalQuestions) {
      res.status(400);
      throw new Error('Random selection requires difficultyDistribution and totalQuestions');
    }
    testData.difficultyDistribution = difficultyDistribution;
  } else if (selectionType === 'manual') {
    if (!manualQuestions || !Array.isArray(manualQuestions) || manualQuestions.length === 0) {
      res.status(400);
      throw new Error('Manual selection requires an array of question IDs');
    }
    // Allow any question to be used, regardless of who created it
    const foundQuestions = await Question.find({ _id: { $in: manualQuestions } });
    if (foundQuestions.length !== manualQuestions.length) {
      res.status(400);
      throw new Error('Some selected questions do not exist');
    }
    testData.manualQuestions = manualQuestions;
  } else {
    res.status(400);
    throw new Error('Invalid selectionType');
  }

  const test = new Test(testData);
  const createdTest = await test.save();
  res.status(201).json(createdTest);
});

// @desc    Get all tests created by the recruiter
// @route   GET /api/tests
// @access  Private (Recruiter)
const getAllTests = asyncHandler(async (req, res) => {
  const tests = await Test.find({ createdBy: req.user._id })
    .populate('manualQuestions');
  res.json(tests);
});

// @desc    Get a single test by ID
// @route   GET /api/tests/:id
// @access  Private (Recruiter)
const getTestById = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id).populate('manualQuestions');
  if (!test) {
    res.status(404);
    throw new Error('Test not found');
  }
  if (test.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this test');
  }
  res.json(test);
});

// @desc    Update a test
// @route   PUT /api/tests/:id
// @access  Private (Recruiter)
const updateTest = asyncHandler(async (req, res) => {
  const { title, description, durationMinutes, selectionType, difficultyDistribution, manualQuestions, testType } = req.body;
  const test = await Test.findById(req.params.id);
  if (!test) {
    res.status(404);
    throw new Error('Test not found');
  }
  if (test.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this test');
  }
  test.title = title || test.title;
  test.description = description || test.description;
  test.durationMinutes = durationMinutes || test.durationMinutes;
  test.selectionType = selectionType || test.selectionType;
  test.testType = testType || test.testType;
  if (selectionType === 'random') {
    test.difficultyDistribution = difficultyDistribution || test.difficultyDistribution;
    test.manualQuestions = undefined;
  } else if (selectionType === 'manual') {
    if (manualQuestions && Array.isArray(manualQuestions) && manualQuestions.length > 0) {
      // Allow any question to be used, regardless of who created it
      const foundQuestions = await Question.find({ _id: { $in: manualQuestions } });
      if (foundQuestions.length !== manualQuestions.length) {
        res.status(400);
        throw new Error('Some selected questions do not exist');
      }
      test.manualQuestions = manualQuestions;
      test.difficultyDistribution = undefined;
    }
  }
  const updatedTest = await test.save();
  res.json(updatedTest);
});

// @desc    Delete a test
// @route   DELETE /api/tests/:id
// @access  Private (Recruiter)
const deleteTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) {
    res.status(404);
    throw new Error('Test not found');
  }
  if (test.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this test');
  }
  await test.deleteOne();
  res.json({ message: 'Test removed' });
});

// @desc    Get tests assigned to the candidate via job applications
// @route   GET /api/tests/assigned
// @access  Private (Candidate)
const getAssignedTestsForCandidate = asyncHandler(async (req, res) => {
  // Find all applications by this candidate
  const applications = await Application.find({ candidate: req.user._id || req.user.userId });
  const jobIds = applications.map(app => app.job);
  // Find jobs with assigned tests
  const jobsWithTests = await Job.find({ _id: { $in: jobIds }, test: { $exists: true, $ne: null } });
  const testIds = jobsWithTests.map(job => job.test);
  // Get unique tests and populate questions
  const tests = await Test.find({ _id: { $in: testIds } }).populate('manualQuestions');
  res.json(tests);
});

module.exports = {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
  getAssignedTestsForCandidate,
};
