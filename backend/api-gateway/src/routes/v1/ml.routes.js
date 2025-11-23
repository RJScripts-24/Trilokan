const express = require('express');
const logger = require('../../config/logger');
const { mlService } = require('../../services');
const catchAsync = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const upload = require('../../middleware/upload.middleware');

const router = express.Router();

/**
 * ===========================================
 * ML Service Compatibility Routes
 * ===========================================
 * These routes provide backward compatibility and adapter functionality
 * for legacy endpoint paths that may have been used before standardization.
 * 
 * TODO: Mark these as deprecated once all callers are updated
 * TODO: Add sunset dates and migration guides
 */

/**
 * Legacy ML Predict Category Endpoint
 * POST /api/v1/ml/predict/category
 * 
 * Adapter for old categorization endpoint
 * Maps to new analyzeGrievanceText wrapper
 */
router.post('/predict/category', catchAsync(async (req, res) => {
  logger.warn('DEPRECATED: /api/v1/ml/predict/category endpoint used. Migrate to /api/v1/grievances with auto-categorization');
  
  const { text } = req.body;
  
  if (!text) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Text is required');
  }
  
  const result = await mlService.analyzeGrievanceText(text);
  
  // Return legacy format
  res.status(httpStatus.OK).send({
    category: result.categories && result.categories.length > 0 
      ? result.categories[0].name 
      : 'Uncategorized',
    confidence: result.categories && result.categories.length > 0
      ? result.categories[0].confidence
      : 0.0
  });
}));

/**
 * Legacy ML Sentiment Analysis Endpoint
 * POST /api/v1/ml/predict/sentiment
 * 
 * Maps to analyzeSentiment wrapper
 */
router.post('/predict/sentiment', catchAsync(async (req, res) => {
  logger.warn('DEPRECATED: /api/v1/ml/predict/sentiment endpoint used');
  
  const { text } = req.body;
  
  if (!text) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Text is required');
  }
  
  const result = await mlService.analyzeSentiment(text);
  
  res.status(httpStatus.OK).send(result);
}));

/**
 * Legacy ML Toxicity Detection Endpoint
 * POST /api/v1/ml/predict/toxicity
 * 
 * Maps to detectToxicity wrapper
 */
router.post('/predict/toxicity', catchAsync(async (req, res) => {
  logger.warn('DEPRECATED: /api/v1/ml/predict/toxicity endpoint used');
  
  const { text } = req.body;
  
  if (!text) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Text is required');
  }
  
  const isToxic = await mlService.detectToxicity(text);
  
  res.status(httpStatus.OK).send({ isToxic });
}));

/**
 * Legacy Deepfake Detection Endpoint
 * POST /api/v1/ml/detect/deepfake
 * 
 * Direct adapter to new detectDeepfake wrapper
 */
router.post('/detect/deepfake', upload.single('video'), catchAsync(async (req, res) => {
  logger.warn('DEPRECATED: /api/v1/ml/detect/deepfake endpoint used. Use /api/v1/identity/verify instead');
  
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Video file is required');
  }
  
  const result = await mlService.detectDeepfake(req.file.buffer, req.file.originalname);
  
  res.status(httpStatus.OK).send(result);
}));

/**
 * Legacy Audio Transcription Endpoint
 * POST /api/v1/ml/transcribe
 * 
 * Maps to transcribeAudio wrapper
 */
router.post('/transcribe', upload.single('audio'), catchAsync(async (req, res) => {
  logger.warn('DEPRECATED: /api/v1/ml/transcribe endpoint used');
  
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Audio file is required');
  }
  
  const result = await mlService.transcribeAudio(req.file.buffer, req.file.originalname);
  
  res.status(httpStatus.OK).send(result);
}));

/**
 * Legacy App Verification Endpoint
 * POST /api/v1/ml/verify/app
 * 
 * Maps to verifyApp wrapper
 */
router.post('/verify/app', upload.single('apk'), catchAsync(async (req, res) => {
  logger.warn('DEPRECATED: /api/v1/ml/verify/app endpoint used. Use /api/v1/apps/verify instead');
  
  const params = {
    packageName: req.body.packageName,
    playstoreLink: req.body.playstoreLink,
  };
  
  if (req.file) {
    params.apkFile = {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
    };
  }
  
  const result = await mlService.verifyApp(params);
  
  res.status(httpStatus.OK).send(result);
}));

/**
 * Legacy Identity Verification Endpoint
 * POST /api/v1/ml/verify/identity
 * 
 * Maps to verifyIdentity wrapper
 */
router.post('/verify/identity', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), catchAsync(async (req, res) => {
  logger.warn('DEPRECATED: /api/v1/ml/verify/identity endpoint used. Use /api/v1/identity/verify instead');
  
  const files = {};
  
  if (req.files.video && req.files.video[0]) {
    files.video = req.files.video[0];
  }
  if (req.files.audio && req.files.audio[0]) {
    files.audio = req.files.audio[0];
  }
  if (req.files.document && req.files.document[0]) {
    files.document = req.files.document[0];
  }
  
  const result = await mlService.verifyIdentity(files);
  
  res.status(httpStatus.OK).send(result);
}));

/**
 * Health check for ML services
 * GET /api/v1/ml/health
 */
router.get('/health', catchAsync(async (req, res) => {
  // Check connectivity to all ML services
  const health = {
    gateway: 'ok',
    services: {
      complaint: 'unknown',
      identity: 'unknown',
      appCrawler: 'unknown',
    }
  };
  
  // This is a simple check - in production you'd ping each service's /health endpoint
  res.status(httpStatus.OK).send(health);
}));

module.exports = router;
