/**
 * Standardized API Response Helper
 * Consistent response format across all endpoints
 */

const { HTTP_STATUS } = require('../config/constants');

class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  static success(res, data, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static created(res, data, message = 'Created successfully') {
    return ApiResponse.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static error(res, message = 'Something went wrong', statusCode = HTTP_STATUS.INTERNAL_ERROR, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  static badRequest(res, message = 'Bad request', errors = null) {
    return ApiResponse.error(res, message, HTTP_STATUS.BAD_REQUEST, errors);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return ApiResponse.error(res, message, HTTP_STATUS.UNAUTHORIZED);
  }

  static forbidden(res, message = 'Forbidden') {
    return ApiResponse.error(res, message, HTTP_STATUS.FORBIDDEN);
  }

  static notFound(res, message = 'Resource not found') {
    return ApiResponse.error(res, message, HTTP_STATUS.NOT_FOUND);
  }

  static conflict(res, message = 'Resource already exists') {
    return ApiResponse.error(res, message, HTTP_STATUS.CONFLICT);
  }

  static gone(res, message = 'Resource has expired') {
    return ApiResponse.error(res, message, HTTP_STATUS.GONE);
  }
}

/**
 * Custom Error Class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_ERROR, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { ApiResponse, AppError };