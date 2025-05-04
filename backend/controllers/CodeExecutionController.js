const axios = require('axios');

// POST /api/execute-code
// Body: { code, language, input }
// Returns: { stdout, stderr, status, time, memory }
exports.executeCode = async (req, res) => {
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

    // Use RapidAPI Judge0 CE API temporarily for development
    const judge0Endpoint = 'https://judge0-ce.p.rapidapi.com';
    const headers = {
      'Content-Type': 'application/json',
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      // Get a free RapidAPI key from https://rapidapi.com/judge0-official/api/judge0-ce
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY'
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

// Hugging Face Space API URL
const HUGGINGFACE_SPACE_URL = 'https://yaswanthsai-live-coding-hr-assistant.hf.space';

exports.getHint = async (req, res) => {
    try {
        const { taskDescription, code, mode = 'concise' } = req.body;
        
        const response = await axios.post(`${HUGGINGFACE_SPACE_URL}/run/predict`, {
            data: [
                taskDescription,
                code,
                "hint",
                mode
            ]
        });

        if (response.data && response.data.data) {
            res.json({ hint: response.data.data });
        } else {
            throw new Error('Invalid response from AI service');
        }
    } catch (error) {
        console.error('Error getting hint:', error);
        res.status(500).json({ error: 'Failed to get hint' });
    }
};

exports.getFeedback = async (req, res) => {
    try {
        const { taskDescription, code, mode = 'concise' } = req.body;
        
        const response = await axios.post(`${HUGGINGFACE_SPACE_URL}/run/predict`, {
            data: [
                taskDescription,
                code,
                "feedback",
                mode
            ]
        });

        if (response.data && response.data.data) {
            res.json({ feedback: response.data.data });
        } else {
            throw new Error('Invalid response from AI service');
        }
    } catch (error) {
        console.error('Error getting feedback:', error);
        res.status(500).json({ error: 'Failed to get feedback' });
    }
};

exports.getFollowUp = async (req, res) => {
    try {
        const { taskDescription, code, mode = 'concise' } = req.body;
        
        const response = await axios.post(`${HUGGINGFACE_SPACE_URL}/run/predict`, {
            data: [
                taskDescription,
                code,
                "follow-up",
                mode
            ]
        });

        if (response.data && response.data.data) {
            res.json({ followUp: response.data.data });
        } else {
            throw new Error('Invalid response from AI service');
        }
    } catch (error) {
        console.error('Error getting follow-up:', error);
        res.status(500).json({ error: 'Failed to get follow-up question' });
    }
};
