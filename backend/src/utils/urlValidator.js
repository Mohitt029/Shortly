/**
 * URL Validator & Canonicalizer
 *
 * Responsibilities:
 * 1. Validate URL structure (protocol, domain)
 * 2. Canonicalize (normalize) URL to avoid duplicates
 * 3. Block malicious/private URLs (SSRF prevention)
 */

const { URL } = require('url');
const { AppError } = require('./apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Block private/internal IPs (SSRF protection)
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,       // IPv6 localhost
  /^\[?fc00:/i,        // IPv6 private
  /^\[?fe80:/i,        // IPv6 link-local
  /\.local$/i,         // .local domains
];

/**
 * Validate a URL string.
 * @param {string} urlString
 * @throws {AppError} if invalid
 * @returns {URL} Parsed URL object
 */
function validateUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    throw new AppError('URL is required and must be a string', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_URL);
  }

  const trimmed = urlString.trim();

  if (trimmed.length === 0) {
    throw new AppError('URL cannot be empty', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_URL);
  }

  if (trimmed.length > 2048) {
    throw new AppError('URL is too long (max 2048 characters)', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_URL);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch (err) {
    throw new AppError(`Invalid URL format: ${err.message}`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_URL);
  }

  // Protocol check
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    throw new AppError(
      `Unsupported protocol: ${parsedUrl.protocol}. Only http and https are allowed.`,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_URL
    );
  }

  // Hostname check
  if (!parsedUrl.hostname || parsedUrl.hostname.length < 3) {
    throw new AppError('Invalid hostname', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_URL);
  }

  // Block private IPs / internal hosts
  for (const pattern of PRIVATE_HOST_PATTERNS) {
    if (pattern.test(parsedUrl.hostname)) {
      throw new AppError(
        'URLs pointing to private/internal networks are not allowed',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_URL
      );
    }
  }

  // Reject URLs without a dot in hostname (e.g., "http://somehost/path")
  // Exception: allow IP addresses (already filtered for private ones above)
  if (!parsedUrl.hostname.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(parsedUrl.hostname)) {
    throw new AppError('Hostname must contain a dot (e.g., example.com)', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_URL);
  }

  return parsedUrl;
}

/**
 * Canonicalize (normalize) a URL to reduce duplicates.
 *
 * Examples:
 *   https://Example.COM/path/     → https://example.com/path
 *   https://example.com:443/path  → https://example.com/path
 *   http://example.com:80/path    → http://example.com/path
 *   https://example.com/path?b=2&a=1 → https://example.com/path?a=1&b=2
 *
 * @param {string} urlString
 * @returns {string} Canonical URL
 */
function canonicalize(urlString) {
  const parsed = validateUrl(urlString);

  // Lowercase protocol + hostname
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  // Remove default ports
  if (
    (parsed.protocol === 'http:' && parsed.port === '80') ||
    (parsed.protocol === 'https:' && parsed.port === '443')
  ) {
    parsed.port = '';
  }

  // Remove trailing slash (except for root path)
  if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  // Sort query params alphabetically (for consistency)
  if (parsed.search) {
    const params = new URLSearchParams(parsed.search);
    const sorted = new URLSearchParams([...params.entries()].sort());
    parsed.search = sorted.toString();
  }

  // Remove hash (fragment) — doesn't affect server-side content
  parsed.hash = '';

  return parsed.toString();
}

/**
 * Extract domain from a URL.
 */
function extractDomain(urlString) {
  const parsed = new URL(urlString);
  return parsed.hostname;
}

module.exports = {
  validateUrl,
  canonicalize,
  extractDomain,
};