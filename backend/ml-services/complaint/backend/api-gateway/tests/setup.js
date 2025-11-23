// 1. Force the environment to be 'test'
process.env.NODE_ENV = 'test';

// 2. Increase Default Timeout
jest.setTimeout(30000); // 30 seconds

// 3. Handle Unhandled Rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Tests:', reason);
});

// 4. Optional: Mock Logger to keep test output clean
/*
const logger = require('../src/config/logger');
logger.info = jest.fn();
logger.warn = jest.fn();
logger.debug = jest.fn();
*/