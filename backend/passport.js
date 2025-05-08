const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');
const jwt = require('jsonwebtoken');

// Determine the callback URL based on environment
const isDevelopment = process.env.NODE_ENV !== 'production';
const callbackURL = isDevelopment 
  ? 'http://localhost:5000/api/auth/google/callback'
  : 'https://deep-hire-backend.onrender.com/auth/google/callback';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: callbackURL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        password: '', // No password for Google users
        role: 'candidate', // Default role, adjust as needed
        googleId: profile.id
      });
    }
    // Generate JWT
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return done(null, { user, token });
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((data, done) => {
  done(null, data);
});

passport.deserializeUser((data, done) => {
  done(null, data);
});

module.exports = passport;
