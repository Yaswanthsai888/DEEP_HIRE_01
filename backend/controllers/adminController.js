const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, recruiterKey } = req.body; // <-- Destructure recruiterKey

    // --- Recruiter Key Validation ---
    if (role === 'recruiter') {
      const expectedKey = process.env.RECRUITER_REGISTRATION_KEY;
      if (!expectedKey) {
        console.error('RECRUITER_REGISTRATION_KEY environment variable is not set.');
        return res.status(500).json({ message: 'Server configuration error.' });
      }
      if (!recruiterKey || recruiterKey !== expectedKey) {
        return res.status(403).json({ message: 'Invalid recruiter registration key.' });
      }
    }
    // --- End Recruiter Key Validation ---

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    let resumePath = null;
    let parsedResume = { skills: [] };
    
    try {
      if (req.file) {
        // Validate file exists before processing
        if (!fs.existsSync(req.file.path)) {
          throw new Error('Uploaded file not found');
        }
        // Call resume parser microservice if available
        try {
          const FormData = require('form-data');
          const formData = new FormData();
          formData.append('file', fs.createReadStream(req.file.path));
          const headers = {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          };
          
          // Use the environment variable for the resume parser URL, with a fallback
          const resumeParserUrl = process.env.RESUME_PARSER_URL || 'http://localhost:8000';
          const parserRes = await axios.post(`${resumeParserUrl}/parse-resume`, formData, {
            headers,
            timeout: 10000, // Increased timeout for remote service
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          });
          if (!parserRes.data || typeof parserRes.data !== 'object') {
            throw new Error('Invalid parser response format');
          }
          parsedResume = {
            skills: Array.isArray(parserRes.data.skills) ? 
              parserRes.data.skills.map(skill => skill.toLowerCase().trim()).filter(skill => skill.length > 0) : 
              []
          };
          fs.unlinkSync(req.file.path); // Clean up uploaded file after parsing
        } catch (parseErr) {
          console.error('Resume parser error:', parseErr);
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          if (parseErr.code === 'ECONNREFUSED') {
            console.error('Resume parser service unavailable');
          }
          parsedResume = { skills: [] };
        }
      }
    } catch (err) {
      console.error('File handling error:', err);
      parsedResume = { skills: [] };
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role, parsedResume });
    await user.save();
    res.status(201).json({ 
      message: 'User registered successfully',
      skills: user.parsedResume?.skills // Ensure skills exist
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
