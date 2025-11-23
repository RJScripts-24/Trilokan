const express = require('express');
const appController = require('../../controllers/app.controller');
const validate = require('../../middlewares/validate');
const appValidation = require('../../validations/app.validation');
const auth = require('../../middlewares/auth');
const upload = require('../../middleware/upload.middleware');

const router = express.Router();

/**
 * @route   GET /v1/app/health
 * @desc    Check the health status of the API (Database connection, Uptime)
 * Used by Load Balancers (AWS ELB/Kubernetes)
 * @access  Public
 */
router.get(
  '/health',
  appController.healthCheck
);

/**
 * @route   GET /v1/app/config
 * @desc    Get global application configuration
 * (e.g., Min app version required, maintenance mode status, support email)
 * @access  Public
 */
router.get(
  '/config',
  appController.getAppConfig
);

/**
 * @route   POST /v1/app/feedback
 * @desc    Submit general application feedback or bug reports
 * @access  Private (Requires user to be logged in)
 */
router.post(
  '/feedback',
  auth(),
  validate(appValidation.submitFeedback),
  appController.submitFeedback
);

/**
 * @route   GET /v1/app/enums
 * @desc    Get system-wide enums/constants (e.g., list of supported countries, user roles)
 * Helps frontend dropdowns stay in sync with backend
 * @access  Public
 */
router.get(
  '/enums',
  appController.getEnums
);

/**
 * @route   POST /v1/apps/verify-file
 * @desc    Verify an APK file by uploading it for analysis
 * @access  Private (Requires authentication)
 */
router.post(
  '/verify-file',
  auth(),
  upload.single('appFile'),
  appController.verifyAppFile
);

/**
 * @route   POST /v1/apps/verify-package
 * @desc    Verify an app by its package name or Play Store link
 * @access  Private (Requires authentication)
 */
router.post(
  '/verify-package',
  auth(),
  validate(appValidation.verifyPackage),
  appController.verifyAppPackage
);

/**
 * @route   POST /v1/apps/report
 * @desc    Report a suspicious app for investigation
 * @access  Private (Requires authentication)
 */
router.post(
  '/report',
  auth(),
  validate(appValidation.reportSuspicious),
  appController.reportSuspiciousApp
);

module.exports = router;