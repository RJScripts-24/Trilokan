const axios = require('axios');
const httpStatus = require('http-status');
const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const FormData = require('form-data');
const HealthChecker = require('../utils/health-checker');
const CircuitBreaker = require('../utils/circuit-breaker');
const RetryHandler = require('../utils/retry-handler');
const { ResponseValidator } = require('../utils/response-validator');

/**
 * ML Service Configuration
 */
const ML_SERVICES = {
  complaint: {
    baseURL: process.env.ML_COMPLAINT_URL || 'http://localhost:5000',
    apiKey: process.env.ML_COMPLAINT_API_KEY || 'dev-api-key-complaint-service',
    required: false, // Optional service (voice complaints can be disabled)
  },
  identity: {
    baseURL: process.env.ML_IDENTITY_URL || 'http://localhost:5002',
    apiKey: process.env.ML_IDENTITY_API_KEY || 'dev-api-key-identity-verifier',
    required: true, // Critical service
  },
  appCrawler: {
    baseURL: process.env.ML_APP_CRAWLER_URL || 'http://localhost:5001',
    apiKey: process.env.ML_APP_CRAWLER_API_KEY || 'dev-api-key-app-crawler',
    required: true, // Critical service
  },
};

/**
 * Initialize health checker
 */
const healthChecker = new HealthChecker(ML_SERVICES, {
  checkInterval: 30000, // Check every 30 seconds
  timeout: 5000,
  retryAttempts: 3,
});

/**
 * Circuit breakers for each service
 */
const circuitBreakers = {
  complaint: new CircuitBreaker('complaint', {
    failureThreshold: 5,
    timeout: 60000,
  }),
  identity: new CircuitBreaker('identity', {
    failureThreshold: 5,
    timeout: 60000,
  }),
  appCrawler: new CircuitBreaker('appCrawler', {
    failureThreshold: 5,
    timeout: 60000,
  }),
};

/**
 * Retry handler
 */
const retryHandler = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
});

/**
 * Create axios instance for a specific ML service with retry and circuit breaker
 */
const createMLClient = (serviceName) => {
  const serviceConfig = ML_SERVICES[serviceName];
  if (!serviceConfig) {
    throw new Error(`Unknown ML service: ${serviceName}`);
  }

  const client = axios.create({
    baseURL: serviceConfig.baseURL,
    timeout: 30000, // 30 seconds for ML operations
    headers: {
      'x-api-key': serviceConfig.apiKey,
    },
  });

  // Wrap with retry handler
  retryHandler.wrapAxiosClient(client, serviceName);

  return client;
};

/**
 * Execute ML request with circuit breaker and response validation
 */
const executeMLRequest = async (serviceName, operation, requestFn) => {
  // Check if service is available
  if (!healthChecker.isServiceAvailable(serviceName)) {
    logger.warn(
      `Service ${serviceName} is marked as unavailable, returning degraded response`
    );
    return healthChecker.getDegradedResponse(serviceName, operation);
  }

  // Execute with circuit breaker
  const circuitBreaker = circuitBreakers[serviceName];
  
  try {
    const response = await circuitBreaker.execute(async () => {
      return await requestFn();
    });

    // Validate response schema
    const validation = ResponseValidator.validateResponse(
      response.data,
      serviceName,
      operation
    );

    if (!validation.valid) {
      logger.error(
        `Invalid response from ${serviceName}/${operation}: ${validation.error}`
      );
      
      // Return safe default instead of raw invalid response
      return ResponseValidator.getSafeDefault(serviceName, operation);
    }

    return validation.sanitized;
  } catch (error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      // Circuit is open, return degraded response
      logger.warn(`Circuit breaker open for ${serviceName}, returning degraded response`);
      return healthChecker.getDegradedResponse(serviceName, operation);
    }

    // Other errors - log and return degraded response
    logger.error(`ML Service Error (${serviceName}/${operation}): ${error.message}`);
    return healthChecker.getDegradedResponse(serviceName, operation);
  }
};

/**
 * Legacy ML client (kept for backward compatibility)
 */
const mlClient = axios.create({
  baseURL: config.mlService?.url || config.ml?.url || 'http://localhost:5000',
  timeout: 5000,
  headers: {
    'x-api-key': config.mlService?.apiKey || config.ml?.apiKey || 'dev-api-key',
  },
});

/**
 * Analyze grievance/complaint text and return categories
 * Maps to complaint service /api/v1/categorize
 * @param {string} text - The grievance text to analyze
 * @returns {Promise<Object>} - Standardized response with categories
 */
const analyzeGrievanceText = async (text) => {
  return executeMLRequest('complaint', 'categorize', async () => {
    const client = createMLClient('complaint');
    return await client.post('/api/v1/categorize', { text });
  });
};

/**
 * Transcribe audio to text
 * Maps to complaint service /transcribe
 * @param {Buffer|Stream} audioFile - Audio file buffer or stream
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} - Transcription result
 */
const transcribeAudio = async (audioFile, filename = 'audio.mp3') => {
  return executeMLRequest('complaint', 'transcribe', async () => {
    const client = createMLClient('complaint');
    const formData = new FormData();
    formData.append('audio', audioFile, filename);

    return await client.post('/transcribe', formData, {
      headers: formData.getHeaders(),
    });
  });
};

/**
 * Detect deepfake in video
 * Maps to complaint service /detect/deepfake
 * @param {Buffer|Stream} videoFile - Video file buffer or stream
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} - Deepfake detection result
 */
