const TestAttempt = require('../models/TestAttempt');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Application = require('../models/Application');
const User = require('../models/User');
const Job = require('../models/Job');
const asyncHandler = require('express-async-handler');

const shuffleArray = (arr) => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(a => a[1]);

// Candidate: Start a test (create attempt)
const startTest = asyncHandler(async (req, res) => {
  const { testId } = req.body;
  
  // Check if candidate has access to this test
  const application = await Application.findOne({
    candidate: req.user._id,
    currentRoundTest: testId
  });

  if (!application) {
    res.status(403);
    throw new Error('You do not have access to this test');
  }

  const test = await Test.findById(testId).populate('manualQuestions');
  if (!test) {
    res.status(404);
    throw new Error('Test not found');
  }

  // Prevent duplicate attempts
  const existing = await TestAttempt.findOne({ 
    test: testId, 
    candidate: req.user._id, 
    completedAt: { $exists: false } 
  });

  if (existing) {
    await existing.populate({ path: 'test', populate: { path: 'manualQuestions' } });
    return res.json(existing);
  }

  let selectedQuestions = [];
  if (test.selectionType === 'manual') {
    selectedQuestions = await Question.find({ _id: { $in: test.manualQuestions } });
  } else if (test.selectionType === 'random') {
    const { totalQuestions, easyPercent = 0, mediumPercent = 0, hardPercent = 0 } = test.difficultyDistribution || {};
    const easyCount = Math.round((easyPercent / 100) * totalQuestions);
    const mediumCount = Math.round((mediumPercent / 100) * totalQuestions);
    const hardCount = totalQuestions - easyCount - mediumCount;
    const easyQs = await Question.find({ difficulty: 'Easy' });
    const mediumQs = await Question.find({ difficulty: 'Medium' });
    const hardQs = await Question.find({ difficulty: 'Hard' });
    selectedQuestions = [
      ...shuffleArray(easyQs).slice(0, easyCount),
      ...shuffleArray(mediumQs).slice(0, mediumCount),
      ...shuffleArray(hardQs).slice(0, hardCount),
    ];
  }

  const questionsWithShuffledOptions = selectedQuestions.map(q => ({
    ...q.toObject(),
    options: q.options ? shuffleArray(q.options) : [],
  }));

  const attempt = new TestAttempt({
    test: testId,
    candidate: req.user._id,
    startedAt: new Date(),
    round: application.round,
    durationMinutes: test.durationMinutes,
    questionsSnapshot: questionsWithShuffledOptions,
  });

  await attempt.save();
  await attempt.populate({ path: 'test', populate: { path: 'manualQuestions' } });

  const attemptObj = attempt.toObject();
  attemptObj.questions = questionsWithShuffledOptions;

  // Update application status to 'in_progress'
  await Application.findByIdAndUpdate(application._id, {
    status: 'in_progress'
  });

  res.status(201).json(attemptObj);
});

