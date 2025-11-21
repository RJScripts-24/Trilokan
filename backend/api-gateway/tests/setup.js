const mongoose = require('mongoose');
const config = require('../src/config/config');

// 1. Force the environment to be 'test'
// This ensures your 'config' loads the correct variables (like using a test DB instead of prod DB)
process.env.NODE_ENV = 'test';

// 2. Increase Default Timeout
// Integration tests involving MongoDB or Hashing files can take longer than the default 5000ms
jest.setTimeout(30000); // 30 seconds

// 3. Handle Unhandled Rejections
// Ensures that if a Promise fails without a catch block, we see it in the logs
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Tests:', reason);
  // Optionally force the process to exit or fail
  // process.exit(1);
});

// 4. Optional: Mongoose Configuration for Tests
// Ensure Mongoose uses the standard Promise library
mongoose.Promise = global.Promise;

// 5. Optional: Mock Logger to keep test output clean
// This prevents 'info' logs from cluttering your terminal while running tests,
// but keeps 'error' logs visible.
/*
const logger = require('../src/config/logger');
logger.info = jest.fn();
logger.warn = jest.fn();
logger.debug = jest.fn();
*/