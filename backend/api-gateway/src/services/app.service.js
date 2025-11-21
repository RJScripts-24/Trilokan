const config = require('../config/config');
const { Feedback, sequelize } = require('../models');

/**
/**
 * Get system health status
 * Checks Node.js uptime and PostgreSQL connection state
 * @returns {Promise<Object>}
 */
const getSystemHealth = async () => {
  let isDbConnected = false;
  try {
    await sequelize.authenticate();
    isDbConnected = true;
  } catch (err) {
    isDbConnected = false;
  }
  return {
    status: isDbConnected ? 'UP' : 'DOWN',
    uptime: process.uptime(),
    timestamp: new Date(),
    system: {
      database: isDbConnected ? 'connected' : 'disconnected',
      version: process.version,
      memoryUsage: process.memoryUsage(),
    },
  };
};

/**
 * Get application configuration
 * Used by frontend/mobile apps to toggle features dynamically
 * @returns {Object}
 */
const getAppConfig = () => {
  return {
    env: config.env,
    minClientVersion: '1.0.0', // Force update logic
    maintenanceMode: false,    // Global kill-switch
    supportEmail: 'support@example.com',
    features: {
      enableDarkTheme: true,
      enablePushNotifications: true,
      enableGrievanceUploads: true,
    },
  };
};

/**
 * Get system enums
 * Centralizes constants so frontend and backend stay in sync
 * @returns {Object}
 */
const getEnums = () => {
  return {
    roles: ['user', 'admin', 'staff'],
    grievanceStatus: ['pending', 'in_progress', 'resolved', 'rejected'],
    grievanceCategories: ['technical', 'billing', 'service', 'other'],
    languages: ['en', 'es', 'fr', 'de'],
  };
};

/**
 * Create user feedback
 * @param {Object} feedbackBody
 * @param {string} userId
 * @returns {Promise<Feedback>}
 */
const createFeedback = async (feedbackBody, userId) => {
  // We inject the userId here to ensure authenticity
  const feedback = await Feedback.create({
    ...feedbackBody,
    user: userId,
  });
  return feedback;
};

module.exports = {
  getSystemHealth,
  getAppConfig,
  getEnums,
  createFeedback,
};