const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');

/**
 * SMTP Transporter
 * Configured via environment variables loaded in config.js
 */
const transport = nodemailer.createTransport(config.email.smtp);

/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure SMTP options are set.'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const msg = { from: config.email.from, to, subject, text };
  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  // Ideally, point this URL to your Frontend App (React/Vue)
  // Example: https://myapp.com/reset-password?token=...
  const resetPasswordUrl = `${config.siteUrl}/reset-password?token=${token}`;
  
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  // Example: https://myapp.com/verify-email?token=...
  const verificationEmailUrl = `${config.siteUrl}/verify-email?token=${token}`;
  
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  
  await sendEmail(to, subject, text);
};

/**
 * Send grievance status update email
 * @param {string} to
 * @param {string} grievanceId
 * @param {string} status
 * @returns {Promise}
 */
const sendGrievanceStatusEmail = async (to, grievanceId, status) => {
  const subject = `Grievance #${grievanceId} Update`;
  const text = `Dear user,
The status of your grievance (ID: ${grievanceId}) has been updated to: ${status.toUpperCase()}.
Please login to the portal to view more details.`;

  await sendEmail(to, subject, text);
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendGrievanceStatusEmail,
};