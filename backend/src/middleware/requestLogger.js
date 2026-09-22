/**
 * Request Logger Middleware
 * Logs HTTP requests with timing information
 */

const morgan = require('morgan');
const logger = require('../utils/logger');
const { config } = require('../config/env');

// Custom Morgan token for response time in ms
morgan.token('response-time-ms', (req, res) => {
  if (!res._header || !req._startAt) return '';
  const diff = process.hrtime(req._startAt);
  const ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms.toFixed(2);
});

// Development: colored and concise
const devFormat = ':method :url :status :response-time-ms ms - :res[content-length]';

// Production: detailed JSON
const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
});

const morganMiddleware = morgan(
  config.env === 'development' ? devFormat : prodFormat,
  { stream: logger.stream }
);

module.exports = morganMiddleware;