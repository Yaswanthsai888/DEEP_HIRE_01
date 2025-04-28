const mongoose = require('mongoose');

// Reusable schema for examples (visible to candidate)
const exampleSchema = new mongoose.Schema({
  input: {
    type: String,
    required: [true, 'Example input is required.'],
    trim: true,
  },
  output: {
    type: String,
    required: [true, 'Example output is required.'],
    trim: true,
  },
  explanation: { // Optional explanation for the example
    type: String,
    trim: true
  },
}, { _id: false }); // Don't generate separate IDs for examples embedded in questions

// Reusable schema for test cases (used for evaluation)
const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: [true, 'Test case input is required.'],
    trim: true,
  },
  expectedOutput: {
    type: String,
    required: [true, 'Test case expected output is required.'],
    trim: true,
  },
  isPublic: { // Whether this test case is visible like an example (usually false)
    type: Boolean,
    default: false
  },
  points: { // Points awarded specifically for passing this test case (for partial scoring)
    type: Number,
    min: 0,
    default: 1 // Default points per test case if using partial scoring
  }
}, { _id: false }); // Don't generate separate IDs for test cases embedded in questions

const questionSchema = new mongoose.Schema({
  // --- Common Fields for all Question Types ---
  type: {
    type: String,
    enum: ['Multiple Choice', 'Subjective', 'Coding'],
    required: [true, 'Question type is required.'],
    default: 'Multiple Choice',
    index: true, // Index for faster filtering by type
  },
  content: { // The main problem description or question text (supports Markdown/HTML potentially)
    type: String,
    required: [true, 'Question content/problem statement is required.'],
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', 'Expert'], // Added 'Expert' level
    required: [true, 'Difficulty level is required.'],
    default: 'Medium',
  },
  tags: { // Replaced 'category' with 'tags' for better, multi-value categorization
    type: [String],
    trim: true,
    index: true, // Index tags for faster searching/filtering
    default: [],
  },
  points: { // Total points for the question if fully solved correctly
    type: Number,
    required: [true, 'Points value is required.'],
    min: [1, 'Points must be at least 1.'],
    default: 10, // Sensible default, adjust as needed
  },
  createdBy: { // Link to the User who created the question
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Timestamps managed by Mongoose option below

  // --- Fields specific to 'Multiple Choice' ---
  options: {
    type: [new mongoose.Schema({ // Defined inline to keep it contained
      text: { type: String, required: true, trim: true },
      isCorrect: { type: Boolean, default: false },
    }, { _id: false })],
    // Required only if the type is 'Multiple Choice'
    required: function() { return this.type === 'Multiple Choice'; },
    validate: {
      validator: function (arr) {
        if (this.type === 'Multiple Choice') {
          // Validation: Must be an array, have >= 2 options, and exactly one correct answer.
          // Adjust the filter condition if multiple correct answers are allowed.
          return Array.isArray(arr) && arr.length >= 2 && arr.filter(opt => opt.isCorrect === true).length === 1;
        }
        return true; // Skip validation if not Multiple Choice
      },
      message: 'Multiple Choice questions require at least 2 options with exactly one marked as correct.'
    },
    default: undefined, // Avoid defaulting to an empty array if not MC type
  },

  // --- Fields specific to 'Coding' ---
  constraints: { // Text defining input constraints, value ranges, etc.
    type: String,
    trim: true,
    required: function() { return this.type === 'Coding'; },
    message: 'Constraints description is required for Coding questions.',
    default: undefined,
  },
  examples: { // Array of visible examples (input/output/explanation)
    type: [exampleSchema],
    required: function() { return this.type === 'Coding'; },
    validate: { // Ensure at least one example is provided
        validator: function(arr) {
            return !(this.type === 'Coding' && (!Array.isArray(arr) || arr.length === 0));
        },
        message: 'Coding questions require at least one example.'
    },
    default: undefined,
  },
  testCases: { // Array of hidden test cases for evaluation
    type: [testCaseSchema],
    required: function() { return this.type === 'Coding'; },
     validate: { // Ensure at least one test case is provided
        validator: function(arr) {
            return !(this.type === 'Coding' && (!Array.isArray(arr) || arr.length === 0));
        },
        message: 'Coding questions require at least one test case.'
    },
    default: undefined,
  },
  allowedLanguages: { // List of language identifiers (e.g., ['javascript', 'python', 'java'])
    type: [String],
    required: function() { return this.type === 'Coding'; },
     validate: { // Ensure at least one language is allowed
        validator: function(arr) {
            return !(this.type === 'Coding' && (!Array.isArray(arr) || arr.length === 0));
        },
        message: 'Coding questions require at least one allowed language.'
    },
    default: undefined,
  },
  templateCode: { // Starter code snippets provided to the candidate
    type: Map,
    of: String, // Key: language identifier (e.g., 'python'), Value: code snippet string
    required: false, // Making this optional, can be added later or might not be needed for all questions
    default: {},
  },
  timeLimitSeconds: { // Execution time limit per test case in seconds
    type: Number,
    required: function() { return this.type === 'Coding'; },
    min: [0.5, 'Time limit must be at least 0.5 seconds.'],
    max: [30, 'Time limit cannot exceed 30 seconds.'], // Set a reasonable practical maximum
    default: 2, // Default time limit (e.g., 2 seconds)
  },
  memoryLimitMB: { // Memory usage limit in Megabytes
    type: Number,
    required: function() { return this.type === 'Coding'; },
    min: [64, 'Memory limit must be at least 64 MB.'],
    max: [1024, 'Memory limit cannot exceed 1024 MB (1 GB).'], // Set a reasonable practical maximum
    default: 256, // Default memory limit (e.g., 256 MB)
  },
  solutionCode: { // Optional: Reference solution code (consider security implications)
    type: Map,
    of: String, // Key: language identifier, Value: solution code string
    required: false,
    select: false, // IMPORTANT: Exclude from default query results for security
    default: {},
  },
  scoringLogic: { // Defines how points are awarded based on test cases
      type: String,
      enum: ['full_points_on_all_pass', 'partial_by_test_case'],
      required: function() { return this.type === 'Coding'; },
      default: 'partial_by_test_case', // Default to partial scoring based on individual test case points
  },
  hints: { // Optional hints for the candidate
      type: [String],
      default: [],
  },

  // --- Fields specific to 'Subjective' ---
  expectedKeywords: { // Optional: Keywords looked for in a subjective answer for auto-grading/guidance
    type: [String],
    // Only required if type is Subjective (can be empty array if not needed)
    required: function() { return this.type === 'Subjective'; },
    default: undefined,
  },
  maxWordCount: { // Optional: Recommended or enforced word limit for subjective answers
    type: Number,
    required: false, // Making this optional for subjective questions
    min: [10, 'Maximum word count must be at least 10.'],
    default: undefined,
  },

}, {
  // --- Schema Options ---
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  toJSON: { virtuals: true }, // Ensure virtuals are included when converting to JSON
  toObject: { virtuals: true } // Ensure virtuals are included when converting to plain objects
});

// --- Virtuals ---
// Example: Calculate total points possible from test cases if using partial scoring
questionSchema.virtual('totalTestCasesPoints').get(function() {
    // Check if it's a coding question with partial scoring and test cases exist
    if (this.type === 'Coding' && this.scoringLogic === 'partial_by_test_case' && this.testCases) {
        // Sum the points of all defined test cases
        return this.testCases.reduce((sum, tc) => sum + (tc.points || 0), 0);
    }
    // Return null if not applicable (not coding, not partial scoring, or no test cases)
    return null;
});

// --- Indexes (ensure efficient querying) ---
// Indexes for type, createdBy, and tags are already defined inline above.
// Add more indexes based on common query patterns, e.g., difficulty:
questionSchema.index({ difficulty: 1 });
// Compound index example (if you often query by type and difficulty)
questionSchema.index({ type: 1, difficulty: 1 });


// --- Pre-save Hooks (for validation or data consistency) ---
questionSchema.pre('save', function(next) {
    // Example: Ensure total points align with test case points under partial scoring logic
    if (this.isModified('testCases') || this.isModified('points') || this.isModified('scoringLogic')) {
        if (this.type === 'Coding' && this.scoringLogic === 'partial_by_test_case') {
            // Calculate the sum of points from all test cases
            const totalTCPoints = this.testCases?.reduce((sum, tc) => sum + (tc.points || 0), 0) ?? 0;
            // Check if the sum matches the main 'points' field for the question
            if (totalTCPoints !== this.points) {
                // Option 1: Log a warning (less intrusive)
                 console.warn(`Warning: Total points (${this.points}) for question ID ${this._id} ` +
                              `do not match sum of test case points (${totalTCPoints}) with partial scoring. ` +
                              `Consider adjusting the main points value or test case points.`);

                // Option 2: Throw an error to prevent saving (stricter)
                // return next(new Error(`Total points (${this.points}) must match the sum of test case points (${totalTCPoints}) when using partial scoring.`));

                // Option 3: Automatically adjust the main points field (potentially unexpected)
                // this.points = totalTCPoints;
            }
        } else if (this.type === 'Coding' && this.scoringLogic === 'full_points_on_all_pass') {
            // If using all-or-nothing scoring, ensure test cases don't have misleading individual points > 0
            // (They are effectively pass/fail checks for the total points)
            this.testCases?.forEach(tc => {
                if (tc.points !== 0) {
                     // Optionally reset points to 0 or 1 for clarity, or just ignore.
                     // tc.points = 0; // Resetting might be clearer
                }
            });
        }
    }
    // Continue with the save operation
    next();
});


module.exports = mongoose.model('Question', questionSchema);
// This model can be used in controllers to create, read, update, and delete questions in the database.