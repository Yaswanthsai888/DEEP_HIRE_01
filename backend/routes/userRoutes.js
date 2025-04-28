const express = require('express');
const router = express.Router();
const { getProfile, getAllUsers } = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// Get current user profile
router.get('/me', auth(), getProfile);

// List all users (admin only)
router.get('/', auth('admin'), getAllUsers);

module.exports = router;