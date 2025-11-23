const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { setUserContext } = require('./correlation.middleware');

/**
 * Custom Callback for Passport
 * This runs after the JWT strategy attempts to verify the token.
 */
const verifyCallback = (req, resolve, reject, requiredRoles) => async (err, user, info) => {
  // 1. Check for basic errors or missing user
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }

  // 2. Attach user to the request object
  // Now your controllers can access `req.user`
  req.user = user;

  // 3. Update correlation context with user info
  setUserContext(req, user);

  // 4. Role-Based Access Control (RBAC)
  // If the route requires specific roles (e.g., ['admin', 'official'])
  // we check if the logged-in user has one of those roles.
  if (requiredRoles.length) {
    // Assuming user.role is stored in DB (e.g., 'user', 'admin', 'official')
    if (!requiredRoles.includes(user.role)) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not have the required role'));
    }
  }

  resolve();
};

/**
 * Auth Middleware
 * Usage: 
 * - router.get('/profile', auth(), userController.getProfile);
 * - router.get('/admin', auth('admin'), userController.getAdminData);
 */
const auth = (...requiredRoles) => async (req, res, next) => {
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRoles))(req, res, next);
  })
    .then(() => next())
    .catch((err) => next(err));
};

module.exports = auth;