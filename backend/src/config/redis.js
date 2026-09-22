/**
 * Redis Client (ioredis)
 * Cache layer with reconnection and error handling
 */

const Redis = require('ioredis');
const { config } = require('./env');
const logger = require('../utils/logger');

let redisClient = null;
let isRedisAvailable = false;

/**
 * Initialize Redis client
 */
function initRedis() {
  if (redisClient) return redisClient;

  const redisOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error('❌ Redis: Max retries reached, giving up');
        return null;
      }
      const delay = Math.min(times * 200, 3000);
      logger.warn(`🔄 Redis: Retry attempt ${times} in ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    showFriendlyErrorStack: config.env === 'development',
  };

  // Use REDIS_URL if available (for cloud Redis like Upstash)
  if (config.redis.url && config.redis.url.startsWith('redis')) {
    redisClient = new Redis(config.redis.url, redisOptions);
  } else {
    redisClient = new Redis(redisOptions);
  }

  // Event handlers
  redisClient.on('connect', () => {
    logger.info('🔌 Redis: Connecting...');
  });

  redisClient.on('ready', () => {
    isRedisAvailable = true;
    logger.info('✅ Redis: Ready to accept commands');
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    logger.error('❌ Redis error:', err.message);
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
    logger.warn('⚠️  Redis: Connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('🔄 Redis: Reconnecting...');
  });

  redisClient.on('end', () => {
    isRedisAvailable = false;
    logger.warn('⚠️  Redis: Connection ended');
  });

  return redisClient;
}

/**
 * Get Redis client (initializes if needed)
 */
function getRedis() {
  if (!redisClient) return initRedis();
  return redisClient;
}

/**
 * Check Redis availability
 */
function isAvailable() {
  return isRedisAvailable && redisClient?.status === 'ready';
}

/**
 * Graceful shutdown
 */
async function closeRedis() {
  if (!redisClient) return;
  try {
    await redisClient.quit();
    logger.info('🔌 Redis: Disconnected gracefully');
  } catch (err) {
    logger.error('❌ Redis disconnect error:', err.message);
  }
}

process.on('SIGINT', async () => {
  await closeRedis();
});

module.exports = {
  initRedis,
  getRedis,
  isAvailable,
  closeRedis,
};