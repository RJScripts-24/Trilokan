const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Standard ML Response Schema
 * All ML services must conform to this schema
 */
const mlResponseSchema = Joi.object({
  status: Joi.string().valid('success', 'error').required(),
  result: Joi.object().when('status', {
    is: 'success',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  error: Joi.object({
    code: Joi.string().required(),
    message: Joi.string().required(),
    details: Joi.any().optional(),
  }).when('status', {
    is: 'error',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  meta: Joi.object({
    service: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
    version: Joi.string().optional(),
  }).required(),
}).strict();

/**
 * Service-specific result schemas
 */
const serviceResultSchemas = {
  complaint: {
    categorize: Joi.object({
      categories: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          confidence: Joi.number().min(0).max(1).required(),
        })
      ).required(),
      priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').required(),
      keywords: Joi.array().items(Joi.string()).optional(),
    }),
    transcribe: Joi.object({
      text: Joi.string().required(),
      confidence: Joi.number().min(0).max(1).required(),
      language: Joi.string().optional(),
    }),
    deepfake: Joi.object({
      score: Joi.number().min(0).max(1).required(),
      label: Joi.string().required(),
      confidence: Joi.number().min(0).max(1).required(),
      is_deepfake: Joi.boolean().required(),
    }),
  },
  identity: {
    verify: Joi.object({
      identity_verified: Joi.boolean().required(),
      confidence: Joi.number().min(0).max(1).required(),
      details: Joi.object().optional(),
    }),
  },
  appCrawler: {
    verify: Joi.object({
      package_match: Joi.boolean().required(),
      verdict: Joi.string().valid('safe', 'suspicious', 'malicious', 'error').required(),
      details: Joi.object().optional(),
      hashes: Joi.object().optional(),
    }),
  },
};

/**
 * Response Validator
 */
class ResponseValidator {
  /**
   * Validate ML service response against standard schema
   * @param {Object} response - Response from ML service
   * @param {string} serviceName - Name of the service
   * @param {string} operation - Operation name (e.g., 'categorize', 'verify')
   * @returns {Object} - { valid: boolean, error: string|null, sanitized: Object }
   */
  static validateResponse(response, serviceName, operation) {
    try {
      // Validate base schema
      const { error: baseError, value: baseValue } = mlResponseSchema.validate(response, {
        abortEarly: false,
        stripUnknown: false,
      });

      if (baseError) {
        logger.error(
          `ML Response Schema Validation Failed for ${serviceName}/${operation}: ${baseError.message}`,
          {
            details: baseError.details,
            response: JSON.stringify(response, null, 2),
          }
        );

        return {
          valid: false,
          error: `Invalid response schema: ${baseError.message}`,
          sanitized: null,
        };
      }

      // Validate service-specific result schema if success
      if (baseValue.status === 'success') {
        const resultSchema = serviceResultSchemas[serviceName]?.[operation];
        
        if (resultSchema) {
          const { error: resultError, value: resultValue } = resultSchema.validate(
            baseValue.result,
            { abortEarly: false, stripUnknown: true }
          );

          if (resultError) {
            logger.error(
              `ML Result Schema Validation Failed for ${serviceName}/${operation}: ${resultError.message}`,
              {
                details: resultError.details,
                result: JSON.stringify(baseValue.result, null, 2),
              }
            );

            return {
              valid: false,
              error: `Invalid result schema: ${resultError.message}`,
              sanitized: null,
            };
          }

          // Return sanitized response with validated result
          return {
            valid: true,
            error: null,
            sanitized: {
              ...baseValue,
              result: resultValue,
            },
          };
        }
      }

      // Valid response
      return {
        valid: true,
        error: null,
        sanitized: baseValue,
      };
    } catch (error) {
      logger.error(`Unexpected error during response validation: ${error.message}`);
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
        sanitized: null,
      };
    }
  }

  /**
   * Validate before DB write
   * @param {Object} mlResponse - Response from ML service
   * @param {string} serviceName - Service name
   * @param {string} operation - Operation name
   * @returns {boolean} - true if valid for DB write
   */
  static validateForDbWrite(mlResponse, serviceName, operation) {
    const validation = this.validateResponse(mlResponse, serviceName, operation);

    if (!validation.valid) {
      logger.error(
        `Rejecting DB write due to invalid ML response from ${serviceName}/${operation}`,
        {
          error: validation.error,
          rawPayload: JSON.stringify(mlResponse, null, 2),
        }
      );

      // Trigger alert for invalid schema
      this.triggerSchemaAlert(serviceName, operation, validation.error, mlResponse);

      return false;
    }

    return true;
  }

  /**
   * Trigger alert for schema validation failures
   * @param {string} serviceName - Service name
   * @param {string} operation - Operation name
   * @param {string} error - Validation error
   * @param {Object} payload - Raw response payload
   */
  static triggerSchemaAlert(serviceName, operation, error, payload) {
    // Log critical alert
    logger.error('ALERT: ML Response Schema Validation Failed', {
      service: serviceName,
      operation,
      error,
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(payload, null, 2),
    });

    // In production, this would integrate with alerting systems like:
    // - PagerDuty
    // - Slack/Teams notifications
    // - CloudWatch Alarms
    // - Application Insights
    // For now, we just log critically
  }

  /**
   * Get a safe default response when validation fails
   * @param {string} serviceName - Service name
   * @param {string} operation - Operation name
   * @returns {Object} - Safe default response
   */
  static getSafeDefault(serviceName, operation) {
    const defaults = {
      complaint: {
        categorize: {
          status: 'error',
          error: {
            code: 'VALIDATION_FAILED',
            message: 'ML service returned invalid response',
          },
          result: {
            categories: [{ name: 'Uncategorized', confidence: 0.0 }],
            priority: 'Medium',
            keywords: [],
          },
          meta: {
            service: 'api-gateway',
            timestamp: new Date().toISOString(),
          },
        },
        transcribe: {
          status: 'error',
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Transcription service returned invalid response',
          },
          result: {
            text: '',
            confidence: 0.0,
            language: 'unknown',
          },
          meta: {
            service: 'api-gateway',
            timestamp: new Date().toISOString(),
          },
        },
      },
      identity: {
        verify: {
          status: 'error',
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Identity verification returned invalid response',
          },
          result: {
            identity_verified: false,
            confidence: 0.0,
          },
          meta: {
            service: 'api-gateway',
            timestamp: new Date().toISOString(),
          },
        },
      },
      appCrawler: {
        verify: {
          status: 'error',
          error: {
            code: 'VALIDATION_FAILED',
            message: 'App verification returned invalid response',
          },
          result: {
            package_match: false,
            verdict: 'error',
            details: 'Validation failed',
          },
          meta: {
            service: 'api-gateway',
            timestamp: new Date().toISOString(),
          },
        },
      },
    };

    return defaults[serviceName]?.[operation] || {
      status: 'error',
      error: {
        code: 'VALIDATION_FAILED',
        message: 'ML service returned invalid response',
      },
      meta: {
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

module.exports = {
  ResponseValidator,
  mlResponseSchema,
  serviceResultSchemas,
};
