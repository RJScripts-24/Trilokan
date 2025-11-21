const winston = require('winston');
const config = require('./config');

// 1. Define a custom format to handle Error objects specifically
// (Otherwise, logging an error often just gives you the message, missing the stack trace)
const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.message, stack: info.stack });
  }
  return info;
});

// 2. Create the Logger instance
const logger = winston.createLogger({
  // In development, log everything (debug and above).
  // In production, only log important info (info and above).
  level: config.env === 'development' ? 'debug' : 'info',
  
  format: winston.format.combine(
    enumerateErrorFormat(),
    config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.printf(({ level, message }) => `${level}: ${message}`)
  ),
  
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'], // Send errors to stderr (standard error)
    }),
  ],
});

module.exports = logger;