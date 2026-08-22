const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { verifyAuth, requireAdmin } = require('../middleware/authMiddleware');

// All admin routes strictly require authentication and ADMIN role
router.use(verifyAuth);
router.use(requireAdmin);

// Platform Analytics
router.get('/analytics', AdminController.getAnalytics);
router.get('/dashboard', AdminController.getAnalytics);

// User Management
router.get('/users', AdminController.getUsers);

// Job Management
router.get('/jobs', AdminController.getJobs);

// Application Management
router.get('/applications', AdminController.getApplications);

module.exports = router;