// Candidate: Submit answers and finish test
const submitTest = asyncHandler(async (req, res) => {
  const { attemptId, answers } = req.body;
  const attempt = await TestAttempt.findById(attemptId).populate('test');
  if (!attempt) {
    res.status(404);
    throw new Error('Test attempt not found');
  }
  if (attempt.candidate.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (attempt.completedAt) {
    return res.status(400).json({ message: 'Test already submitted' });
  }
  // Evaluate answers
  let score = 0;
  const answerDocs = [];
  for (const ans of answers) {
    const question = await Question.findById(ans.question);
    if (!question) continue;
    let isCorrect = null;
    let pointsAwarded = 0;
    if (question.type === 'Multiple Choice') {
      const correct = question.options.find(opt => opt.isCorrect);
      isCorrect = correct && correct.text === ans.selectedOption;
      pointsAwarded = isCorrect ? (question.points || 1) : 0;
      if (isCorrect) score += pointsAwarded;
    } else if (question.type === 'Coding') {
      // Coding: expects ans.testCaseResults: [{passed: true/false, ...}]
      if (Array.isArray(ans.testCaseResults)) {
        if (question.scoringLogic === 'full_points_on_all_pass') {
          const allPassed = ans.testCaseResults.every(tc => tc.passed);
          isCorrect = allPassed;
          pointsAwarded = allPassed ? (question.points || 0) : 0;
          if (allPassed) score += pointsAwarded;
        } else if (question.scoringLogic === 'partial_by_test_case') {
          let tcPoints = 0;
          for (let i = 0; i < ans.testCaseResults.length; i++) {
            if (ans.testCaseResults[i].passed) {
              // Use test case points if defined, else 1
              tcPoints += (question.testCases && question.testCases[i] && question.testCases[i].points) || 1;
            }
          }
          pointsAwarded = tcPoints;
          score += tcPoints;
          isCorrect = tcPoints === (question.points || 0); // All points means all test cases passed
        }
      } else {
        isCorrect = null;
        pointsAwarded = 0;
      }
    } else {
      // Subjective: skip auto-grading
      isCorrect = null;
      pointsAwarded = 0;
    }
    answerDocs.push({
      question: question._id,
      selectedOption: ans.selectedOption,
      isCorrect,
      pointsAwarded,
      testCaseResults: ans.testCaseResults // Store for reference if coding
    });
  }
  attempt.answers = answerDocs;
  attempt.score = score;
  attempt.completedAt = new Date();
  await attempt.save();
  res.json(attempt);
});

// Candidate: Get my attempts
const getMyAttempts = asyncHandler(async (req, res) => {
  const attempts = await TestAttempt.find({ candidate: req.user._id })
    .populate({ path: 'test', populate: { path: 'manualQuestions' } });
  res.json(attempts);
});

// Candidate: Mark test attempt as being actively monitored
const startMonitoring = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const attempt = await TestAttempt.findById(attemptId);

  if (!attempt) {
    res.status(404);
    throw new Error('Test attempt not found');
  }

  // Ensure the logged-in user is the candidate who owns this attempt
  if (attempt.candidate.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to start monitoring for this attempt');
  }

  // Prevent re-starting monitoring if already started or completed
  if (attempt.monitoringStartedAt || attempt.completedAt) {
    console.log(`Monitoring already started or attempt completed for ${attemptId}`);
    // Return success even if already started, as the goal is achieved
    return res.status(200).json({ message: 'Monitoring already active or attempt completed.' });
  }

  // Update the attempt document
  attempt.monitoringStartedAt = new Date();
  // Optionally, set startTime if it wasn't set during the initial startTest
  if (!attempt.startTime) {
      attempt.startTime = new Date();
  }

  await attempt.save();

  console.log(`Monitoring started for attempt ${attemptId}`);
  res.status(200).json({ message: 'Monitoring started successfully.', monitoringStartedAt: attempt.monitoringStartedAt });
});

// Recruiter: Get analytics for a test
const getTestAnalytics = asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const test = await Test.findById(testId);
  if (!test) {
    res.status(404);
    throw new Error('Test not found');
  }
  if (test.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  const attempts = await TestAttempt.find({ test: testId, completedAt: { $exists: true } });
  const numAttempts = attempts.length;
  const scores = attempts.map(a => a.score || 0);
  const times = attempts.map(a => a.completedAt && a.startedAt ? ((new Date(a.completedAt) - new Date(a.startedAt)) / 1000) : null).filter(Boolean);
  const avgScore = numAttempts > 0 ? (scores.reduce((sum, s) => sum + s, 0) / numAttempts) : 0;
  const minScore = numAttempts > 0 ? Math.min(...scores) : 0;
  const maxScore = numAttempts > 0 ? Math.max(...scores) : 0;
  const avgTime = times.length > 0 ? (times.reduce((sum, t) => sum + t, 0) / times.length) : 0;
  // Top 5 performers
  const topPerformers = attempts
    .map(a => ({
      candidate: a.candidate,
      score: a.score,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      duration: a.completedAt && a.startedAt ? ((new Date(a.completedAt) - new Date(a.startedAt)) / 1000) : null,
      attemptId: a._id,
    }))
    .sort((a, b) => b.score - a.score || a.duration - b.duration)
    .slice(0, 5);
  res.json({
    numAttempts,
    avgScore,
    minScore,
    maxScore,
    avgTime,
    topPerformers,
  });
});

