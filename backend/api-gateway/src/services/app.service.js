const config = require('../config/config');
const { Feedback, App, sequelize } = require('../models');
const logger = require('../config/logger');

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

/**
 * Get app by file hash
 * @param {string} fileHash - SHA256 hash of the app file
 * @returns {Promise<App|null>}
 */
const getAppByHash = async (fileHash) => {
  try {
    const app = await App.findOne({ where: { fileHash } });
    return app;
  } catch (error) {
    logger.error(`Error finding app by hash: ${error.message}`);
    return null;
  }
};

/**
 * Get app by package name
 * @param {string} packageName - Package name (e.g., com.bank.mobile)
 * @returns {Promise<App|null>}
 */
const getAppByPackageName = async (packageName) => {
  try {
    const app = await App.findOne({ where: { packageName } });
    return app;
  } catch (error) {
    logger.error(`Error finding app by package name: ${error.message}`);
    return null;
  }
};

/**
 * Create verification audit trail
 * @param {Object} auditData
 * @returns {Promise<void>}
 */
const createVerificationAudit = async (auditData) => {
  try {
    // Log to database or external audit system
    logger.info('App Verification Audit', {
      ...auditData,
      timestamp: new Date().toISOString(),
    });

    // In production, this would write to an audit table or external service
    // For now, we're just logging it
    // await AuditLog.create({ type: 'APP_VERIFICATION', data: auditData });
  } catch (error) {
    logger.error(`Error creating verification audit: ${error.message}`);
    throw error;
  }
};

/**
 * Create package verification audit trail
 * @param {Object} auditData
 * @returns {Promise<void>}
 */
const createPackageVerificationAudit = async (auditData) => {
  try {
    logger.info('Package Verification Audit', {
      ...auditData,
      timestamp: new Date().toISOString(),
    });

    // In production, write to audit table
    // await AuditLog.create({ type: 'PACKAGE_VERIFICATION', data: auditData });
  } catch (error) {
    logger.error(`Error creating package verification audit: ${error.message}`);
    throw error;
  }
};

/**
 * Create app report for suspicious apps
 * @param {Object} reportData
 * @returns {Promise<Object>}
 */
const createAppReport = async (reportData) => {
  try {
    logger.info('Suspicious App Report', {
      ...reportData,
      timestamp: new Date().toISOString(),
    });

    // In production, write to reports table
    // const report = await AppReport.create(reportData);
    // return report;
    
    return { id: Date.now(), ...reportData };
  } catch (error) {
    logger.error(`Error creating app report: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getSystemHealth,
  getAppConfig,
  getEnums,
  createFeedback,
  getAppByHash,
  getAppByPackageName,
  createVerificationAudit,
  createPackageVerificationAudit,
  createAppReport,
};