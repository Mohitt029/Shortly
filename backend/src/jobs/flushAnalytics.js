/**
 * Flush Analytics Job
 * Flushes Redis click buffers to MongoDB every 60 seconds.
 */

const cron = require('node-cron');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

let task = null;

function start() {
  // Every 60 seconds
  task = cron.schedule('*/60 * * * * *', async () => {
    try {
      const result = await analyticsService.flushBufferedClicks();
      if (result.processed > 0) {
        logger.info(`📊 Analytics flush: processed=${result.processed} flushed=${result.flushed}`);
      }
    } catch (err) {
      logger.error('Analytics flush job failed:', err.message);
    }
  });

  logger.info('⏰ Flush analytics job started (every 60s)');
}

function stop() {
  if (task) {
    task.stop();
    logger.info('⏰ Flush analytics job stopped');
  }
}

module.exports = { start, stop };