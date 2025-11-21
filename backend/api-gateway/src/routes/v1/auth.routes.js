const express = require('express');
const validate = require('../../middleware/validate.middleware');
const authValidation = require('../../validations/auth.validation');
const authController = require('../../controllers/auth.controller');

const router = express.Router();

// 1. Register a new user
// POST /api/v1/auth/register
router.post('/register', validate(authValidation.register), authController.register);

// 2. Login (Get Access & Refresh Tokens)
// POST /api/v1/auth/login
router.post('/login', validate(authValidation.login), authController.login);

// 3. Logout (Invalidate Refresh Token)
// POST /api/v1/auth/logout
router.post('/logout', validate(authValidation.logout), authController.logout);

// 4. Refresh Access Token
// POST /api/v1/auth/refresh-tokens
// * Used when the short-lived access token expires. 
// * The frontend sends the long-lived refresh token to get a new pair.
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);

module.exports = router;