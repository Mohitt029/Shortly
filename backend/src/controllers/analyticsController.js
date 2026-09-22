/**
 * Analytics Controller
 */

const analyticsService = require('../services/analyticsService');
const urlService = require('../services/urlService');
const { ApiResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/v1/analytics/:shortCode
 * Get aggregated analytics for a short URL.
 */
const getUrlAnalytics = asyncHandler(async (req, res) => {
  const { shortCode } = req.params;
  const days = Math.min(parseInt(req.query.days, 10) || 30, 90);

  // Verify URL exists
  const url = await urlService.getUrlDetails(shortCode, req.user?._id || null);
  if (!url) {
    return ApiResponse.notFound(res, 'Short URL not found');
  }

  const stats = await analyticsService.getClickStats(shortCode, { days });

  return ApiResponse.success(res, stats, 'Analytics retrieved');
});

/**
 * POST /api/v1/analytics/flush
 * Manually flush buffered clicks (admin only, or for testing).
 */
const flushClicks = asyncHandler(async (req, res) => {
  const result = await analyticsService.flushBufferedClicks();
  return ApiResponse.success(res, result, 'Clicks flushed');
});

module.exports = {
  getUrlAnalytics,
  flushClicks,
};