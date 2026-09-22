/**
 * Redirect Controller
 *
 * Handles GET /:shortCode — the highest-traffic endpoint (100:1 read/write).
 *
 * Design priorities:
 * 1. FAST — cache-first lookup
 * 2. RELIABLE — graceful degradation
 * 3. ANALYTICS — non-blocking click tracking
 * 4. CORRECT — 302 for tracking, 410 for expired, 404 for missing
 */

const urlService = require('../services/urlService');
const analyticsService = require('../services/analyticsService');
const { HTTP_STATUS, ERROR_CODES, SHORT_CODE } = require('../config/constants');
const { ApiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * GET /:shortCode
 * Redirect user to original long URL.
 */
async function redirectToLongUrl(req, res, next) {
  const { shortCode } = req.params;

  try {
    // ─────────────────────────────────────────
    // 1. GUARD: Reserved paths shouldn't reach here
    // ─────────────────────────────────────────
    const lowerCode = (shortCode || '').toLowerCase();
    if (SHORT_CODE.RESERVED_WORDS.includes(lowerCode)) {
      return next(); // Let 404 handler deal with it
    }

    // ─────────────────────────────────────────
    // 2. VALIDATE format (fast reject)
    // ─────────────────────────────────────────
    if (
      !shortCode ||
      shortCode.length < 3 ||
      shortCode.length > SHORT_CODE.MAX_CUSTOM_LENGTH
    ) {
      logger.debug(`Invalid short code format: "${shortCode}"`);
      return ApiResponse.notFound(res, 'Short URL not found');
    }

    // ─────────────────────────────────────────
    // 3. LOOKUP (cache-first)
    // ─────────────────────────────────────────
    const urlData = await urlService.getUrlByShortCode(shortCode);

    // ─────────────────────────────────────────
    // 4. HANDLE: EXPIRED (410 Gone)
    // ─────────────────────────────────────────
    if (urlData && urlData.expired) {
      logger.info(`⏰ Expired link accessed: ${shortCode}`);
      return ApiResponse.gone(
        res,
        'This short URL has expired'
      );
    }

    // ─────────────────────────────────────────
    // 5. HANDLE: NOT FOUND (404)
    // ─────────────────────────────────────────
    if (!urlData) {
      logger.debug(`Short code not found: ${shortCode}`);
      return ApiResponse.notFound(res, 'Short URL not found');
    }

    // ─────────────────────────────────────────
    // 6. RECORD CLICK (fire-and-forget)
    // ─────────────────────────────────────────
        // ─────────────────────────────────────────
    // 6. RECORD CLICK (fire-and-forget)
    // ─────────────────────────────────────────
    analyticsService.recordClick(shortCode, urlData._id || null, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
    });

    // ─────────────────────────────────────────
    // 7. REDIRECT (302 — NOT 301 — for analytics)
    // ─────────────────────────────────────────
    logger.info(`↪️  Redirecting ${shortCode} → ${urlData.longUrl}`);
    return res.redirect(HTTP_STATUS.FOUND, urlData.longUrl);
  } catch (error) {
    logger.error(`Redirect error for "${shortCode}":`, error);
    return next(error);
  }
}

/**
 * GET /:shortCode/info
 * JSON info about the short URL (no redirect).
 */
async function getRedirectInfo(req, res, next) {
  const { shortCode } = req.params;

  try {
    const urlData = await urlService.getUrlByShortCode(shortCode);

    if (urlData && urlData.expired) {
      return ApiResponse.gone(res, 'Short URL has expired');
    }

    if (!urlData) {
      return ApiResponse.notFound(res, 'Short URL not found');
    }

    return ApiResponse.success(
      res,
      {
        shortCode,
        longUrl: urlData.longUrl,
        expiresAt: urlData.expiresAt,
        isActive: urlData.isActive,
      },
      'Short URL info'
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  redirectToLongUrl,
  getRedirectInfo,
};