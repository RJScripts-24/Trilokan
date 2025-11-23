const axios = require('axios');
const logger = require('../config/logger');

/**
 * Health Checker Module
 * Periodically checks ML services health and manages service availability status
 */

class HealthChecker {
  constructor(services, options = {}) {
    this.services = services;
    this.serviceStatus = {};
    this.checkInterval = options.checkInterval || 30000; // 30 seconds default
    this.timeout = options.timeout || 5000; // 5 seconds timeout
    this.retryAttempts = options.retryAttempts || 3;
    this.intervalId = null;
    this.isRunning = false;

    // Initialize all services as unknown
    Object.keys(this.services).forEach((name) => {
      this.serviceStatus[name] = {
        status: 'unknown',
        lastCheck: null,
        lastSuccess: null,
        consecutiveFailures: 0,
        available: false,
        error: null,
      };
    });
  }

  /**
   * Start periodic health checks
   */
  start() {
    if (this.isRunning) {
      logger.warn('Health checker is already running');
      return;
    }

    logger.info('Starting health checker for ML services');
    this.isRunning = true;

    // Run initial check immediately
    this.checkAllServices();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkAllServices();
    }, this.checkInterval);
  }

  /**
   * Stop periodic health checks
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      logger.info('Health checker stopped');
    }
  }

  /**
   * Check health of all services
   */
  async checkAllServices() {
    const checks = Object.keys(this.services).map((name) => this.checkService(name));
    await Promise.allSettled(checks);

    // Log overall status
    this.logHealthStatus();
  }

  /**
   * Check health of a specific service
   */
  async checkService(serviceName) {
    const serviceConfig = this.services[serviceName];
    if (!serviceConfig) {
      logger.error(`Unknown service: ${serviceName}`);
      return;
    }

    const healthUrl = `${serviceConfig.baseURL}/health`;
    const startTime = Date.now();

    try {
      const response = await axios.get(healthUrl, {
        timeout: this.timeout,
        validateStatus: (status) => status === 200,
      });

      const responseTime = Date.now() - startTime;

      // Service is healthy
      this.serviceStatus[serviceName] = {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
        consecutiveFailures: 0,
        available: true,
        responseTime,
        error: null,
      };

      logger.debug(`${serviceName} health check passed (${responseTime}ms)`);
    } catch (error) {
      const consecutiveFailures = this.serviceStatus[serviceName].consecutiveFailures + 1;
      const errorMessage = error.code === 'ECONNREFUSED' 
        ? 'Service unreachable' 
        : error.message;

      this.serviceStatus[serviceName] = {
        ...this.serviceStatus[serviceName],
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        consecutiveFailures,
        available: false,
        error: errorMessage,
      };

      logger.warn(
        `${serviceName} health check failed (attempt ${consecutiveFailures}): ${errorMessage}`
      );

      // Alert if service has been down for extended period
      if (consecutiveFailures >= 5) {
        logger.error(
          `ALERT: ${serviceName} has failed ${consecutiveFailures} consecutive health checks`
        );
      }
    }
  }

  /**
   * Perform readiness probe on startup
   * @returns {Object} - { ready: boolean, unavailableServices: [] }
   */
  async performReadinessProbe() {
    logger.info('Performing readiness probe for ML services...');

    const checks = Object.keys(this.services).map(async (name) => {
      let success = false;
      let lastError = null;

      // Try multiple times for startup readiness
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          await this.checkService(name);
          if (this.serviceStatus[name].available) {
            success = true;
            break;
          }
        } catch (error) {
          lastError = error.message;
        }

        if (attempt < this.retryAttempts) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      return { name, success, error: lastError };
    });

    const results = await Promise.all(checks);

    const unavailableServices = results
      .filter((r) => !r.success)
      .map((r) => r.name);

    const ready = unavailableServices.length === 0;

    if (ready) {
      logger.info('✓ All ML services are ready');
    } else {
      logger.warn(
        `⚠ Some ML services are unavailable: ${unavailableServices.join(', ')}`
      );
      unavailableServices.forEach((serviceName) => {
        logger.warn(`  - ${serviceName}: ${this.serviceStatus[serviceName].error}`);
      });
    }

    return { ready, unavailableServices };
  }

  /**
   * Check if a specific service is available
   */
  isServiceAvailable(serviceName) {
    const status = this.serviceStatus[serviceName];
    return status && status.available;
  }

  /**
   * Get status of all services
   */
  getStatus() {
    return {
      timestamp: new Date().toISOString(),
      services: this.serviceStatus,
    };
  }

  /**
   * Log overall health status
   */
  logHealthStatus() {
    const healthy = Object.keys(this.serviceStatus).filter(
      (name) => this.serviceStatus[name].available
    );
    const unhealthy = Object.keys(this.serviceStatus).filter(
      (name) => !this.serviceStatus[name].available
    );

    if (unhealthy.length > 0) {
      logger.warn(
        `ML Services Status: ${healthy.length}/${Object.keys(this.serviceStatus).length} healthy. ` +
        `Unavailable: ${unhealthy.join(', ')}`
      );
    } else {
      logger.info(`ML Services Status: All ${healthy.length} services healthy`);
    }
  }

  /**
   * Get degraded response for unavailable service
   */
  getDegradedResponse(serviceName, operation) {
    return {
      status: 'error',
      message: 'Service temporarily unavailable',
      error: {
        code: 'SERVICE_UNAVAILABLE',
        service: serviceName,
        operation,
        reason: this.serviceStatus[serviceName]?.error || 'Service is down',
      },
      meta: {
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

module.exports = HealthChecker;
