const axios = require('axios');
const { endpoint } = require('../config/modelConfig');

// POST /api/execute-code
// Body: { code, language, input }
// Returns: { stdout, stderr, status, time, memory }
const executeCode = async (req, res) => {
  try {
    const { code, language, input } = req.body;
    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required.' });
    }

    // Map frontend language to Judge0 language_id
    const langMap = {
      javascript: 63, // Node.js
      python: 71,     // Python 3
      java: 62,       // Java (OpenJDK)
      C: 50,          // C (GCC)
      cpp: 54,        // C++ (GCC)
      ruby: 72,
      go: 39,
      php: 78,
    };
    const language_id = langMap[language];
    if (!language_id) {
      return res.status(400).json({ message: 'Unsupported language.' });
    }

    // Use ngrok tunnel to access local Judge0 instance
    const judge0Endpoint = process.env.JUDGE0_API_URL || 'https://06eb-2401-4900-882e-a457-78cc-e69c-7fa7-e8a3.ngrok-free.app';
    
    let headers = {
      'Content-Type': 'application/json',
    };
    
    // Submit code to Judge0
    const judge0Res = await axios.post(
      `${judge0Endpoint}/submissions?base64_encoded=false&wait=true`,
      {
        source_code: code,
        language_id,
        stdin: input || '',
      },
      {
        headers,
        timeout: 15000, // Increased timeout
      }
    );

    const { stdout, stderr, status, time, memory, compile_output, message } = judge0Res.data;
    res.json({ stdout, stderr, status, time, memory, compile_output, message });
  } catch (err) {
    // Enhanced error logging with more context
    console.error("Judge0 Execution Error:", {
      message: err.message,
      code: err.code,
      response: err.response?.data || 'No response data',
      stack: err.stack
    });
    
    res.status(500).json({
        message: 'Code execution failed',
        error: err.response?.data?.message || err.message || 'An unknown error occurred during code execution.'
    });
  }
};

const requestHint = async (code, taskDescription, mode = 'concise') => {
    try {
        const response = await axios.post(`${endpoint}/generate-hint`, {
            code,
            task_description: taskDescription,
            mode
        });
        return response.data;
    } catch (error) {
        console.error('Error getting hint:', error);
        throw error;
    }
};

const requestFeedback = async (code, taskDescription, mode = 'concise') => {
    try {
        const response = await axios.post(`${endpoint}/generate-feedback`, {
            code,
            task_description: taskDescription,
            mode
        });
        return response.data;
    } catch (error) {
        console.error('Error getting feedback:', error);
        throw error;
    }
};

const requestFollowUp = async (code, taskDescription) => {
    try {
        const response = await axios.post(`${endpoint}/generate-followup`, {
            code,
            task_description: taskDescription
        });
        return response.data;
    } catch (error) {
        console.error('Error getting follow-up:', error);
        throw error;
    }
};

module.exports = {
    executeCode,
    requestHint,
    requestFeedback,
    requestFollowUp
};