const detectDeepfake = async (videoFile, filename = 'video.mp4') => {
  return executeMLRequest('complaint', 'deepfake', async () => {
    const client = createMLClient('complaint');
    const formData = new FormData();
    formData.append('video', videoFile, filename);

    return await client.post('/detect/deepfake', formData, {
      headers: formData.getHeaders(),
    });
  });
};

/**
 * Verify identity using multi-modal verification
 * Maps to identity-verifier service /verify
 * @param {Object} files - Object containing video, audio, document files
 * @returns {Promise<Object>} - Identity verification result
 */
const verifyIdentity = async (files) => {
  return executeMLRequest('identity', 'verify', async () => {
    const client = createMLClient('identity');
    const formData = new FormData();

    if (files.video) {
      formData.append('video', files.video.buffer, files.video.originalname);
    }
    if (files.audio) {
      formData.append('audio', files.audio.buffer, files.audio.originalname);
    }
    if (files.document) {
      formData.append('document', files.document.buffer, files.document.originalname);
    }

    return await client.post('/verify', formData, {
      headers: formData.getHeaders(),
    });
  });
};

/**
 * Verify app safety (APK analysis)
 * Maps to app-crawler service /app/verify
 * @param {Object} params - Object containing packageName, playstoreLink, or apkFile
 * @returns {Promise<Object>} - App verification result
 */
const verifyApp = async (params) => {
  return executeMLRequest('appCrawler', 'verify', async () => {
    const client = createMLClient('appCrawler');
    const formData = new FormData();

    if (params.packageName) {
      formData.append('package_name', params.packageName);
    }
    if (params.playstoreLink) {
      formData.append('playstore_link', params.playstoreLink);
    }
    if (params.apkFile) {
      formData.append('apk', params.apkFile.buffer, params.apkFile.originalname);
    }

    return await client.post('/app/verify', formData, {
      headers: formData.getHeaders(),
    });
  });
};

/**
 * Legacy functions - kept for backward compatibility
 */
const predictCategory = async (text) => {
  try {
    if (!config.ml?.enabled) {
      return 'uncategorized';
    }

    const response = await mlClient.post('/predict/category', { text });
    return response.data.category;
  } catch (error) {
    logger.error(`ML Service Error (Category): ${error.message}`);
    return 'uncategorized';
  }
};

/**
 * Analyze the sentiment of the text
 * Used to prioritize urgent/angry tickets
 * * @param {string} text 
 * @returns {Promise<Object>} - { score: 0.9, label: 'negative' }
 */
const analyzeSentiment = async (text) => {
  try {
    if (!config.ml.enabled) {
      return { score: 0, label: 'neutral' };
    }

    const response = await mlClient.post('/predict/sentiment', { text });
    return {
      score: response.data.score, // 0 to 1
      label: response.data.label, // 'positive', 'negative', 'neutral'
    };
  } catch (error) {
    logger.error(`ML Service Error (Sentiment): ${error.message}`);
    return { score: 0, label: 'neutral' };
  }
};

/**
 * Detect Toxicity / Spam
 * Used to filter out abusive language before saving to DB
 * * @param {string} text 
 * @returns {Promise<boolean>} - true if toxic
 */
const detectToxicity = async (text) => {
  try {
    if (!config.ml.enabled) return false;

    const response = await mlClient.post('/predict/toxicity', { text });
    return response.data.isToxic; // boolean
  } catch (error) {
    logger.error(`ML Service Error (Toxicity): ${error.message}`);
    return false; // Default to allowing content if ML fails
  }
};

/**
 * Find similar existing grievances
 * Used to detect duplicate issues (e.g., 50 people reporting the same broken elevator)
 * * @param {string} text 
 * @returns {Promise<Array>} - Array of similar grievance IDs
 */
const findSimilarGrievances = async (text) => {
  try {
    if (!config.ml.enabled) return [];

    const response = await mlClient.post('/search/similar', { text });
    return response.data.similarIds || [];
  } catch (error) {
    logger.error(`ML Service Error (Similarity): ${error.message}`);
    return [];
  }
};

module.exports = {
  // New standardized wrappers
  analyzeGrievanceText,
  transcribeAudio,
  detectDeepfake,
  verifyIdentity,
  verifyApp,
  
  // Legacy functions (backward compatibility)
  predictCategory,
  analyzeSentiment,
  detectToxicity,
  findSimilarGrievances,

  // Health and monitoring
  healthChecker,
  getMLServicesStatus: () => healthChecker.getStatus(),
  getCircuitBreakerStatus: () => ({
    complaint: circuitBreakers.complaint.getState(),
    identity: circuitBreakers.identity.getState(),
    appCrawler: circuitBreakers.appCrawler.getState(),
  }),

  // Lifecycle management
  startHealthChecks: async () => {
    logger.info('Starting ML services health checks...');
    const readiness = await healthChecker.performReadinessProbe();
    
    if (!readiness.ready) {
      const requiredUnavailable = readiness.unavailableServices.filter(
        (name) => ML_SERVICES[name]?.required
      );

      if (requiredUnavailable.length > 0) {
        logger.error(
          `Critical ML services unavailable: ${requiredUnavailable.join(', ')}`
        );
        // Could throw error to prevent startup, or just warn
      }

      // Mark optional services as feature-gated
      readiness.unavailableServices.forEach((name) => {
        if (!ML_SERVICES[name]?.required) {
          logger.warn(
            `Feature gated: ${name} service unavailable - related features disabled`
          );
        }
      });
    }

    healthChecker.start();
    return readiness;
  },

  stopHealthChecks: () => {
    healthChecker.stop();
  },

  // Response validation for DB writes
  validateForDbWrite: (mlResponse, serviceName, operation) => {
    return ResponseValidator.validateForDbWrite(mlResponse, serviceName, operation);
  },
};