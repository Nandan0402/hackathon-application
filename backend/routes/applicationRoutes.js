const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/applicationController');
const { verifyAuth } = require('../middleware/authMiddleware');

// All application routes require authentication
router.use(verifyAuth);

// Submit job application
router.post('/', ApplicationController.createApplication);

// List applications (Role-filtered)
router.get('/', ApplicationController.listApplications);

// Get single application
router.get('/:id', ApplicationController.getApplicationById);

// Update application status (APPLIED, SHORTLISTED, REJECTED, HIRED)
router.put('/:id', ApplicationController.updateApplication);

module.exports = router;
