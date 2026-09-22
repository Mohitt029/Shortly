/**
 * Authentication Middleware
 *
 * Supports two auth methods:
 * 1. JWT Bearer token: Authorization: Bearer <token>
 * 2. API key header:  X-API-Key: sk_...
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const { config } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Require authentication. Attaches req.user if valid.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;
    let authMethod = null;

    // Method 1: Bearer token
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
      authMethod = 'jwt';
    }

    // Method 2: API key
    const apiKey = req.get('X-API-Key');
    if (!token && apiKey) {
      const user = await User.findOne({ apiKey, isActive: true });
      if (!user) {
        throw new AppError('Invalid API key', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
      }
      req.user = user;
      req.authMethod = 'apikey';
      return next();
    }

    if (!token) {
      throw new AppError(
        'Authentication required. Provide a Bearer token or X-API-Key header.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Access token expired', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
      }
      throw new AppError('Invalid access token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
    }

    // Find user
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
    }

    req.user = user;
    req.authMethod = authMethod;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Optional authentication — attaches req.user if present, but doesn't fail.
 */
async function optionalAuth(req, res, next) {
  try {
    await authenticate(req, res, (err) => {
      // Ignore auth errors — user is optional
      next();
    });
  } catch (err) {
    next();
  }
}

/**
 * Require a specific role.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN));
    }
    return next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
};