/**
 * Auth Controller
 * HTTP handlers for /api/v1/auth/*
 */

const authService = require('../services/authService');
const { ApiResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const result = await authService.register({ name, email, password });

  return ApiResponse.created(
    res,
    {
      user: result.user,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      api_key: result.apiKey,
    },
    'Account created successfully'
  );
});

/**
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  return ApiResponse.success(
    res,
    {
      user: result.user,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    },
    'Logged in successfully'
  );
});

/**
 * POST /api/v1/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  const tokens = await authService.refreshTokens(refresh_token);

  return ApiResponse.success(res, tokens, 'Tokens refreshed');
});

/**
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (req.user?._id) {
    await authService.logout(req.user._id, refresh_token);
  }

  return ApiResponse.success(res, null, 'Logged out successfully');
});

/**
 * GET /api/v1/auth/me
 */
const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  return ApiResponse.success(res, user, 'Profile retrieved');
});

/**
 * POST /api/v1/auth/api-key/regenerate
 */
const regenerateApiKey = asyncHandler(async (req, res) => {
  const result = await authService.regenerateApiKey(req.user._id);
  return ApiResponse.success(res, result, 'API key regenerated');
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  regenerateApiKey,
};