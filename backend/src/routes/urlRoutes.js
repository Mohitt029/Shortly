/**
 * URL Routes
 * All endpoints under /api/v1/urls
 */

const express = require('express');
const urlController = require('../controllers/urlController');
const { createUrlLimiter } = require('../middleware/rateLimiter');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/urls — Create a short URL
// Public, but auth adds ownership
router.post('/', createUrlLimiter, optionalAuth, urlController.createShortUrl);

// GET /api/v1/urls — List my URLs (requires auth)
router.get('/', authenticate, urlController.listUserUrls);

// PATCH /api/v1/urls/:shortCode — Update expiration (owner-only)
router.patch('/:shortCode', authenticate, urlController.updateUrl);

// DELETE /api/v1/urls/:shortCode — Delete (owner-only)
router.delete('/:shortCode', authenticate, urlController.deleteUrl);

// GET /api/v1/urls/:shortCode — Get details (public, owner sees more)
// ⚠️ Must be LAST so /:shortCode doesn't shadow other routes
router.get('/:shortCode', optionalAuth, urlController.getUrlDetails);

module.exports = router;