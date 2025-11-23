const dotenv = require('dotenv');
const path = require('path');

// 1. Load environment variables from the .env file located in the root
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  // Core Server Config
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000', // Used for CORS

  // Database Config (PostgreSQL)
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'trilokan_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    // Optional: Connection pool settings for scalability
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },

  // JWT Configuration (For Auth Middleware)
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 30,
    refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS || 30,
  },

  // ⚠️ External Services (Crucial for TrustGuard Architecture)
  // This connects your Node gateway to the Python AI Microservice
  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://localhost:5000',
    apiKey: process.env.ML_SERVICE_API_KEY, // Optional: to secure inter-service comms
  },

  // Email Configuration (For Grievance Alerts & Verify Links)
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM || '"TrustGuard Support" <noreply@trustguard.com>',
  },
};