// Recruiter: Get job-specific analytics
const getJobAnalytics = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { round } = req.query;

  // Find job document
  const job = await Job.findById(jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  // Find all applications for this job, filtered by round if specified
  const applicationsQuery = { job: jobId };
  if (round) {
    applicationsQuery['roundHistory.round'] = parseInt(round);
  }
  // Populate candidate and currentRoundTest for fallback
  const applications = await Application.find(applicationsQuery)
    .populate('candidate')
    .populate('currentRoundTest');
  if (!applications.length) {
    return res.status(404).json({ message: 'No applications found for this job and round' });
  }

  // Determine test ID: prefer job.test, else use first application's currentRoundTest
  let testId = job.test;
  if (!testId) {
    testId = applications[0].currentRoundTest && applications[0].currentRoundTest._id;
  }
  if (!testId) {
    return res.status(404).json({ message: 'Assigned test not found for this job' });
  }
  // Load test document for title
  const testDoc = await Test.findById(testId);
  if (!testDoc) {
    return res.status(404).json({ message: 'Test not found' });
  }

  // Find all attempts for the determined test by these candidates
  const candidateIds = applications.map(app => app.candidate._id);
  const attempts = await TestAttempt.find({
    test: testId,
    candidate: { $in: candidateIds },
    completedAt: { $exists: true }
  }).populate('candidate');

  // Map to analytics format
  const analytics = attempts.map(attempt => {
    const application = applications.find(app => app.candidate._id.toString() === attempt.candidate._id.toString());
    return {
      candidate: {
        _id: attempt.candidate._id,
        name: attempt.candidate.name,
        email: attempt.candidate.email
      },
      applicationId: application?._id,
      applicationStatus: application?.status || 'pending',
      score: attempt.score,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      duration: attempt.completedAt && attempt.startedAt ? 
        ((new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 1000) : null,
      attemptId: attempt._id,
      round: application?.round || 1
    };
  });

  // Sort by score desc, then duration asc
  analytics.sort((a, b) => b.score - a.score || a.duration - b.duration);

  res.json({
    job: { _id: job._id, title: job.title },
    test: { _id: testDoc._id, title: testDoc.title },
    analytics
  });
});

// Recruiter: Release results for a test attempt or all attempts of a test
const releaseResults = asyncHandler(async (req, res) => {
  const { attemptId, testId } = req.body;
  console.log('Release results called with:', { attemptId, testId, userId: req.user._id });
  
  let filter = {};
  if (attemptId) {
    filter = { _id: attemptId };
  } else if (testId) {
    filter = { test: testId };
  } else {
    return res.status(400).json({ message: 'Provide attemptId or testId' });
  }

  console.log('Finding attempts with filter:', filter);
  const attempts = await TestAttempt.find(filter).populate('test');
  console.log(`Found ${attempts.length} attempts`);

  let unauthorized = false;
  let missingTestCount = 0;
  let authorizedAttempts = [];

  for (const attempt of attempts) {
    if (!attempt.test) {
      console.warn(`Attempt ${attempt._id} has no populated test reference`);
      missingTestCount++;
      continue;
    }

    if (attempt.test.createdBy.toString() !== req.user._id.toString()) {
      console.warn(`Unauthorized: User ${req.user._id} is not the creator of test ${attempt.test._id}`);
      unauthorized = true;
      break;
    }
    authorizedAttempts.push(attempt._id);
  }

  if (unauthorized) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (authorizedAttempts.length === 0) {
    return res.status(404).json({ 
      message: 'No valid attempts found to release results',
      details: missingTestCount > 0 ? `${missingTestCount} attempts skipped due to missing test reference` : 'No matching attempts found'
    });
  }

  const updateResult = await TestAttempt.updateMany(
    { _id: { $in: authorizedAttempts } },
    { $set: { resultsReleased: true } }
  );

  console.log('Update result:', updateResult);
  
  res.json({ 
    message: 'Results released',
    updatedCount: updateResult.modifiedCount,
    totalAttempts: attempts.length,
    skippedAttempts: missingTestCount
  });
});

module.exports = {
  startTest,
  submitTest,
  getMyAttempts,
  startMonitoring, // Export the new function
  getTestAnalytics,
  getJobAnalytics,
  releaseResults,
};
