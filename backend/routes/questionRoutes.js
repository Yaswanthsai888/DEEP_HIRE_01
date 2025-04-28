const express = require('express');
const {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require('../controllers/QuestionController');
// Correctly import the middleware factory
const requireAuthAndRole = require('../middleware/authMiddleware');

const router = express.Router();

// Apply middleware requiring authentication and 'recruiter' role for all routes in this file
router.use(requireAuthAndRole('recruiter'));

router.route('/')
  .post(createQuestion)
  .get(getAllQuestions);

router.route('/:id')
  .get(getQuestionById)
  .put(updateQuestion)
  .delete(deleteQuestion);

module.exports = router;
