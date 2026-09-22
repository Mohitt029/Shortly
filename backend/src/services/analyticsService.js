/**
 * Analytics Service
 *
 * Handles async click tracking with rich per-click data.
 *
 * Design:
 * - FAST path: Increment Redis buffer (single source of truth for clickCount)
 * - RICH path: Insert ClickEvent document (fire-and-forget)
 * - NEVER blocks the redirect response
 *
 * ⭐ Url.clickCount is incremented ONLY by flushBufferedClicks().
 *    Reads combine Url.clickCount + Redis buffer for real-time accuracy.
 *
 * Fallback: If Redis is down, _processClick falls back to a direct DB write.
 */

const geoip = require('geoip-lite');
const useragent = require('useragent');
const ClickEvent = require('../models/ClickEvent');
const Url = require('../models/Url');
const { getRedis, isAvailable } = require('../config/redis');
const logger = require('../utils/logger');

class AnalyticsService {
  // ─────────────────────────────────────────
  // PARSING HELPERS
  // ─────────────────────────────────────────

  parseUserAgent(uaString) {
    if (!uaString) {
      return {
        device: 'unknown',
        browser: 'unknown',
        browserVersion: null,
        os: 'unknown',
      };
    }

    try {
      const agent = useragent.parse(uaString);
      let device = 'desktop';

      if (/bot|crawler|spider|scraper/i.test(uaString)) {
        device = 'bot';
      } else if (
        /mobile|iphone|ipod|android.*mobile|windows phone/i.test(uaString)
      ) {
        device = 'mobile';
      } else if (/tablet|ipad|android(?!.*mobile)/i.test(uaString)) {
        device = 'tablet';
      }

      return {
        device,
        browser: agent.family || 'unknown',
        browserVersion: agent.toVersion() || null,
        os: agent.os.family || 'unknown',
      };
    } catch {
      return {
        device: 'unknown',
        browser: 'unknown',
        browserVersion: null,
        os: 'unknown',
      };
    }
  }

  lookupGeo(ip) {
    if (!ip) return { country: null, city: null, region: null };

    // Local / RFC1918 private IPs → 'Local'
    if (
      ip === '::1' ||
      ip === '127.0.0.1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
    ) {
      return { country: 'Local', city: null, region: null };
    }

    try {
      const geo = geoip.lookup(ip);
      if (!geo) return { country: null, city: null, region: null };
      return {
        country: geo.country || null,
        city: geo.city || null,
        region: geo.region || null,
      };
    } catch {
      return { country: null, city: null, region: null };
    }
  }

  // ─────────────────────────────────────────
  // CLICK RECORDING (fire-and-forget)
  // ─────────────────────────────────────────

  recordClick(shortCode, urlId, metadata = {}) {
    this._processClick(shortCode, urlId, metadata).catch((err) => {
      logger.warn(`Analytics error for ${shortCode}:`, err.message);
    });
  }

  /**
   * Process click asynchronously.
   * Does NOT increment Url.clickCount — only Redis buffer.
   */
  async _processClick(shortCode, urlId, metadata) {
    const { ip, userAgent, referer } = metadata;

    // ─────────────────────────────────────────
    // 1. FAST PATH: Redis buffer
    // ─────────────────────────────────────────
    if (isAvailable()) {
      try {
        const redis = getRedis();

        const bufferKey = `shortly:clicks:buffer:${shortCode}`;
        await redis.incr(bufferKey);
        await redis.expire(bufferKey, 3600);

        const today = new Date().toISOString().slice(0, 10);
        const dailyKey = `shortly:clicks:daily:${shortCode}:${today}`;
        await redis.incr(dailyKey);
        await redis.expire(dailyKey, 86400 * 30);
      } catch (err) {
        logger.warn(`Redis buffer failed for ${shortCode}:`, err.message);
        // Fallback DB write
        try {
          await Url.updateOne(
            { shortCode },
            {
              $inc: { clickCount: 1 },
              $set: { lastAccessedAt: new Date() },
            }
          );
        } catch (dbErr) {
          logger.warn(`Fallback DB update failed for ${shortCode}:`, dbErr.message);
        }
      }
    } else {
      try {
        await Url.updateOne(
          { shortCode },
          {
            $inc: { clickCount: 1 },
            $set: { lastAccessedAt: new Date() },
          }
        );
      } catch (err) {
        logger.warn(`Fallback DB update failed for ${shortCode}:`, err.message);
      }
    }

    // ─────────────────────────────────────────
    // 2. PERSIST: ClickEvent document
    // ─────────────────────────────────────────
    const uaData = this.parseUserAgent(userAgent);
    const geoData = this.lookupGeo(ip);

    try {
      await ClickEvent.create({
        shortCode,
        urlId,
        ip,
        userAgent,
        referer,
        ...uaData,
        ...geoData,
        clickedAt: new Date(),
      });
    } catch (err) {
      logger.warn(`ClickEvent insert failed for ${shortCode}:`, err.message);
    }
  }

