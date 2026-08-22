const express = require('express');
const router = express.Router();
const AssessmentController = require('../controllers/assessmentController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Generate questions (can be viewed before or after authenticating)
router.post('/questions', AssessmentController.getQuestions);

// Submit answers for Gemini AI evaluation (Authentication required)
router.post('/submit', verifyAuth, AssessmentController.submitAssessment);

// Retrieve assessment report by workerId (Authentication required)
router.get('/:workerId', verifyAuth, AssessmentController.getAssessment);

module.exports = router;
