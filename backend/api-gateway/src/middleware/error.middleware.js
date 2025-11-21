const httpStatus = require('http-status');
const { Sequelize } = require('sequelize');
const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

/**
 * Error Converter
 * If an error is thrown that isn't an instance of our custom 'ApiError',
 * this converts it. For example, it turns a complex Sequelize DB error 
 * into a simple "400 Bad Request".
 */
const errorConverter = (err, req, res, next) => {
  let error = err;

  // 1. Check if it's already our custom ApiError
  if (!(error instanceof ApiError)) {
    
    // Default to 500 Internal Server Error
    const statusCode =
      error.statusCode || (error instanceof Sequelize.Error ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR);
    
    // Use the error message or a default status text
    const message = error.message || httpStatus[statusCode];
    
    // Create the unified ApiError object
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

/**
 * Global Error Handler
 * This is the final function that actually sends the response to the user.
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // 1. Security: In production, don't expose internal server error details
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  // 2. Save locals (useful for template rendering if you had a frontend here)
  res.locals.errorMessage = err.message;

  // 3. Prepare the JSON response
  const response = {
    code: statusCode,
    message,
    // Only show stack trace in Development for easier debugging
    ...(config.env === 'development' && { stack: err.stack }),
  };

  // 4. Log the error using our custom Winston logger
  if (config.env === 'development') {
    logger.error(err);
  } else {
    // In production, only log unexpected errors (not simple user validation errors)
    if (!err.isOperational) {
      logger.error(err);
    }
  }

  // 5. Send response
  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};