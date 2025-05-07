const User = require('../models/User');
// Add other necessary models like Job, Application if needed for stats

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        // TODO: Add pagination later if needed
        const users = await User.find({}).select('-password'); // Exclude passwords
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        // Handle potential CastError if ID format is invalid
        if (error.kind === 'ObjectId') {
             return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user by ID (Admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields only if they are provided in the request body
        if (name) user.name = name;
        if (email) {
            // Optional: Add check for email uniqueness if allowing email change
            const existingUser = await User.findOne({ email: email });
            if (existingUser && existingUser._id.toString() !== user._id.toString()) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }
        if (role) {
            // Ensure the role is valid according to the schema enum
            if (!User.schema.path('role').enumValues.includes(role)) {
                 return res.status(400).json({ message: 'Invalid role specified' });
            }
            user.role = role;
        }
        // Note: Password should generally not be updated via this admin route.
        // Implement a separate password reset flow if needed.

        const updatedUser = await user.save();
        
        // Return updated user data, excluding password
        const userToReturn = updatedUser.toObject();
        delete userToReturn.password;

        res.json(userToReturn);

    } catch (error) {
        console.error('Error updating user:', error);
        // Handle potential CastError if ID format is invalid
        if (error.kind === 'ObjectId') {
             return res.status(404).json({ message: 'User not found' });
        }
        // Handle potential validation errors from Mongoose
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server Error updating user' });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.deleteOne(); // or user.remove() depending on Mongoose version/hooks

        res.json({ message: 'User removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        
        // Count users with parsed resumes (assuming parsedResume is populated when parsed)
        const resumesParsed = await User.countDocuments({ parsedResume: { $exists: true, $ne: null } });

        // Aggregate top skills (assuming parsedResume.skills is an array of strings)
        // Limit to top 5 skills for brevity
        const topSkills = await User.aggregate([
            { $match: { "parsedResume.skills": { $exists: true, $ne: null, $not: { $size: 0 } } } }, // Ensure skills array exists and is not empty
            { $unwind: "$parsedResume.skills" }, // Deconstruct the skills array
            { $group: { _id: "$parsedResume.skills", count: { $sum: 1 } } }, // Group by skill and count occurrences
            { $sort: { count: -1 } }, // Sort by count descending
            { $limit: 5 }, // Limit to top 5
            { $project: { skill: "$_id", count: 1, _id: 0 } } // Rename _id to skill
        ]);

        // Aggregate sign-ups per day for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const signupsPerDay = await User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } }, // Filter users created in the last 30 days
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by date (YYYY-MM-DD)
                    count: { $sum: 1 } // Count users per day
                }
            },
            { $sort: { _id: 1 } }, // Sort by date ascending
            { $project: { date: "$_id", count: 1, _id: 0 } } // Rename _id to date
        ]);

        res.json({
            totalUsers,
            resumesParsed,
            topSkills,
            signupsPerDay
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server Error fetching stats' });
    }
};

// Note: No longer using module.exports = { ... } at the end
