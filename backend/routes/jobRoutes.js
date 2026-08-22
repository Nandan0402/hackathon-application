const express = require('express');
const router = express.Router();
const JobController = require('../controllers/jobController');
const { verifyAuth } = require('../middleware/authMiddleware');

// All job operations require authentication
router.use(verifyAuth);

// Create Job (Employers / Admin)
router.post('/', JobController.createJob);

// List Jobs (Role-filtered)
router.get('/', JobController.listJobs);

// Get single job details
router.get('/:id', JobController.getJobById);

// Get AI ranked candidates for a specific job posting
router.get('/:jobId/candidates', require('../controllers/matchingController').getJobCandidates);

// Update Job (Job Owner Employer / Admin)
router.put('/:id', JobController.updateJob);

// Delete Job (Job Owner Employer / Admin)
router.delete('/:id', JobController.deleteJob);

module.exports = router;
