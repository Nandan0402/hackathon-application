const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const workerRoutes = require('./workerRoutes');
const assessmentRoutes = require('./assessmentRoutes');
const jobRoutes = require('./jobRoutes');
const matchingRoutes = require('./matchingRoutes');
const applicationRoutes = require('./applicationRoutes');
const workHistoryRoutes = require('./workHistoryRoutes');
const adminRoutes = require('./adminRoutes');
const ApplicationController = require('../controllers/applicationController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Health Check route
router.use('/health', healthRoutes);

// Authentication & Profile routes
router.use('/auth', authRoutes);

// Worker Management routes
router.use('/workers', workerRoutes);
router.use('/worker/profile', workerRoutes);
router.use('/worker/passport', (req, res, next) => {
  const workerId = req.user?.uid || 'demo_worker_uid';
  req.params.id = workerId;
  const WorkerController = require('../controllers/workerController');
  return WorkerController.getSkillPassport(req, res, next);
});

// AI Skill Assessment routes (Gemini-powered)
router.use('/assessment', assessmentRoutes);
router.use('/worker/assessments/start', (req, res, next) => {
  const AssessmentController = require('../controllers/assessmentController');
  return AssessmentController.generateQuestions(req, res, next);
});
router.use('/worker/assessments/submit', (req, res, next) => {
  const AssessmentController = require('../controllers/assessmentController');
  return AssessmentController.submitAssessment(req, res, next);
});

// Employer & Job Management routes
router.use('/jobs', jobRoutes);

// AI-powered Candidate Matching routes
router.use('/matching', matchingRoutes);

// Application Management routes
router.use('/applications', applicationRoutes);

// Work History routes
router.use('/work-history', workHistoryRoutes);

// Admin Management & Analytics routes (Admin only)
router.use('/admin', adminRoutes);

// Dedicated /api/hire route
router.post('/hire', verifyAuth, ApplicationController.hireCandidate);

module.exports = router;
