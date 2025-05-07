const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { register, login } = require('../controllers/authController');
const passport = require('../passport');

// Multer config for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Register route with resume upload
router.post('/register', upload.single('resume'), register);

// Login route
router.post('/login', login);

// Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => {
  // Send JWT and user info to frontend (customize as needed)
  res.redirect(`https://deep-hire-app.web.app/oauth-success?token=${req.user.token}`);
});

module.exports = router;