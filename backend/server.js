require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS middleware should be first
app.use(cors({
  origin: ['http://localhost:3000', 'https://deep-hire-app.web.app'], // Allow frontend origin
  credentials: true
}));

// Middleware
app.use(express.json());

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
app.use('/api/execute-code', require('./routes/codeExecutionRoutes'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});