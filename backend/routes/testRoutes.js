const express = require('express');
const {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
  getAssignedTestsForCandidate,
} = require('../controllers/TestController');
const requireAuthAndRole = require('../middleware/authMiddleware');

const router = express.Router();

// Candidate route must come BEFORE recruiter middleware
router.get('/assigned', requireAuthAndRole('candidate'), getAssignedTestsForCandidate);

// All test routes below require recruiter authentication
router.use(requireAuthAndRole('recruiter'));

router.route('/')
  .post(createTest)
  .get(getAllTests);

router.route('/:id')
  .get(getTestById)
  .put(updateTest)
  .delete(deleteTest);

module.exports = router;
