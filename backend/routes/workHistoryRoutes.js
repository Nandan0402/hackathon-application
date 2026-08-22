const express = require('express');
const router = express.Router();
const WorkHistoryController = require('../controllers/workHistoryController');
const { verifyAuth } = require('../middleware/authMiddleware');

// All work history routes require authentication
router.use(verifyAuth);

// Create work history entry
router.post('/', WorkHistoryController.createWorkHistory);

// Get worker's work history
router.get('/:workerId', WorkHistoryController.getWorkHistory);

module.exports = router;
