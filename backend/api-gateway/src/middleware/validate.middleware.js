const Joi = require('joi');
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');

/**
 * Validation Middleware
 * Usage: router.post('/register', validate(authValidation.register), authController.register);
 * * @param {Object} schema - The Joi validation schema (body, query, params)
 */
const validate = (schema) => (req, res, next) => {
  // 1. Select the parts of the request that the schema defines rules for
  // (e.g., if schema only has 'body', we ignore 'query' and 'params')
  const validSchema = pick(schema, ['params', 'query', 'body']);
  
  // 2. Select the actual data from the request
  const object = pick(req, Object.keys(validSchema));

  // 3. Compile and Run the Validation
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false }) // abortEarly: false -> show ALL errors, not just the first one
    .validate(object);

  if (error) {
    // 4. Clean up the error message
    // Joi returns complex objects; we map them into a simple string
    const errorMessage = error.details.map((details) => details.message).join(', ');
    
    // 5. Reject the request with a 400 Bad Request
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }

  // 6. Update the request with the validated value
  // (This is important for type conversion: e.g., "123" query param becomes number 123)
  Object.assign(req, value);
  
  return next();
};

module.exports = validate;