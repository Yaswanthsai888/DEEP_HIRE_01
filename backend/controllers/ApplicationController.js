const Application = require('../models/Application');
const Job = require('../models/Job');
const asyncHandler = require('express-async-handler');

// Apply to a job (Candidate only)
exports.applyToJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const candidate = req.user.userId;
    // Prevent duplicate applications
    const existing = await Application.findOne({ job: jobId, candidate });
    if (existing) return res.status(400).json({ message: 'Already applied to this job' });
    const application = new Application({ job: jobId, candidate });
    await application.save();
    res.status(201).json({ message: 'Applied successfully', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get applications for the logged-in candidate
exports.getMyApplications = async (req, res) => {
  try {
    const candidate = req.user.userId;
    const applications = await Application.find({ candidate })
      .populate('job')
      .populate('currentRoundTest');
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get applicants for a job (Recruiter only)
exports.getApplicantsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const recruiterId = req.user.userId;

    const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    const applications = await Application.find({ job: jobId })
      .populate('candidate', '-password')
      .populate('currentRoundTest')
      .populate('roundHistory.test');
      
    res.json(applications);
  } catch (err) {
    console.error('Error fetching applicants:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update application status and assign to round (Recruiter only)
exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const applicationId = req.params.id;
  const { status, testId, round } = req.body;

  const application = await Application.findById(applicationId);
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // Update application status and round
  application.status = status;
  if (round) {
    application.round = round;
    
    // If a test is being assigned for this round
    if (testId) {
      // Add to round history
      application.roundHistory.push({
        round,
        test: testId,
        status: 'assigned',
        assignedAt: new Date()
      });
      
      // Set as current round test
      application.currentRoundTest = testId;
    }
  }

  await application.save();

  // Populate details for response
  await application.populate([
    { path: 'candidate', select: 'name email' },
    { path: 'job', select: 'title' },
    { path: 'currentRoundTest', select: 'title' },
    { path: 'roundHistory.test', select: 'title' }
  ]);

  res.json(application);
});

// Get applications for a specific round
exports.getApplicationsByRound = asyncHandler(async (req, res) => {
  const { jobId, round } = req.params;
  const recruiterId = req.user.userId;

  // Verify job ownership
  const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });
  if (!job) {
    return res.status(404).json({ message: 'Job not found or unauthorized' });
  }

  // Find applications for this round
  const applications = await Application.find({ 
    job: jobId,
    round: parseInt(round)
  })
    .populate('candidate', '-password')
    .populate('currentRoundTest')
    .populate('roundHistory.test');

  res.json(applications);
});