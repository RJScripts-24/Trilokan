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

// 2. Custom format for structured logging with correlation IDs
const structuredFormat = winston.format.printf((info) => {
  const { level, message, timestamp, requestId, ...meta } = info;
  
  // Base log structure
  let log = `[${timestamp}]`;
  
  // Add request ID for tracing
  if (requestId) {
    log += ` [${requestId}]`;
  }
  
  // Add log level
  log += ` ${level}:`;
  
  // Add message
  if (typeof message === 'string') {
    log += ` ${message}`;
  } else {
    log += ` ${JSON.stringify(message)}`;
  }
  
  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  
  return log;
});

// 3. Create the Logger instance with enhanced formatting
const logger = winston.createLogger({
  // In development, log everything (debug and above).
  // In production, only log important info (info and above).
  level: config.env === 'development' ? 'debug' : 'info',
  
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    enumerateErrorFormat(),
    config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.splat(),
    structuredFormat
  ),
  
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'], // Send errors to stderr (standard error)
    }),
    // Add file transport for production
    ...(config.env === 'production' ? [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
});

module.exports = logger;