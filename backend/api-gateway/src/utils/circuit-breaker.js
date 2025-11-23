const logger = require('../config/logger');

/**
 * Circuit Breaker States
 */
const STATES = {
  CLOSED: 'CLOSED', // Normal operation
  OPEN: 'OPEN', // Failing, reject requests
  HALF_OPEN: 'HALF_OPEN', // Testing if service recovered
};

/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by stopping requests to failing services
 */
class CircuitBreaker {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.state = STATES.CLOSED;

    // Configuration
    this.failureThreshold = options.failureThreshold || 5; // Failures before opening
    this.successThreshold = options.successThreshold || 2; // Successes to close from half-open
    this.timeout = options.timeout || 60000; // Time before attempting recovery (ms)
    this.monitoringPeriod = options.monitoringPeriod || 10000; // Rolling window for failures

    // Counters
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.recentFailures = []; // Track failures in rolling window
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise} - Result of function or circuit breaker error
   */
  async execute(fn) {
    if (this.state === STATES.OPEN) {
      if (Date.now() < this.nextAttempt) {
        // Circuit is open, reject immediately
        logger.debug(`Circuit breaker OPEN for ${this.serviceName}, rejecting request`);
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      } else {
        // Try to recover
        this.state = STATES.HALF_OPEN;
        logger.info(`Circuit breaker entering HALF_OPEN state for ${this.serviceName}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failures = 0;
    this.recentFailures = [];

    if (this.state === STATES.HALF_OPEN) {
      this.successes++;
      logger.debug(
        `Circuit breaker success in HALF_OPEN for ${this.serviceName} (${this.successes}/${this.successThreshold})`
      );

      if (this.successes >= this.successThreshold) {
        this.state = STATES.CLOSED;
        this.successes = 0;
        logger.info(`Circuit breaker CLOSED for ${this.serviceName} - service recovered`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    const now = Date.now();

    // Remove old failures outside monitoring period
    this.recentFailures = this.recentFailures.filter(
      (timestamp) => now - timestamp < this.monitoringPeriod
    );

    // Add new failure
    this.recentFailures.push(now);
    this.failures++;

    if (this.state === STATES.HALF_OPEN) {
      // Failed during recovery, open circuit again
      this.state = STATES.OPEN;
      this.nextAttempt = Date.now() + this.timeout;
      this.successes = 0;
      logger.warn(
        `Circuit breaker reopened for ${this.serviceName} - recovery failed`
      );
    } else if (this.recentFailures.length >= this.failureThreshold) {
      // Too many failures, open circuit
      this.state = STATES.OPEN;
      this.nextAttempt = Date.now() + this.timeout;
      logger.warn(
        `Circuit breaker OPENED for ${this.serviceName} - ` +
        `${this.recentFailures.length} failures in ${this.monitoringPeriod}ms`
      );
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      recentFailureCount: this.recentFailures.length,
      nextAttempt: this.state === STATES.OPEN ? new Date(this.nextAttempt).toISOString() : null,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.recentFailures = [];
    logger.info(`Circuit breaker reset for ${this.serviceName}`);
  }

  /**
   * Check if circuit allows requests
   */
  isOpen() {
    return this.state === STATES.OPEN && Date.now() < this.nextAttempt;
  }
}

module.exports = CircuitBreaker;
