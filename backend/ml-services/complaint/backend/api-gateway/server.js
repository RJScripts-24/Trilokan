const app = require('./app');
const config = require('./src/config/config');
const logger = require('./src/config/logger');
const { sequelize } = require('./src/models');

let server;

/**
 * Start Server Logic
 * 1. Connects to PostgreSQL via Sequelize
 * 2. Starts the Express HTTP Server
 */
const startServer = async () => {
  try {
    // Authenticate with the Database
    await sequelize.authenticate();
    logger.info('Connected to PostgreSQL via Sequelize');

    // Optional: Sync models (Not recommended for production, use migrations instead)
    // await sequelize.sync(); 

    server = app.listen(config.port, () => {
      logger.info(`Listening to port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

/**
 * Exit Handler
 * Gracefully closes the server and database connections
 */
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

// Handle uncaught errors to prevent the server from running in an unstable state
process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

// Handle termination signals (e.g., Docker stopping the container)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed due to SIGTERM');
    });
  }
});