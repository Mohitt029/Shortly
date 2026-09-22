/**
 * Auth Service
 *
 * Handles:
 * - User registration
 * - Login + JWT signing
 * - Token refresh
 * - Logout (revoke refresh tokens)
 * - API key generation
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const { config } = require('../config/env');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user.
   *
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.email
   * @param {string} params.password
   * @returns {Promise<{ user, accessToken, refreshToken }>}
   */
  async register({ name, email, password }) {
    // Check for existing user
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError(
        'An account with this email already exists',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.USER_EXISTS
      );
    }

    // Create user (password auto-hashed by pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    // Generate API key on registration
    user.generateApiKey();
    await user.save();

    // Generate tokens
    const tokens = await this._generateTokens(user);

    logger.info(`✅ User registered: ${user.email}`, { userId: user._id });

    return {
      user: user.toPublicJSON(),
      apiKey: user.apiKey,
      ...tokens,
    };
  }

  /**
   * Login with email + password.
   */
  async login({ email, password }) {
    // Find user WITH password field
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      throw new AppError(
        'Invalid email or password',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    if (!user.isActive) {
      throw new AppError(
        'Account is deactivated',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError(
        'Invalid email or password',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokens = await this._generateTokens(user);

    logger.info(`✅ User logged in: ${user.email}`, { userId: user._id });

    return {
      user: user.toPublicJSON(),
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshTokens(refreshToken) {
    if (!refreshToken) {
      throw new AppError(
        'Refresh token is required',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      throw new AppError(
        'Invalid or expired refresh token',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Find user with refresh tokens
    const user = await User.findById(decoded.sub).select('+refreshTokens');
    if (!user || !user.isActive) {
      throw new AppError(
        'User not found or inactive',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Check if refresh token is still valid (not revoked)
    if (!user.refreshTokens.includes(refreshToken)) {
      throw new AppError(
        'Refresh token has been revoked',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Rotate: remove old, generate new
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const tokens = await this._generateTokens(user);

    return tokens;
  }

  /**
   * Logout — revoke a refresh token.
   */
  async logout(userId, refreshToken) {
    if (!refreshToken) return;

    try {
      const user = await User.findById(userId).select('+refreshTokens');
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
        await user.save();
      }
    } catch (err) {
      logger.warn('Logout token revoke failed:', err.message);
    }
  }

  /**
   * Get user profile by ID.
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.VALIDATION_ERROR);
    }
    return user.toPublicJSON();
  }

  /**
   * Regenerate API key for a user.
   */
  async regenerateApiKey(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.VALIDATION_ERROR);
    }

    user.generateApiKey();
    await user.save();

    return { apiKey: user.apiKey };
  }

  // ─────────────────────────────────────────
  // INTERNAL
  // ─────────────────────────────────────────

  /**
   * Generate access + refresh tokens and store refresh token.
   */
  async _generateTokens(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(
      { sub: user._id.toString() },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Store refresh token (limit to last 5 devices)
    const userWithTokens = await User.findById(user._id).select('+refreshTokens');
    userWithTokens.refreshTokens = [
      ...(userWithTokens.refreshTokens || []).slice(-4),
      refreshToken,
    ];
    await userWithTokens.save();

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();