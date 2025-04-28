const express = require('express');
const router = express.Router();
const { executeCode } = require('../controllers/CodeExecutionController');

// POST /api/execute-code
router.post('/', executeCode);

module.exports = router;
