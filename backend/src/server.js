/**
 * Server Entry Point
 * Initializes DB, Redis, and starts Express server
 */

require('dotenv').config();

const app = require('./app');
const { config, validateEnv } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { initRedis, closeRedis } = require('./config/redis');
const logger = require('./utils/logger');

// Validate environment before starting
validateEnv();

let server;

async function startServer() {
  try {
    logger.info('🚀 Starting Shortly API...');
    logger.info(`🌍 Environment: ${config.env}`);

    // 1. Connect to MongoDB Atlas
    await connectDatabase();

    // 2. Initialize Redis
    try {
      initRedis();
      logger.info('✅ Redis initialized');
    } catch (err) {
      logger.warn('⚠️  Redis failed to initialize. Continuing without cache.');
    }

    // 3. Start background jobs
    try {
      const jobs = require('./jobs');
      jobs.startAll();
    } catch (err) {
      logger.warn('Background jobs failed to start:', err.message);
    }

    // 4. Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`✅ Server running on port ${config.port}`);
      logger.info(`🔗 http://localhost:${config.port}`);
      logger.info(`💚 Health: http://localhost:${config.port}/health`);
      logger.info('═'.repeat(60));
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
async function shutdown(signal) {
  logger.info(`\n⚠️  Received ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info('🔌 HTTP server closed');

      // Stop background jobs
      try {
        const jobs = require('./jobs');
        jobs.stopAll();
      } catch (err) {
        logger.warn('Failed to stop background jobs:', err.message);
      }

      await disconnectDatabase();
      await closeRedis();
      logger.info('👋 Shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', { promise, reason: reason?.message || reason });
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

// Start the server
startServer();

module.exports = server;