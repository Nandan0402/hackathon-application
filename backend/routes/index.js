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

// AI Skill Assessment routes (Gemini-powered)
router.use('/assessment', assessmentRoutes);

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
