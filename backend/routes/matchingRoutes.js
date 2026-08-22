const express = require('express');
const router = express.Router();
const MatchingController = require('../controllers/matchingController');
const { verifyAuth } = require('../middleware/authMiddleware');

// All matching endpoints require authentication
router.use(verifyAuth);

// Match candidates for a job query / jobId
router.post('/', MatchingController.matchJob);

// Get ranked candidates for a specific job posting
router.get('/jobs/:jobId/candidates', MatchingController.getJobCandidates);

module.exports = router;
