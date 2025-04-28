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
      C: 50,         // C (GCC)
      cpp: 54,       // C++ (GCC)
      ruby: 72,
      go: 39,
      php: 78,
    };
    const language_id = langMap[language];
    if (!language_id) {
      return res.status(400).json({ message: 'Unsupported language.' });
    }

    // Submit code to Judge0
    const judge0Endpoint = process.env.JUDGE0_ENDPOINT_URL || 'http://localhost:2358'; // Default to localhost if not set
    const judge0Res = await axios.post(
      `${judge0Endpoint}/submissions?base64_encoded=false&wait=true`, // Use local endpoint
      {
        source_code: code,
        language_id,
        stdin: input || '',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // Keep timeout
      }
    );

    const { stdout, stderr, status, time, memory, compile_output, message } = judge0Res.data;
    res.json({ stdout, stderr, status, time, memory, compile_output, message });
  } catch (err) {
    // Log the entire error object for more details
    console.error("Judge0 Execution Error Object:", err);
    // Keep the original logging as well
    console.error("Judge0 Execution Error Message:", err.response ? err.response.data : err.message);
    res.status(500).json({
        message: 'Code execution failed',
        error: err.response?.data?.message || err.message || 'An unknown error occurred during code execution.'
    });
  }
};
