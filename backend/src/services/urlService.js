/**
 * URL Service — Core Business Logic
 */

const Url = require('../models/Url');
const cacheService = require('./cacheService');
const { nextId } = require('../utils/snowflake');
const base62 = require('../utils/base62');
const { canonicalize, extractDomain } = require('../utils/urlValidator');
const { AppError } = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES, SHORT_CODE } = require('../config/constants');
const { config } = require('../config/env');
const { getRedis, isAvailable } = require('../config/redis');
const logger = require('../utils/logger');

class UrlService {
  // ─────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────

  async createShortUrl({
    longUrl,
    customAlias,
    expiresAt,
    userId = null,
    ip = null,
    userAgent = null,
  }) {
    const canonicalUrl = canonicalize(longUrl);
    const domain = extractDomain(canonicalUrl);

    let shortCode;
    let isCustom = false;
    let snowflakeId;

    if (customAlias) {
      shortCode = this.validateCustomAlias(customAlias);
      isCustom = true;
      snowflakeId = (await nextId()).toString();

      const existing = await Url.findOne({ shortCode });
      if (existing) {
        throw new AppError(
          `Custom alias "${customAlias}" is already taken`,
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.SHORT_CODE_EXISTS
        );
      }
    } else {
      const id = await nextId();
      snowflakeId = id.toString();
      shortCode = base62.encode(id);

      if (shortCode.length > config.shortCode.length) {
        shortCode = shortCode.slice(-config.shortCode.length);
      }

      let attempts = 0;
      const maxAttempts = 5;
      while (attempts < maxAttempts) {
        const exists = await Url.findOne({ shortCode }).lean();
        if (!exists) break;
        const fullCode = base62.encode(id);
        shortCode = (fullCode + attempts.toString(36)).slice(
          -config.shortCode.length
        );
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new AppError(
          'Failed to generate a unique short code. Please try again.',
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.INTERNAL_ERROR
        );
      }
    }

    let finalExpiresAt = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (isNaN(parsed.getTime())) {
        throw new AppError(
          'Invalid expiration date',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      if (parsed <= new Date()) {
        throw new AppError(
          'Expiration date must be in the future',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      finalExpiresAt = parsed;
    }

    const urlDoc = await Url.create({
      shortCode,
      snowflakeId,
      longUrl: canonicalUrl,
      originalUrl: longUrl !== canonicalUrl ? longUrl : undefined,
      domain,
      userId: userId || null,
      isCustom,
      expiresAt: finalExpiresAt,
      createdByIp: ip,
      userAgent,
    });

    logger.info(`✅ Short URL created: ${shortCode} → ${canonicalUrl}`, {
      shortCode,
      isCustom,
      expiresAt: finalExpiresAt,
    });

    try {
      const ttl = cacheService.computeUrlTtl(finalExpiresAt);
      if (ttl > 0) {
        await cacheService.cacheUrl(
          shortCode,
          {
            _id: urlDoc._id.toString(),
            longUrl: canonicalUrl,
            expiresAt: finalExpiresAt,
            isActive: true,
          },
          ttl
        );
      }
    } catch (err) {
      logger.warn('Cache warm-up failed (non-fatal):', err.message);
    }

    return urlDoc;
  }

  // ─────────────────────────────────────────
  // LOOKUP (cache-aside)
  // ─────────────────────────────────────────

  async getUrlByShortCode(shortCode) {
    const now = new Date();

    const cached = await cacheService.getCachedUrl(shortCode);

    if (cached) {
      logger.debug(`Cache HIT for ${shortCode}`);

      if (cached.expiresAt && new Date(cached.expiresAt) <= now) {
        logger.info(`⏰ Cached link expired: ${shortCode}`);
        await cacheService.invalidateUrl(shortCode);
        return { expired: true };
      }

      if (cached.isActive === false) return null;

      return {
        _id: cached._id || null,
        longUrl: cached.longUrl,
        expiresAt: cached.expiresAt,
        isActive: cached.isActive,
      };
    }

    logger.debug(`Cache MISS for ${shortCode} — querying DB`);

    const urlDoc = await Url.findOne({ shortCode }).lean();

    if (!urlDoc) return null;
    if (!urlDoc.isActive) return null;

    if (urlDoc.expiresAt && new Date(urlDoc.expiresAt) <= now) {
      logger.info(`⏰ DB link expired: ${shortCode}`);
      await cacheService.invalidateUrl(shortCode);
      return { expired: true };
    }

    const ttl = cacheService.computeUrlTtl(urlDoc.expiresAt);
    if (ttl > 0) {
      await cacheService.cacheUrl(
        shortCode,
        {
          _id: urlDoc._id.toString(),
          longUrl: urlDoc.longUrl,
          expiresAt: urlDoc.expiresAt,
          isActive: urlDoc.isActive,
        },
        ttl
      );
    }

    return {
      _id: urlDoc._id,
      longUrl: urlDoc.longUrl,
      expiresAt: urlDoc.expiresAt,
      isActive: urlDoc.isActive,
    };
  }

  // ─────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────

  validateCustomAlias(alias) {
    if (!alias || typeof alias !== 'string') {
      throw new AppError(
        'Custom alias must be a string',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const trimmed = alias.trim();

    if (trimmed.length < SHORT_CODE.MIN_CUSTOM_LENGTH) {
      throw new AppError(
        `Custom alias must be at least ${SHORT_CODE.MIN_CUSTOM_LENGTH} characters`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (trimmed.length > SHORT_CODE.MAX_CUSTOM_LENGTH) {
      throw new AppError(
        `Custom alias must be at most ${SHORT_CODE.MAX_CUSTOM_LENGTH} characters`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new AppError(
        'Custom alias can only contain letters, numbers, dashes, and underscores',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const lower = trimmed.toLowerCase();
    if (SHORT_CODE.RESERVED_WORDS.includes(lower)) {
      throw new AppError(
        `"${trimmed}" is a reserved word and cannot be used as an alias`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    return trimmed;
  }

  // ─────────────────────────────────────────
  // LIST (with real-time click counts)
  // ─────────────────────────────────────────

  /**
   * List URLs for a user, with real-time click counts
   * (persisted + Redis pending merged).
   */
  async listUserUrls(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      Url.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Url.countDocuments({ userId }),
    ]);

    // ⭐ Bulk-read pending clicks in a single MGET
    let pendingMap = {};
    if (urls.length > 0 && isAvailable()) {
      try {
        const keys = urls.map((u) => `shortly:clicks:buffer:${u.shortCode}`);
        const values = await getRedis().mget(...keys);
        urls.forEach((u, i) => {
          pendingMap[u.shortCode] = parseInt(values[i], 10) || 0;
        });
      } catch (err) {
        logger.warn('Failed to bulk-read pending clicks:', err.message);
      }
    }

    const urlsWithLiveCounts = urls.map((u) => {
      const pending = pendingMap[u.shortCode] || 0;
      return {
        ...u,
        clickCount: (u.clickCount || 0) + pending,
        pendingClicks: pending,
      };
    });

    return {
      urls: urlsWithLiveCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────
  // OWNERSHIP-AWARE METHODS
  // ─────────────────────────────────────────

  async deleteUrl(shortCode, userId) {
    const url = await Url.findOne({ shortCode });

    if (!url) {
      throw new AppError(
        'Short URL not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.SHORT_CODE_NOT_FOUND
      );
    }

    if (!url.userId || url.userId.toString() !== userId.toString()) {
      throw new AppError(
        'You do not have permission to delete this URL',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    await Url.deleteOne({ _id: url._id });
    await cacheService.invalidateUrl(shortCode);

    // Also clear pending click buffer (data is going away)
    if (isAvailable()) {
      try {
        await getRedis().del(`shortly:clicks:buffer:${shortCode}`);
      } catch {
        // ignore
      }
    }

    logger.info(`🗑️  URL deleted: ${shortCode} by user ${userId}`);
    return { deleted: true };
  }

  async updateUrlExpiration(shortCode, userId, expiresAt) {
    const url = await Url.findOne({ shortCode });

    if (!url) {
      throw new AppError(
        'Short URL not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.SHORT_CODE_NOT_FOUND
      );
    }

    if (!url.userId || url.userId.toString() !== userId.toString()) {
      throw new AppError(
        'You do not have permission to modify this URL',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    let newExpiresAt = null;
    if (expiresAt !== null && expiresAt !== undefined) {
      const parsed = new Date(expiresAt);
      if (isNaN(parsed.getTime())) {
        throw new AppError(
          'Invalid expiration date',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      if (parsed <= new Date()) {
        throw new AppError(
          'Expiration date must be in the future',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      newExpiresAt = parsed;
    }

    url.expiresAt = newExpiresAt;
    await url.save();
    await cacheService.invalidateUrl(shortCode);

    logger.info(`📝 URL updated: ${shortCode} expiresAt=${newExpiresAt}`);
    return url;
  }

  /**
   * Get URL details (real-time click count included).
   */
  async getUrlDetails(shortCode, userId = null) {
    const url = await Url.findOne({ shortCode }).lean();
    if (!url) return null;

    // Real-time pending from Redis
    let pending = 0;
    if (isAvailable()) {
      try {
        const v = await getRedis().get(`shortly:clicks:buffer:${shortCode}`);
        pending = parseInt(v, 10) || 0;
      } catch {
        // ignore
      }
    }

    const publicView = {
      shortCode: url.shortCode,
      shortUrl: `${config.shortUrlDomain}/${url.shortCode}`,
      longUrl: url.longUrl,
      domain: url.domain,
      isCustom: url.isCustom,
      isActive: url.isActive,
      expiresAt: url.expiresAt,
      clickCount: (url.clickCount || 0) + pending,
      persistedClicks: url.clickCount || 0,
      pendingClicks: pending,
      lastAccessedAt: url.lastAccessedAt,
      createdAt: url.createdAt,
      isExpired: url.expiresAt
        ? new Date(url.expiresAt) <= new Date()
        : false,
      isOwner: false,
    };

    if (userId && url.userId && url.userId.toString() === userId.toString()) {
      publicView.snowflakeId = url.snowflakeId;
      publicView.userId = url.userId;
      publicView.isOwner = true;
    }

    return publicView;
  }
}

module.exports = new UrlService();