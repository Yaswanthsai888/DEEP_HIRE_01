const express = require('express');
const {
  startTest,
  submitTest,
  getMyAttempts,
  getTestAnalytics,
  getJobAnalytics,
  releaseResults,
  startMonitoring,
  startInterviewAttempt, // Import the new controller function
  submitInterviewResponse, // Import the new controller function
  completeInterview // Import the new controller function
} = require('../controllers/TestAttemptController');
const requireAuthAndRole = require('../middleware/authMiddleware');
const { getAssignedTestsForCandidate, getTestById } = require('../controllers/TestController');

const router = express.Router();

// Candidate routes
router.post('/start', requireAuthAndRole('candidate'), startTest);
router.post('/submit', requireAuthAndRole('candidate'), submitTest);
router.get('/my', requireAuthAndRole('candidate'), getMyAttempts);
// Add the new route for starting monitoring
router.post('/:attemptId/start-monitoring', requireAuthAndRole('candidate'), startMonitoring);
router.post('/release-results', requireAuthAndRole('recruiter'), releaseResults);
router.get('/assigned', requireAuthAndRole('candidate'), getAssignedTestsForCandidate);
router.get('/test/:id', requireAuthAndRole('candidate'), getTestById);

// Interview specific routes
router.post('/interview/start', 
  requireAuthAndRole('candidate'), 
  startInterviewAttempt
);

router.post('/interview/:attemptId/response', 
  requireAuthAndRole('candidate'), 
  submitInterviewResponse
);

router.post('/interview/:attemptId/complete', 
  requireAuthAndRole('candidate'), 
  completeInterview
);

// Recruiter analytics
router.get('/analytics/:testId', requireAuthAndRole('recruiter'), getTestAnalytics);
router.get('/job-analytics/:jobId', requireAuthAndRole('recruiter'), getJobAnalytics);

module.exports = router;
