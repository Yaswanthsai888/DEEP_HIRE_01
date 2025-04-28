const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const applicationController = require('../controllers/ApplicationController');

// Apply to a job (Candidate only)
router.post(
  '/',
  auth('candidate'),
  [body('jobId').isMongoId().withMessage('Invalid job ID')],
  applicationController.applyToJob
);

// Get applications for the logged-in candidate
router.get('/my', auth('candidate'), applicationController.getMyApplications);

// Get applicants for a job (Recruiter only)
router.get(
  '/job/:jobId',
  auth('recruiter'),
  [param('jobId').isMongoId().withMessage('Invalid job ID')],
  applicationController.getApplicantsForJob
);

// Get applications for a specific round (Recruiter only)
router.get(
  '/job/:jobId/round/:round',
  auth('recruiter'),
  [
    param('jobId').isMongoId().withMessage('Invalid job ID'),
    param('round').notEmpty().withMessage('Round is required')
  ],
  applicationController.getApplicationsByRound
);

// Update application status (Recruiter only)
router.put(
  '/:id/status', // Use application ID in the route
  auth('recruiter'),
  [
    param('id').isMongoId().withMessage('Invalid application ID'),
    body('status').notEmpty().withMessage('Status is required')
    // No need to validate enum here, controller handles it
  ],
  applicationController.updateApplicationStatus
);

module.exports = router;