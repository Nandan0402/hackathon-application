const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/healthController');

// GET /api/health
router.get('/', HealthController.getHealth);

module.exports = router;
