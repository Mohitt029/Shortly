/**
 * Jobs Index
 * Starts all background jobs on server startup.
 */

const flushAnalytics = require('./flushAnalytics');
const cleanupExpired = require('./cleanupExpired');
const logger = require('../utils/logger');

function startAll() {
  logger.info('🚀 Starting background jobs...');
  flushAnalytics.start();
  cleanupExpired.start();
  logger.info('✅ All background jobs started');
}

function stopAll() {
  flushAnalytics.stop();
  cleanupExpired.stop();
}

module.exports = { startAll, stopAll };