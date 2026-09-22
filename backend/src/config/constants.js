/**
 * Application Constants
 * Centralized configuration values used across the app
 */

module.exports = {
  // HTTP Status Codes
   // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    MOVED_PERMANENTLY: 301,   // ← add this
    FOUND: 302,               // ← ADD THIS (302 for redirects)
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    GONE: 410,
    UNPROCESSABLE: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // Error Codes (for API responses)
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_URL: 'INVALID_URL',
    SHORT_CODE_EXISTS: 'SHORT_CODE_EXISTS',
    SHORT_CODE_NOT_FOUND: 'SHORT_CODE_NOT_FOUND',
    URL_EXPIRED: 'URL_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    USER_EXISTS: 'USER_EXISTS',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },

  // URL Shortening Config
  SHORT_CODE: {
    LENGTH: 7,
    MAX_CUSTOM_LENGTH: 16,
    MIN_CUSTOM_LENGTH: 3,
    ALPHABET: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    RESERVED_WORDS: [
      'api', 'admin', 'login', 'signup', 'register', 'dashboard',
      'analytics', 'profile', 'settings', 'help', 'about', 'contact',
      'terms', 'privacy', 'auth', 'urls', 'url', 'static', 'assets',
      'public', 'health', 'status', 'docs', 'swagger', 'favicon.ico',
    ],
  },

  // Cache Keys & TTL (in seconds)
  CACHE: {
    PREFIX: {
      URL: 'shortly:url:',
      USER: 'shortly:user:',
      ANALYTICS: 'shortly:analytics:',
      RATE_LIMIT: 'shortly:ratelimit:',
      COUNTER: 'shortly:counter:',
    },
    TTL: {
      URL_DEFAULT: 86400,     // 24 hours
      URL_HOT: 604800,        // 7 days for frequently accessed
      USER_SESSION: 604800,   // 7 days
      ANALYTICS_SHORT: 300,   // 5 minutes
      RATE_LIMIT: 900,        // 15 minutes
    },
  },

  // Redirect Type (302 for analytics tracking)
  REDIRECT: {
    STATUS_CODE: 302,
    PERMANENT_CODE: 301,
  },

  // Analytics
  ANALYTICS: {
    BATCH_SIZE: 100,
    FLUSH_INTERVAL_MS: 60000, // 1 minute
  },

  // User Roles
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin',
  },

  // Snowflake ID
  SNOWFLAKE: {
    EPOCH: 1704067200000,        // Jan 1, 2024
    WORKER_ID_BITS: 10,
    DATACENTER_ID_BITS: 5,
    SEQUENCE_BITS: 12,
    MAX_WORKER_ID: 1023,
    MAX_DATACENTER_ID: 31,
    MAX_SEQUENCE: 4095,
  },
};