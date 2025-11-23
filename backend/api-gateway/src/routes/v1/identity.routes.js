const express = require('express');
const validate = require('../../middlewares/validate');
const identityValidation = require('../../validations/identity.validation');
const identityController = require('../../controllers/identity.controller');
const auth = require('../../middlewares/auth');
const upload = require('../../middleware/upload.middleware');

const router = express.Router();

/**
 * @route   GET /v1/identity/challenge
 * @desc    Get a random liveness challenge for identity verification
 * @access  Private
 */
router.get(
  '/challenge',
  auth(),
  identityController.getVerificationChallenge
);

/**
 * @route   POST /v1/identity/verify
 * @desc    Verify identity using multi-modal verification (face, voice, document)
 * @access  Private
 */
router.post(
  '/verify',
  auth(),
  upload.fields([
    { name: 'faceVideo', maxCount: 1 },
    { name: 'voiceAudio', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 }
  ]),
  identityController.verifyIdentity
);

/**
 * @route   POST /v1/identity/register
 * @desc    Register a new user and return tokens
 * @access  Public
 */
router.post(
  '/register',
  validate(identityValidation.register),
  identityController.register
);

/**
 * @route   POST /v1/identity/login
 * @desc    Login with email/password and return access/refresh tokens
 * @access  Public
 */
router.post(
  '/login',
  validate(identityValidation.login),
  identityController.login
);

/**
 * @route   POST /v1/identity/logout
 * @desc    Logout user (blacklist refresh token)
 * @access  Public (or Private depending on strategy)
 */
router.post(
  '/logout',
  validate(identityValidation.logout),
  identityController.logout
);

/**
 * @route   POST /v1/identity/refresh-tokens
 * @desc    Refresh access token using a valid refresh token
 * @access  Public
 */
router.post(
  '/refresh-tokens',
  validate(identityValidation.refreshTokens),
  identityController.refreshTokens
);

/**
 * @route   POST /v1/identity/forgot-password
 * @desc    Send password reset email to user
 * @access  Public
 */
router.post(
  '/forgot-password',
  validate(identityValidation.forgotPassword),
  identityController.forgotPassword
);

/**
 * @route   POST /v1/identity/reset-password
 * @desc    Reset password using the token received via email
 * @access  Public
 */
router.post(
  '/reset-password',
  validate(identityValidation.resetPassword),
  identityController.resetPassword
);

/**
 * @route   POST /v1/identity/verify-email
 * @desc    Verify user's email address via token
 * @access  Public
 */
router.post(
  '/verify-email',
  validate(identityValidation.verifyEmail),
  identityController.verifyEmail
);

module.exports = router;