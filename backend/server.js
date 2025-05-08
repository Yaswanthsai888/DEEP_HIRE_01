require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('./passport');

const app = express();

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Enhanced CORS configuration for Firebase hosting
app.use(cors({
  origin: ['https://deep-hire-app.firebaseapp.com', 'https://deep-hire-app.web.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'Origin', 
    'X-Requested-With',
    'Cache-Control',  // Added to allow this header
    'Pragma',         // Added to allow this header
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Embedder-Policy'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true, // Allow cookies to be sent with requests
  maxAge: 600 // Cache preflight request for 10 minutes
}));

// Middleware
app.use(express.json());

// Session middleware (required for Passport OAuth)
app.use(session({
  secret: process.env.JWT_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

// File uploads (static serving for resumes/logos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/test-attempts', require('./routes/testAttemptRoutes'));
app.use('/api/execute-code', require('./routes/codeExecutionRoutes'));  // Reverted back to original path

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
