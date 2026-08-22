const express = require('express');
const router = express.Router();
const WorkerController = require('../controllers/workerController');
const { verifyAuth } = require('../middleware/authMiddleware');

// All worker routes require authentication
router.use(verifyAuth);

// Create worker profile
router.post('/', WorkerController.createWorker);

// List / Search workers
router.get('/', WorkerController.listWorkers);

// Get comprehensive Skill Passport
router.get('/:id/skill-passport', WorkerController.getSkillPassport);

// Get worker profile by ID or userId
router.get('/:id', WorkerController.getWorkerById);

// Update worker profile
router.put('/:id', WorkerController.updateWorker);

module.exports = router;
