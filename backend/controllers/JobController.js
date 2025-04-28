const Job = require('../models/Job');

// Create a new job (Recruiter only)
exports.createJob = async (req, res) => {
  try {
    const { title, description, company, location, salary, test } = req.body;
    const recruiter = req.user.userId;
    const job = new Job({ title, description, company, location, salary, recruiter, test });
    await job.save();
    res.status(201).json({ message: 'Job created successfully', job });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get jobs posted by the logged-in recruiter
exports.getMyJobs = async (req, res) => {
  try {
    const recruiter = req.user.userId;
    const jobs = await Job.find({ recruiter });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all jobs (public)
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Edit a job (Recruiter only)
exports.editJob = async (req, res) => {
  try {
    const { id } = req.params;
    const recruiter = req.user.userId;
    const updateData = req.body;
    const job = await Job.findOneAndUpdate(
      { _id: id, recruiter },
      updateData,
      { new: true }
    );
    if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
    res.json({ message: 'Job updated', job });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get a single job by ID
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id).populate('test', 'title');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a job (Recruiter only)
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const recruiter = req.user.userId;
    const job = await Job.findOneAndDelete({ _id: id, recruiter });
    if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};