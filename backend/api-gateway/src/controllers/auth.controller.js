const httpStatus = require('http-status');
const catchAsync = require('../utils/asyncHandler');
const { authService, userService, tokenService, emailService } = require('../services');

/**
 * Register a new user (TrustGuard Sign Up)
 * POST /api/v1/auth/register
 */
const register = catchAsync(async (req, res) => {
  // 1. Create the user in Postgres
  const user = await userService.createUser(req.body);
  
  // 2. Generate JWT tokens (Access & Refresh)
  const tokens = await tokenService.generateAuthTokens(user);
  
  // 3. Send response
  res.status(httpStatus.CREATED).send({ user, tokens });
});

/**
 * Login with Email & Password
 * POST /api/v1/auth/login
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  // 1. Verify credentials
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  
  // 2. Generate new tokens
  const tokens = await tokenService.generateAuthTokens(user);
  
  // 3. Send response
  res.send({ user, tokens });
});

/**
 * Logout User
 * POST /api/v1/auth/logout
 */
const logout = catchAsync(async (req, res) => {
  // Invalidate the refresh token (remove it from DB)
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh-tokens
 * (Used when the short-lived access token expires)
 */
const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
};