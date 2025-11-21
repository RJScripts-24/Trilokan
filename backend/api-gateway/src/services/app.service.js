const mongoose = require('mongoose');
const config = require('../config/config');
const { Feedback } = require('../models'); // Assumes a Feedback model exists

/**
 * Get system health status
 * Checks Node.js uptime and MongoDB connection state
 * @returns {Object}
 */
const getSystemHealth = () => {
  // MongoDB Connection States: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

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