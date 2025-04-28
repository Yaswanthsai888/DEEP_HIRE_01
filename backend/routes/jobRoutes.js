const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const jobController = require('../controllers/JobController');

// Create Job (Recruiter only)
router.post(
  '/',
  auth('recruiter'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('salary').optional().isNumeric().withMessage('Salary must be a number')
  ],
  jobController.createJob
);

// Get jobs posted by recruiter
router.get('/my', auth('recruiter'), jobController.getMyJobs);

// Get all jobs (public)
router.get('/', jobController.getAllJobs);

// Get job by ID (public)
router.get('/:id',
  [param('id').isMongoId().withMessage('Invalid job ID')],
  jobController.getJobById
);

// Edit Job (Recruiter only)
router.put(
  '/:id',
  auth('recruiter'),
  [
    param('id').isMongoId().withMessage('Invalid job ID'),
    body('title').optional().notEmpty(),
    body('description').optional().notEmpty(),
    body('company').optional().notEmpty(),
    body('location').optional().notEmpty(),
    body('salary').optional().isNumeric()
  ],
  jobController.editJob
);

// Delete Job (Recruiter only)
router.delete(
  '/:id',
  auth('recruiter'),
  [param('id').isMongoId().withMessage('Invalid job ID')],
  jobController.deleteJob
);

module.exports = router;