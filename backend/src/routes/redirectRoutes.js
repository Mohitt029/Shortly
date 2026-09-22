/**
 * Redirect Routes
 *
 * Mounted at ROOT (not under /api/v1) because short URLs
 * should be at the domain root: http://localhost:5000/abc123
 *
 * ORDER MATTERS: This router must be mounted LAST in app.js,
 * after all /api routes and /health, so reserved paths don't
 * get treated as short codes.
 */

const express = require('express');
const redirectController = require('../controllers/redirectController');

const router = express.Router();

// GET /:shortCode — Redirect to long URL
// Example: GET /my-github → 302 → https://github.com/mohitt1213
router.get('/:shortCode', redirectController.redirectToLongUrl);

module.exports = router;