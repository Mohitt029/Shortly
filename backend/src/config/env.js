/**
 * Environment Variables Validator
 * Ensures all required env vars are present at startup
 */

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  // Warn about insecure defaults in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET.includes('change_in_production')) {
      console.error('❌ Insecure JWT_SECRET in production!');
      process.exit(1);
    }
  }

  console.log('✅ Environment variables validated');
}

module.exports = {
  validateEnv,
  config: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    apiVersion: process.env.API_VERSION || 'v1',
    baseUrl: process.env.BASE_URL || 'http://localhost:5000',
    shortUrlDomain: process.env.SHORT_URL_DOMAIN || 'http://localhost:5000',

    mongodb: {
      uri: process.env.MONGODB_URI,
    },

    redis: {
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB, 10) || 0,
    },

    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },

    shortCode: {
      length: parseInt(process.env.SHORT_CODE_LENGTH, 10) || 7,
      maxCustomLength: parseInt(process.env.MAX_CUSTOM_ALIAS_LENGTH, 10) || 16,
      alphabet: process.env.BASE62_ALPHABET || '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },

    snowflake: {
      epoch: parseInt(process.env.SNOWFLAKE_EPOCH, 10) || 1704067200000,
      workerId: parseInt(process.env.SNOWFLAKE_WORKER_ID, 10) || 1,
      datacenterId: parseInt(process.env.SNOWFLAKE_DATACENTER_ID, 10) || 1,
    },

    cache: {
      defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 86400,
      maxTtl: parseInt(process.env.CACHE_MAX_TTL, 10) || 604800,
    },

    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    },

    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
    },

    logLevel: process.env.LOG_LEVEL || 'info',
    logDir: process.env.LOG_DIR || 'logs',
  },
};