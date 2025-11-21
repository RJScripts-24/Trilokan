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

module.exports = {
  submitFeedback,
  getAppConfig,
};