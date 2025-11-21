/**
 * Wraps an async function and catches any errors, passing them to the next middleware.
 * This eliminates the need for try-catch blocks in every controller.
 *
 * @param {Function} requestHandler - The async controller function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

module.exports = asyncHandler;