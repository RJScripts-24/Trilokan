const promClient = require('prom-client');
const logger = require('../config/logger');

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ 
  register,
  prefix: 'trilokan_gateway_',
});

// ========================================
// Custom Metrics
// ========================================

// HTTP Request Duration Histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'trilokan_gateway_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // seconds
});
register.registerMetric(httpRequestDuration);

// HTTP Request Counter
const httpRequestTotal = new promClient.Counter({
  name: 'trilokan_gateway_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestTotal);

// ML Service Request Duration
const mlRequestDuration = new promClient.Histogram({
  name: 'trilokan_gateway_ml_request_duration_seconds',
  help: 'Duration of ML service requests in seconds',
  labelNames: ['service', 'operation', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30], // seconds
});
register.registerMetric(mlRequestDuration);

// ML Service Request Counter
const mlRequestTotal = new promClient.Counter({
  name: 'trilokan_gateway_ml_requests_total',
  help: 'Total number of ML service requests',
  labelNames: ['service', 'operation', 'status'],
});
register.registerMetric(mlRequestTotal);

// ML Service Errors
const mlServiceErrors = new promClient.Counter({
  name: 'trilokan_gateway_ml_errors_total',
  help: 'Total number of ML service errors',
  labelNames: ['service', 'operation', 'error_type'],
});
register.registerMetric(mlServiceErrors);

// Circuit Breaker State
const circuitBreakerState = new promClient.Gauge({
  name: 'trilokan_gateway_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service'],
});
register.registerMetric(circuitBreakerState);

// Active Requests Gauge
const activeRequests = new promClient.Gauge({
  name: 'trilokan_gateway_active_requests',
  help: 'Number of requests currently being processed',
});
register.registerMetric(activeRequests);

// Database Connection Pool
const dbConnectionPoolSize = new promClient.Gauge({
  name: 'trilokan_gateway_db_connection_pool_size',
  help: 'Current database connection pool size',
});
register.registerMetric(dbConnectionPoolSize);

// Database Query Duration
const dbQueryDuration = new promClient.Histogram({
  name: 'trilokan_gateway_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2], // seconds
});
register.registerMetric(dbQueryDuration);

// File Upload Size
const fileUploadSize = new promClient.Histogram({
  name: 'trilokan_gateway_file_upload_size_bytes',
  help: 'Size of uploaded files in bytes',
  labelNames: ['file_type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760], // 1KB to 10MB
});
register.registerMetric(fileUploadSize);

// Authentication Attempts
const authAttempts = new promClient.Counter({
  name: 'trilokan_gateway_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status'], // success, failed
});
register.registerMetric(authAttempts);

// ========================================
// Metric Recording Functions
// ========================================

/**
 * Record HTTP request metrics
 */
const recordHttpRequest = (method, route, statusCode, duration) => {
  const labels = { 
    method, 
    route: route || 'unknown',
    status_code: statusCode.toString(),
  };
  
  httpRequestDuration.observe(labels, duration / 1000); // Convert ms to seconds
  httpRequestTotal.inc(labels);
};

/**
 * Record ML service request metrics
 */
const recordMLRequest = (service, operation, status, duration) => {
  const labels = { service, operation, status };
  
  mlRequestDuration.observe(labels, duration / 1000); // Convert ms to seconds
  mlRequestTotal.inc(labels);
};

/**
 * Record ML service error
 */
const recordMLError = (service, operation, errorType) => {
  mlServiceErrors.inc({ service, operation, error_type: errorType });
};

/**
 * Update circuit breaker state
 * @param {string} service - Service name
 * @param {string} state - State: 'CLOSED', 'OPEN', 'HALF_OPEN'
 */
const updateCircuitBreakerState = (service, state) => {
  const stateValue = state === 'CLOSED' ? 0 : state === 'OPEN' ? 1 : 2;
  circuitBreakerState.set({ service }, stateValue);
};

/**
 * Track active requests
 */
const incrementActiveRequests = () => {
  activeRequests.inc();
};

const decrementActiveRequests = () => {
  activeRequests.dec();
};

/**
 * Record database query
 */
const recordDbQuery = (operation, model, duration) => {
  dbQueryDuration.observe({ operation, model }, duration / 1000);
};

/**
 * Update database connection pool size
 */
const updateDbConnectionPoolSize = (size) => {
  dbConnectionPoolSize.set(size);
};

/**
 * Record file upload
 */
const recordFileUpload = (fileType, sizeBytes) => {
  fileUploadSize.observe({ file_type: fileType }, sizeBytes);
};

/**
 * Record authentication attempt
 */
const recordAuthAttempt = (success) => {
  authAttempts.inc({ status: success ? 'success' : 'failed' });
};

// ========================================
// Middleware
// ========================================

/**
 * Prometheus metrics middleware
 * Automatically tracks HTTP request metrics
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Increment active requests
  incrementActiveRequests();
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end to record metrics
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    
    // Record metrics
    recordHttpRequest(req.method, route, res.statusCode, duration);
    
    // Decrement active requests
    decrementActiveRequests();
  };
  
  next();
};

/**
 * Metrics endpoint handler
 * Exposes metrics for Prometheus scraping
 */
const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
};

// ========================================
// Health Check with Detailed Status
// ========================================

/**
 * Health check endpoint with service status
 */
const healthCheckHandler = async (req, res) => {
  const mlService = require('./ml.service');
  
  try {
    // Get ML services status
    const mlStatus = mlService.getMLServicesStatus();
    const circuitBreakers = mlService.getCircuitBreakerStatus();
    
    // Determine overall health
    const criticalServicesDown = Object.entries(mlStatus)
      .filter(([name, status]) => {
        const serviceConfig = {
          complaint: false, // optional
          identity: true,   // critical
          appCrawler: true, // critical
        };
        return serviceConfig[name] && !status.available;
      });
    
    const isHealthy = criticalServicesDown.length === 0;
    
    const response = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'connected', // Could add actual DB check
        mlServices: mlStatus,
        circuitBreakers,
      },
      criticalIssues: criticalServicesDown.map(([name]) => `${name} service unavailable`),
    };
    
    res.status(isHealthy ? 200 : 503).json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

module.exports = {
  register,
  metricsMiddleware,
  metricsHandler,
  healthCheckHandler,
  
  // Metric recording functions
  recordHttpRequest,
  recordMLRequest,
  recordMLError,
  updateCircuitBreakerState,
  incrementActiveRequests,
  decrementActiveRequests,
  recordDbQuery,
  updateDbConnectionPoolSize,
  recordFileUpload,
  recordAuthAttempt,
};
