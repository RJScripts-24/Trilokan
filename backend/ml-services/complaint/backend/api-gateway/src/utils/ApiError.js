class ApiError extends Error {
  /**
   * Create a custom API Error
   * @param {number} statusCode - HTTP status code (e.g. 404, 401, 500)
   * @param {string} message - Error message to display
   * @param {boolean} [isOperational=true] - Determines if the error is a known operational error (true) or a programming bug (false)
   * @param {string} [stack=''] - Optional stack trace
   */
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      // Captures the stack trace where this error was instantiated
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;