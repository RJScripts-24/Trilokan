const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Correlation ID Middleware
 * Generates or accepts x-request-id and propagates it throughout the request lifecycle.
 * This enables distributed tracing across gateway → ML services.
 */
const correlationMiddleware = (req, res, next) => {
  // Accept existing request ID from client or generate new one
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request object for easy access in controllers/services
  req.requestId = requestId;
  
  // Attach to response headers for client tracking
  res.setHeader('x-request-id', requestId);
  
  // Store in async local storage for logger access
  req.correlationContext = {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userId: null, // Will be set after auth
    timestamp: new Date().toISOString(),
  };
  
  next();
};

/**
 * Request Logger Middleware
 * Logs incoming requests with correlation context.
 * Should be placed after correlation middleware.
 */
const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info({
    message: 'Incoming request',
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end to log response
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    const duration = Date.now() - start;
    
    // Log response
    logger.info({
      message: 'Request completed',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  };
  
  next();
};

/**
 * ML Service Logger Middleware
 * Logs ML service calls with sanitized context (no PII/binary data).
 * Use this wrapper function when calling ML services.
 */
const logMLServiceCall = (serviceName, operation, requestId, context = {}) => {
  // Sanitize context - remove large binary data, PII
  const sanitizedContext = {
    ...context,
    // Remove file buffers
    files: context.files ? Object.keys(context.files) : undefined,
    // Remove audio/video binary data
    audioFile: context.audioFile ? '[BINARY_DATA]' : undefined,
    videoFile: context.videoFile ? '[BINARY_DATA]' : undefined,
    apkFile: context.apkFile ? '[BINARY_DATA]' : undefined,
    // Keep metadata only
    hasVideo: !!context.videoFile || !!(context.files?.video),
    hasAudio: !!context.audioFile || !!(context.files?.audio),
    hasDocument: !!(context.files?.document),
    hasApk: !!context.apkFile,
    textLength: context.text?.length,
  };
  
  logger.info({
    message: 'ML service call initiated',
    requestId,
    serviceName,
    operation,
    context: sanitizedContext,
    timestamp: new Date().toISOString(),
  });
};

/**
 * ML Service Response Logger
 * Logs ML service responses with correlation ID.
 */
const logMLServiceResponse = (serviceName, operation, requestId, response, duration, error = null) => {
  if (error) {
    logger.error({
      message: 'ML service call failed',
      requestId,
      serviceName,
      operation,
      error: error.message,
      statusCode: error.response?.status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.info({
      message: 'ML service call completed',
      requestId,
      serviceName,
      operation,
      success: response.success !== false,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update user context after authentication
 * Call this in auth middleware after user is verified
 */
const setUserContext = (req, user) => {
  if (req.correlationContext && user) {
    req.correlationContext.userId = user.id;
    req.correlationContext.userRole = user.role;
  }
};

module.exports = {
  correlationMiddleware,
  requestLoggerMiddleware,
  logMLServiceCall,
  logMLServiceResponse,
  setUserContext,
};
