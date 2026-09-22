/**
 * Cleanup Expired URLs Job
 * Deletes expired URLs from MongoDB every day at 3:00 AM.
 *
 * Also invalidates cache for each deleted URL.
 */

const cron = require('node-cron');
const Url = require('../models/Url');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

let task = null;

async function runCleanup() {
  try {
    const now = new Date();

    // Find expired URLs (beyond a grace period of 1 hour)
    const graceThreshold = new Date(now.getTime() - 60 * 60 * 1000);

    const expired = await Url.find({
      expiresAt: { $ne: null, $lt: graceThreshold },
    }).select('shortCode').lean();

    if (expired.length === 0) {
      logger.debug('🧹 Cleanup: no expired URLs found');
      return;
    }

    logger.info(`🧹 Cleanup: found ${expired.length} expired URLs`);

    // Invalidate cache in parallel
    await Promise.all(
      expired.map((u) => cacheService.invalidateUrl(u.shortCode))
    );

    // Delete from DB
    const codes = expired.map((u) => u.shortCode);
    const result = await Url.deleteMany({ shortCode: { $in: codes } });

    logger.info(`🧹 Cleanup: deleted ${result.deletedCount} expired URLs`);
  } catch (err) {
    logger.error('Cleanup job failed:', err.message);
  }
}

function start() {
  // Every day at 3:00 AM
  task = cron.schedule('0 3 * * *', async () => {
    logger.info('🧹 Running daily cleanup job...');
    await runCleanup();
  });

  logger.info('⏰ Cleanup expired URLs job started (daily at 3 AM)');
}

function stop() {
  if (task) {
    task.stop();
    logger.info('⏰ Cleanup job stopped');
  }
}

module.exports = { start, stop, runCleanup };