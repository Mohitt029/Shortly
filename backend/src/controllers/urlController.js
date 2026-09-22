/**
 * URL Controller
 * HTTP request handlers for URL endpoints
 */

const urlService = require('../services/urlService');
const { config } = require('../config/env');
const { ApiResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/v1/urls
 * Create a new short URL (public, but authenticated users get ownership)
 */
const createShortUrl = asyncHandler(async (req, res) => {
  const { long_url, custom_alias, expires_at } = req.body;

  if (!long_url) {
    return ApiResponse.badRequest(res, 'long_url is required', [
      { field: 'long_url', message: 'This field is required' },
    ]);
  }

  const urlDoc = await urlService.createShortUrl({
    longUrl: long_url,
    customAlias: custom_alias,
    expiresAt: expires_at,
    userId: req.user?._id || null,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return ApiResponse.created(
    res,
    {
      short_url: urlDoc.shortUrl,
      short_code: urlDoc.shortCode,
      long_url: urlDoc.longUrl,
      expires_at: urlDoc.expiresAt,
      created_at: urlDoc.createdAt,
      is_custom: urlDoc.isCustom,
    },
    'Short URL created successfully'
  );
});

/**
 * GET /api/v1/urls
 * List authenticated user's URLs (paginated)
 */
const listUserUrls = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const result = await urlService.listUserUrls(req.user._id, { page, limit });

  // Enhance each URL with computed fields
  result.urls = result.urls.map((u) => ({
    shortCode: u.shortCode,
    shortUrl: `${config.shortUrlDomain}/${u.shortCode}`,
    longUrl: u.longUrl,
    domain: u.domain,
    isCustom: u.isCustom,
    isActive: u.isActive,
    expiresAt: u.expiresAt,
    isExpired: u.expiresAt ? new Date(u.expiresAt) <= new Date() : false,
    clickCount: u.clickCount,
    lastAccessedAt: u.lastAccessedAt,
    createdAt: u.createdAt,
  }));

  return ApiResponse.success(res, result, 'URLs retrieved successfully');
});

/**
 * GET /api/v1/urls/:shortCode
 * Get details of a specific short URL (public; owner sees extra fields)
 */
const getUrlDetails = asyncHandler(async (req, res) => {
  const urlData = await urlService.getUrlDetails(
    req.params.shortCode,
    req.user?._id || null
  );

  if (!urlData) {
    return ApiResponse.notFound(res, 'Short URL not found');
  }

  return ApiResponse.success(res, urlData, 'URL details retrieved');
});

/**
 * DELETE /api/v1/urls/:shortCode
 * Delete a short URL (owner-only)
 */
const deleteUrl = asyncHandler(async (req, res) => {
  await urlService.deleteUrl(req.params.shortCode, req.user._id);
  return ApiResponse.success(res, null, 'Short URL deleted successfully');
});

/**
 * PATCH /api/v1/urls/:shortCode
 * Update a short URL's expiration (owner-only)
 */
const updateUrl = asyncHandler(async (req, res) => {
  const { expires_at } = req.body;

  const updated = await urlService.updateUrlExpiration(
    req.params.shortCode,
    req.user._id,
    expires_at
  );

  return ApiResponse.success(
    res,
    {
      shortCode: updated.shortCode,
      shortUrl: updated.shortUrl,
      longUrl: updated.longUrl,
      expiresAt: updated.expiresAt,
      updatedAt: updated.updatedAt,
    },
    'Short URL updated successfully'
  );
});

module.exports = {
  createShortUrl,
  listUserUrls,
  getUrlDetails,
  deleteUrl,
  updateUrl,
};