  // ─────────────────────────────────────────
  // BUFFER FLUSH (background job)
  // ─────────────────────────────────────────

  async flushBufferedClicks() {
    if (!isAvailable()) {
      return { processed: 0, flushed: 0 };
    }

    const redis = getRedis();
    const result = { processed: 0, flushed: 0 };

    try {
      const pattern = 'shortly:clicks:buffer:*';
      let cursor = '0';
      const keys = [];

      do {
        const [nextCursor, foundKeys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      if (keys.length === 0) return result;

      logger.info(`📊 Flushing ${keys.length} buffered click counters...`);

      for (const key of keys) {
        const shortCode = key.replace('shortly:clicks:buffer:', '');
        try {
          let count = 0;

          if (typeof redis.getdel === 'function') {
            count = parseInt(await redis.getdel(key), 10) || 0;
          } else {
            count = parseInt(await redis.get(key), 10) || 0;
            if (count > 0) await redis.del(key);
          }

          if (count > 0) {
            await Url.updateOne(
              { shortCode },
              {
                $inc: { clickCount: count },
                $set: { lastAccessedAt: new Date() },
              }
            );
            result.flushed += count;
            logger.debug(`  └─ ${shortCode}: flushed ${count} click(s)`);
          }

          result.processed++;
        } catch (err) {
          logger.warn(`Failed to flush clicks for ${shortCode}:`, err.message);
        }
      }
    } catch (err) {
      logger.error('Click flush failed:', err.message);
    }

    return result;
  }

  // ─────────────────────────────────────────
  // REAL-TIME HELPERS
  // ─────────────────────────────────────────

  /**
   * Read pending (unflushed) clicks from Redis buffer.
   * Returns 0 if Redis unavailable.
   */
  async getPendingClicks(shortCode) {
    if (!isAvailable()) return 0;
    try {
      const value = await getRedis().get(
        `shortly:clicks:buffer:${shortCode}`
      );
      return parseInt(value, 10) || 0;
    } catch (err) {
      logger.warn(`getPendingClicks failed for ${shortCode}:`, err.message);
      return 0;
    }
  }

  /**
   * Bulk read pending clicks for multiple short codes in one round-trip.
   * Returns a map: { [shortCode]: pending }
   */
  async getPendingClicksBulk(shortCodes) {
    if (!isAvailable() || shortCodes.length === 0) {
      return {};
    }

    try {
      const keys = shortCodes.map((c) => `shortly:clicks:buffer:${c}`);
      const values = await getRedis().mget(...keys);

      const result = {};
      shortCodes.forEach((code, i) => {
        result[code] = parseInt(values[i], 10) || 0;
      });
      return result;
    } catch (err) {
      logger.warn('getPendingClicksBulk failed:', err.message);
      return {};
    }
  }

  // ─────────────────────────────────────────
  // AGGREGATION
  // ─────────────────────────────────────────

  /**
   * Get aggregated analytics for a short code (real-time).
   */
  async getClickStats(shortCode, { days = 30 } = {}) {
    const url = await Url.findOne({ shortCode })
      .select('clickCount lastAccessedAt longUrl')
      .lean();

    if (!url) return null;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totals, byDevice, byCountry, byDay, topReferers, pendingClicks] =
      await Promise.all([
        ClickEvent.countDocuments({
          shortCode,
          clickedAt: { $gte: since },
        }),

        ClickEvent.aggregate([
          { $match: { shortCode, clickedAt: { $gte: since } } },
          { $group: { _id: '$device', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        ClickEvent.aggregate([
          {
            $match: {
              shortCode,
              clickedAt: { $gte: since },
              country: { $ne: null },
            },
          },
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),

        ClickEvent.aggregate([
          { $match: { shortCode, clickedAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        ClickEvent.aggregate([
          {
            $match: {
              shortCode,
              clickedAt: { $gte: since },
              referer: { $ne: null },
            },
          },
          { $group: { _id: '$referer', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),

        this.getPendingClicks(shortCode),
      ]);

    const persistedClicks = url.clickCount || 0;
    const realTimeTotal = persistedClicks + pendingClicks;

    return {
      shortCode,
      totalClicks: realTimeTotal,
      persistedClicks,
      pendingClicks,
      clicksInPeriod: totals,
      periodDays: days,
      lastAccessedAt: url.lastAccessedAt,
      byDevice: byDevice.map((d) => ({ device: d._id, count: d.count })),
      byCountry: byCountry.map((c) => ({ country: c._id, count: c.count })),
      byDay: byDay.map((d) => ({ date: d._id, count: d.count })),
      topReferers: topReferers.map((r) => ({
        referer: r._id,
        count: r.count,
      })),
    };
  }
}

module.exports = new AnalyticsService();