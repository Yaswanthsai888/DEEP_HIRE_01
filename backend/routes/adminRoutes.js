const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController'); // Import the admin controller

// --- DEBUGGING --- 
console.log('--- Loading adminRoutes.js ---');
console.log('adminController type:', typeof adminController);
console.log('adminController keys:', adminController ? Object.keys(adminController) : 'adminController is null/undefined');
console.log('adminController.getAllUsers type:', typeof adminController?.getAllUsers);
// --- END DEBUGGING ---

// User Management Routes
router.get('/users', auth('admin'), adminController.getAllUsers); // Get all users
router.get('/users/:id', auth('admin'), adminController.getUserById); // Get single user by ID
router.put('/users/:id', auth('admin'), adminController.updateUser); // Update user by ID
router.delete('/users/:id', auth('admin'), adminController.deleteUser); // Delete user by ID

// Dashboard/Analytics Routes
router.get('/dashboard/stats', auth('admin'), adminController.getDashboardStats); // Get dashboard stats

// Example: Moderate jobs (admin only) - Keep placeholder or implement if needed
// router.put('/jobs/:id/moderate', auth('admin'), adminController.moderateJob);

module.exports = router;
