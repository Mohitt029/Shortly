/**
 * Express Application Setup
 * Middleware configuration, routes mounting, error handling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { config } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { ApiResponse } = require('./utils/apiResponse');

const app = express();

// ============================================
// SECURITY
// ============================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ============================================
// CORS
// ============================================
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// ============================================
// BODY PARSING
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// COMPRESSION
// ============================================
app.use(compression());

// ============================================
// LOGGING
// ============================================
app.use(requestLogger);

// ============================================
// TRUST PROXY
// ============================================
app.set('trust proxy', 1);

// ============================================
// RATE LIMITING (API only — NOT redirects)
// ============================================
app.use('/api', apiLimiter);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  const { isConnected } = require('./config/database');
  const { isAvailable } = require('./config/redis');

  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    services: {
      mongodb: isConnected() ? 'connected' : 'disconnected',
      redis: isAvailable() ? 'connected' : 'disconnected',
    },
  };

  const statusCode = isConnected() ? 200 : 503;
  return res.status(statusCode).json(health);
});

// ============================================
// ROOT
// ============================================
app.get('/', (req, res) => {
  return ApiResponse.success(res, {
    name: 'Shortly API',
    version: '1.0.0',
    description: 'Production-grade URL shortener',
    documentation: '/api/v1/docs',
    health: '/health',
  }, 'Welcome to Shortly API 🚀');
});

// ============================================
// API ROUTES (/api/v1/*)
// ============================================
const routes = require('./routes');
app.use('/api/v1', routes);

// ============================================
// REDIRECT ROUTES (root level — mounted LAST)
//
// Example: GET /my-github → 302 redirect
// This MUST come after /api/v1 and /health so those
// reserved paths are not treated as short codes.
// ============================================
const redirectRoutes = require('./routes/redirectRoutes');
app.use('/', redirectRoutes);

// ============================================
// 404 & ERROR HANDLING
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;