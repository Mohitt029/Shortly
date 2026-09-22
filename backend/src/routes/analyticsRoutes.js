/**
 * Analytics Routes
 * Mounted at /api/v1/analytics
 */

const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/analytics/:shortCode — public analytics (or owner-only if sensitive)
router.get('/:shortCode', optionalAuth, analyticsController.getUrlAnalytics);

// POST /api/v1/analytics/flush — manual flush (admin only — keep simple for now)
router.post('/flush', authenticate, analyticsController.flushClicks);

module.exports = router;