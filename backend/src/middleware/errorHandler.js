/**
 * Global Error Handler Middleware
 * Catches all errors and returns standardized responses
 */

const { ApiResponse, AppError } = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');
const { config } = require('../config/env');

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  next(new AppError(`Route ${req.originalUrl} not found`, HTTP_STATUS.NOT_FOUND));
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error: ${err.message}`, {
    statusCode: err.statusCode || 500,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: config.env === 'development' ? err.stack : undefined,
  });

  // Mongoose: Bad ObjectId
  if (err.name === 'CastError') {
    error = new AppError('Invalid resource ID', HTTP_STATUS.BAD_REQUEST);
  }

  // Mongoose: Duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(
      `Duplicate value for field: ${field}`,
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.SHORT_CODE_EXISTS
    );
  }

  // Mongoose: Validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new AppError('Validation failed', HTTP_STATUS.UNPROCESSABLE, ERROR_CODES.VALIDATION_ERROR);
    error.errors = errors;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }

  // Send response
  return ApiResponse.error(
    res,
    error.message || 'Internal Server Error',
    error.statusCode || HTTP_STATUS.INTERNAL_ERROR,
    error.errors || null
  );
}

/**
 * Async wrapper to catch errors from async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, notFoundHandler, asyncHandler };