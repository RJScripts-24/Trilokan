const Joi = require('joi');

const submitFeedback = {
  body: Joi.object().keys({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.min': 'Rating must be at least 1 star',
      'number.max': 'Rating cannot exceed 5 stars',
    }),
    comment: Joi.string().required().min(5).max(1000).trim().messages({
      'string.empty': 'Comment cannot be empty',
      'string.min': 'Comment must be at least 5 characters long',
      'string.max': 'Comment is too long (max 1000 characters)',
    }),
    category: Joi.string()
      .valid('bug', 'feature_request', 'general', 'service')
      .default('general'),
    // Optional: Capture device info if sent in body (though usually headers are used)
    deviceInfo: Joi.object().keys({
      platform: Joi.string().valid('ios', 'android', 'web'),
      version: Joi.string(),
    }).optional(),
  }),
};

// Optional: If you want to strictly validate query params for config
// e.g., GET /v1/app/config?platform=ios&version=1.0.0
const getAppConfig = {
  query: Joi.object().keys({
    platform: Joi.string().valid('ios', 'android', 'web').optional(),
    appVersion: Joi.string().optional(),
  }),
};

/**
 * Validation for verifying app by package name or Play Store link
 */
const verifyPackage = {
  body: Joi.object().keys({
    packageName: Joi.string().trim().optional().messages({
      'string.empty': 'Package name cannot be empty',
    }),
    playstoreLink: Joi.string().uri().trim().optional().messages({
      'string.uri': 'Play Store link must be a valid URL',
    }),
  }).or('packageName', 'playstoreLink').messages({
    'object.missing': 'Either packageName or playstoreLink must be provided',
  }),
};

/**
 * Validation for reporting suspicious app
 */
const reportSuspicious = {
  body: Joi.object().keys({
    appName: Joi.string().required().trim().min(2).max(100).messages({
      'string.empty': 'App name is required',
      'string.min': 'App name must be at least 2 characters',
      'string.max': 'App name cannot exceed 100 characters',
    }),
    packageName: Joi.string().trim().optional(),
    playstoreLink: Joi.string().uri().trim().optional(),
    reason: Joi.string().required().min(10).max(1000).trim().messages({
      'string.empty': 'Reason is required',
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason cannot exceed 1000 characters',
    }),
    description: Joi.string().optional().max(2000).trim(),
  }),
};

module.exports = {
  submitFeedback,
  getAppConfig,
  verifyPackage,
  reportSuspicious,
};