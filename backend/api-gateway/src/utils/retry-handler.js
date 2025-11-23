const logger = require('../config/logger');

/**
 * Retry with Exponential Backoff
 * Handles transient network errors gracefully
 */
class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 10000; // 10 seconds
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ENETUNREACH',
    ];
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    // Network errors
    if (error.code && this.retryableErrors.includes(error.code)) {
      return true;
    }

    // HTTP 5xx errors (server errors)
    if (error.response && error.response.status >= 500 && error.response.status < 600) {
      return true;
    }

    // HTTP 429 (Too Many Requests)
    if (error.response && error.response.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for next retry with exponential backoff
   */
  calculateDelay(attempt) {
    const delay = Math.min(
      this.initialDelay * Math.pow(this.backoffMultiplier, attempt),
      this.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return delay + jitter;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute function with retry logic
   * @param {Function} fn - Async function to execute
   * @param {Object} context - Context for logging
   * @returns {Promise} - Result of function
   */
  async execute(fn, context = {}) {
    const { serviceName = 'unknown', operation = 'request' } = context;
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(
            `Retry attempt ${attempt}/${this.maxRetries} for ${serviceName} ${operation}`
          );
        }

        const result = await fn();
        
        if (attempt > 0) {
          logger.info(
            `${serviceName} ${operation} succeeded after ${attempt} retries`
          );
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if we should retry
        const shouldRetry = this.isRetryable(error) && attempt < this.maxRetries;

        if (!shouldRetry) {
          logger.error(
            `${serviceName} ${operation} failed - not retryable or max retries reached: ${error.message}`
          );
          throw error;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt);
        logger.warn(
          `${serviceName} ${operation} failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}. ` +
          `Retrying in ${Math.round(delay)}ms...`
        );

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    logger.error(
      `${serviceName} ${operation} failed after ${this.maxRetries} retries`
    );
    throw lastError;
  }

  /**
   * Wrap an axios client with retry logic
   */
  wrapAxiosClient(axiosInstance, serviceName) {
    // Intercept requests to add retry logic
    const originalRequest = axiosInstance.request.bind(axiosInstance);

    axiosInstance.request = async (config) => {
      return this.execute(
        () => originalRequest(config),
        {
          serviceName,
          operation: `${config.method?.toUpperCase() || 'GET'} ${config.url}`,
        }
      );
    };

    return axiosInstance;
  }
}

module.exports = RetryHandler;
