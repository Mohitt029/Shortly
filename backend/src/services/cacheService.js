/**
 * Cache Service
 *
 * Redis-backed cache-aside pattern for URL lookups.
 * Handles graceful degradation when Redis is unavailable.
 */

const { getRedis, isAvailable } = require('../config/redis');
const { CACHE } = require('../config/constants');
const logger = require('../utils/logger');

class CacheService {
  /**
   * Build a cache key.
   * @param {string} prefix - Cache prefix (from CACHE.PREFIX)
   * @param {string} id - Resource identifier
   */
  buildKey(prefix, id) {
    return `${prefix}${id}`;
  }

  /**
   * Get a value from cache.
   * @param {string} key
   * @returns {Promise<any|null>} Parsed value or null
   */
  async get(key) {
    if (!isAvailable()) {
      logger.debug('Cache unavailable — skipping GET');
      return null;
    }

    try {
      const raw = await getRedis().get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      logger.warn(`Cache GET error for key ${key}:`, err.message);
      return null;
    }
  }

  /**
   * Set a value with TTL.
   * @param {string} key
   * @param {any} value - Will be JSON-serialized
   * @param {number} ttlSeconds - Time to live
   */
  async set(key, value, ttlSeconds = CACHE.TTL.URL_DEFAULT) {
    if (!isAvailable()) {
      logger.debug('Cache unavailable — skipping SET');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await getRedis().set(key, serialized, 'EX', ttlSeconds);
      return true;
    } catch (err) {
      logger.warn(`Cache SET error for key ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Delete a key.
   */
  async del(key) {
    if (!isAvailable()) return false;
    try {
      await getRedis().del(key);
      return true;
    } catch (err) {
      logger.warn(`Cache DEL error for key ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Check if a key exists.
   */
  async exists(key) {
    if (!isAvailable()) return false;
    try {
      const result = await getRedis().exists(key);
      return result === 1;
    } catch (err) {
      logger.warn(`Cache EXISTS error for key ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Increment a counter atomically.
   */
  async incr(key, ttlSeconds = null) {
    if (!isAvailable()) return null;
    try {
      const value = await getRedis().incr(key);
      if (ttlSeconds && value === 1) {
        await getRedis().expire(key, ttlSeconds);
      }
      return value;
    } catch (err) {
      logger.warn(`Cache INCR error for key ${key}:`, err.message);
      return null;
    }
  }

  // ─────────────────────────────────────────
  // HIGH-LEVEL HELPERS
  // ─────────────────────────────────────────

  /**
   * Cache a URL mapping (shortCode → longUrl).
   */
  async cacheUrl(shortCode, urlData, ttl = CACHE.TTL.URL_DEFAULT) {
    const key = this.buildKey(CACHE.PREFIX.URL, shortCode);
    return this.set(key, urlData, ttl);
  }

  /**
   * Get a cached URL mapping.
   */
  async getCachedUrl(shortCode) {
    const key = this.buildKey(CACHE.PREFIX.URL, shortCode);
    return this.get(key);
  }

  /**
   * Invalidate a cached URL.
   */
  async invalidateUrl(shortCode) {
    const key = this.buildKey(CACHE.PREFIX.URL, shortCode);
    return this.del(key);
  }

  /**
   * Compute TTL for a URL: min(remaining_lifetime, default_cache_ttl).
   * Prevents cache from outliving the URL itself.
   */
   /**
   * Compute TTL for a URL: min(remaining_lifetime - safety_margin, default_cache_ttl).
   * 
   * SAFETY: Cache must expire BEFORE the link does, so we never serve
   * an expired link from cache. We subtract a small buffer.
   * 
   * @param {Date|string|null} expiresAt
   * @returns {number} TTL in seconds (0 = don't cache)
   */
  computeUrlTtl(expiresAt) {
    // No expiration → use default TTL
    if (!expiresAt) return CACHE.TTL.URL_DEFAULT;

    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) return 0; // Already expired

    const remainingSeconds = Math.floor(remainingMs / 1000);

    // Safety margin: cache expires at least 1 second before the link does.
    // This prevents the cache from serving an expired link.
    const safeTtl = Math.max(0, remainingSeconds - 1);

    return Math.min(safeTtl, CACHE.TTL.URL_DEFAULT);
  }

  /**
   * Ping the cache (for health check).
   */
  async ping() {
    if (!isAvailable()) return false;
    try {
      const result = await getRedis().ping();
      return result === 'PONG';
    } catch (err) {
      return false;
    }
  }
}

module.exports = new CacheService();