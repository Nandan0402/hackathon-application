const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google', AuthController.googleLogin);

// Protected authentication routes
router.get('/profile', verifyAuth, AuthController.getProfile);

module.exports = router;
