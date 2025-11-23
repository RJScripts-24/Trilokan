/**
 * ML Service Test Helpers
 * Utilities for mocking and testing ML service interactions
 */

/**
 * Create mock ML response for categorization
 */
const mockCategorizationResponse = (overrides = {}) => ({
  success: true,
  categories: ['fraud', 'financial'],
  confidence: 0.95,
  primary_category: 'fraud',
  ...overrides,
});

/**
 * Create mock ML response for transcription
 */
const mockTranscriptionResponse = (overrides = {}) => ({
  success: true,
  text: 'This is the transcribed text',
  confidence: 0.92,
  language: 'en',
  duration: 15.5,
  ...overrides,
});

/**
 * Create mock ML response for deepfake detection
 */
const mockDeepfakeResponse = (overrides = {}) => ({
  success: true,
  is_deepfake: false,
  confidence: 0.88,
  frame_analysis: {
    total_frames: 100,
    suspicious_frames: 2,
  },
  ...overrides,
});

/**
 * Create mock ML response for identity verification
 */
const mockIdentityVerificationResponse = (overrides = {}) => ({
  success: true,
  verified: true,
  confidence: 0.98,
  liveness_check: true,
  document_valid: true,
  face_match: 0.96,
  checks: {
    video_liveness: true,
    audio_match: true,
    document_authentic: true,
  },
  ...overrides,
});

/**
 * Create mock ML response for app verification
 */
const mockAppVerificationResponse = (overrides = {}) => ({
  success: true,
  is_safe: true,
  trust_score: 0.92,
  is_official: true,
  threats: [],
  analysis: {
    permissions: 'normal',
    code_signature: 'valid',
    malware_scan: 'clean',
  },
  ...overrides,
});

/**
 * Create mock degraded response
 */
const mockDegradedResponse = (serviceName, operation) => ({
  success: false,
  degraded: true,
  service: serviceName,
  operation,
  message: 'Service temporarily unavailable',
  fallback: true,
});

/**
 * Create mock error response
 */
const mockErrorResponse = (statusCode = 500, message = 'Internal server error') => ({
  response: {
    status: statusCode,
    data: {
      error: message,
      timestamp: new Date().toISOString(),
    },
  },
  message,
});

/**
 * Create mock file buffer
 */
const mockFileBuffer = (type = 'image', size = 1024) => ({
  buffer: Buffer.alloc(size, 'test-data'),
  originalname: `test.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'bin'}`,
  mimetype: type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/mpeg' : 'application/octet-stream',
  size,
});

/**
 * Verify ML service was called with correlation ID
 */
const expectMLServiceCalledWithCorrelationId = (mockFn, requestId) => {
  expect(mockFn).toHaveBeenCalled();
  const calls = mockFn.mock.calls;
  const lastCall = calls[calls.length - 1];
  
  // Check if requestId was passed (typically as last parameter)
  const requestIdParam = lastCall[lastCall.length - 1];
  if (requestId) {
    expect(requestIdParam).toBe(requestId);
  } else {
    // If no specific requestId, just verify it's a UUID
    expect(requestIdParam).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  }
};

/**
 * Verify response has correlation ID header
 */
const expectCorrelationIdInResponse = (res, expectedId = null) => {
  expect(res.headers['x-request-id']).toBeDefined();
  if (expectedId) {
    expect(res.headers['x-request-id']).toBe(expectedId);
  } else {
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  }
};

/**
 * Create test user token
 */
const createTestToken = (userId = 1, role = 'user') => {
  const jwt = require('jsonwebtoken');
  const config = require('../../src/config/config');
  
  return jwt.sign(
    { id: userId, role },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
};

module.exports = {
  mockCategorizationResponse,
  mockTranscriptionResponse,
  mockDeepfakeResponse,
  mockIdentityVerificationResponse,
  mockAppVerificationResponse,
  mockDegradedResponse,
  mockErrorResponse,
  mockFileBuffer,
  expectMLServiceCalledWithCorrelationId,
  expectCorrelationIdInResponse,
  createTestToken,
};
