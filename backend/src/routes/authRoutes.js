/**
 * Auth Routes
 * Mounted at /api/v1/auth
 */

const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);

// Protected
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/api-key/regenerate', authenticate, authController.regenerateApiKey);

module.exports = router;