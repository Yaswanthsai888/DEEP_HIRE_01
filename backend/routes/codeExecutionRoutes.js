const express = require('express');
const router = express.Router();
const { executeCode, requestHint, requestFeedback, requestFollowUp } = require('../controllers/CodeExecutionController');

// Code execution endpoint
router.post('/execute', executeCode);

// AI assistance endpoints
router.post('/hint', async (req, res) => {
  try {
    const { code, task_description, mode } = req.body;
    const result = await requestHint(code, task_description, mode);
    res.json(result);
  } catch (error) {
    console.error('Error requesting hint:', error);
    res.status(500).json({ message: 'Failed to get hint', error: error.message });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const { code, task_description, mode } = req.body;
    const result = await requestFeedback(code, task_description, mode);
    res.json(result);
  } catch (error) {
    console.error('Error requesting feedback:', error);
    res.status(500).json({ message: 'Failed to get feedback', error: error.message });
  }
});

router.post('/followup', async (req, res) => {
  try {
    const { code, task_description } = req.body;
    const result = await requestFollowUp(code, task_description);
    res.json(result);
  } catch (error) {
    console.error('Error requesting follow-up:', error);
    res.status(500).json({ message: 'Failed to get follow-up question', error: error.message });
  }
});

module.exports = router;
