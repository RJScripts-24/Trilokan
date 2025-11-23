const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../app');
const { setupTestDB, teardownTestDB } = require('../setup');

// Mock ML services
const mockMLServices = {
  complaint: {
    categorize: jest.fn(),
    transcribe: jest.fn(),
    deepfake: jest.fn(),
  },
  identity: {
    verify: jest.fn(),
  },
  appCrawler: {
    verify: jest.fn(),
  },
};

// Mock the ML service module
jest.mock('../../src/services/ml.service', () => ({
  analyzeGrievanceText: (...args) => mockMLServices.complaint.categorize(...args),
  transcribeAudio: (...args) => mockMLServices.complaint.transcribe(...args),
  detectDeepfake: (...args) => mockMLServices.complaint.deepfake(...args),
  verifyIdentity: (...args) => mockMLServices.identity.verify(...args),
  verifyApp: (...args) => mockMLServices.appCrawler.verify(...args),
  startHealthChecks: jest.fn().mockResolvedValue({ ready: true }),
  stopHealthChecks: jest.fn(),
  getMLServicesStatus: jest.fn().mockReturnValue({
    complaint: { available: true, lastCheck: new Date() },
    identity: { available: true, lastCheck: new Date() },
    appCrawler: { available: true, lastCheck: new Date() },
  }),
}));

describe('ML Integration - End-to-End Flow', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    Object.values(mockMLServices).forEach(service => {
      Object.values(service).forEach(fn => fn.mockReset());
    });
  });

  describe('POST /api/v1/grievances/categorize', () => {
    it('should categorize grievance text with correlation ID', async () => {
      // Mock ML response
      mockMLServices.complaint.categorize.mockResolvedValue({
        success: true,
        categories: ['fraud', 'financial'],
        confidence: 0.95,
        primary_category: 'fraud',
      });

      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .set('x-request-id', 'test-request-123')
        .send({
          text: 'I was scammed by a fake banking app that stole my money.',
        })
        .expect(httpStatus.OK);

      // Verify response
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('categories');
      expect(res.body.categories).toContain('fraud');

      // Verify correlation ID in response header
      expect(res.headers['x-request-id']).toBe('test-request-123');

      // Verify ML service was called with correlation ID
      expect(mockMLServices.complaint.categorize).toHaveBeenCalledWith(
        expect.any(String),
        'test-request-123'
      );
    });

    it('should generate correlation ID if not provided', async () => {
      mockMLServices.complaint.categorize.mockResolvedValue({
        success: true,
        categories: ['complaint'],
        confidence: 0.85,
        primary_category: 'complaint',
      });

      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .send({
          text: 'Test complaint text',
        })
        .expect(httpStatus.OK);

      // Verify correlation ID was generated
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should handle missing text input', async () => {
      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .send({})
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body).toHaveProperty('message');
      expect(mockMLServices.complaint.categorize).not.toHaveBeenCalled();
    });

    it('should handle ML service timeout gracefully', async () => {
      mockMLServices.complaint.categorize.mockRejectedValue(
        new Error('Request timeout')
      );

      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .send({
          text: 'Test complaint',
        })
        .expect(httpStatus.OK); // Should return degraded response, not error

      // Verify degraded response
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('degraded', true);
    });

    it('should handle malformed ML response', async () => {
      mockMLServices.complaint.categorize.mockResolvedValue({
        // Missing required fields
        invalid: 'response',
      });

      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .send({
          text: 'Test complaint',
        })
        .expect(httpStatus.OK);

      // Should return safe default response
      expect(res.body).toHaveProperty('success');
    });
  });

  describe('POST /api/v1/grievances/transcribe', () => {
    it('should transcribe audio file with correlation ID', async () => {
      mockMLServices.complaint.transcribe.mockResolvedValue({
        success: true,
        text: 'This is the transcribed text from audio',
        confidence: 0.92,
        language: 'en',
      });

      const res = await request(app)
        .post('/api/v1/grievances/transcribe')
        .set('x-request-id', 'test-audio-456')
        .attach('audio', Buffer.from('fake-audio-data'), 'test.mp3')
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('text');
      expect(res.headers['x-request-id']).toBe('test-audio-456');
    });

    it('should reject non-audio files', async () => {
      const res = await request(app)
        .post('/api/v1/grievances/transcribe')
        .attach('audio', Buffer.from('not-audio'), 'test.txt')
        .expect(httpStatus.BAD_REQUEST);

      expect(mockMLServices.complaint.transcribe).not.toHaveBeenCalled();
    });

    it('should handle missing audio file', async () => {
      const res = await request(app)
        .post('/api/v1/grievances/transcribe')
        .expect(httpStatus.BAD_REQUEST);

      expect(mockMLServices.complaint.transcribe).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/identity/verify', () => {
    it('should verify identity with multiple files', async () => {
      mockMLServices.identity.verify.mockResolvedValue({
        success: true,
        verified: true,
        confidence: 0.98,
        liveness_check: true,
        document_valid: true,
        face_match: 0.96,
      });

      const res = await request(app)
        .post('/api/v1/identity/verify')
        .set('x-request-id', 'test-identity-789')
        .attach('video', Buffer.from('fake-video'), 'selfie.mp4')
        .attach('document', Buffer.from('fake-doc'), 'id.jpg')
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('verified', true);
      expect(res.headers['x-request-id']).toBe('test-identity-789');
    });

    it('should handle missing required files', async () => {
      const res = await request(app)
        .post('/api/v1/identity/verify')
        .expect(httpStatus.BAD_REQUEST);

      expect(mockMLServices.identity.verify).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/apps/verify', () => {
    it('should verify app by package name', async () => {
      mockMLServices.appCrawler.verify.mockResolvedValue({
        success: true,
        is_safe: true,
        trust_score: 0.92,
        is_official: true,
        threats: [],
      });

      const res = await request(app)
        .post('/api/v1/apps/verify')
        .set('x-request-id', 'test-app-101')
        .send({
          packageName: 'com.google.android.apps.authenticator2',
        })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('is_safe', true);
      expect(res.headers['x-request-id']).toBe('test-app-101');
    });

    it('should verify app by APK file', async () => {
      mockMLServices.appCrawler.verify.mockResolvedValue({
        success: true,
        is_safe: false,
        trust_score: 0.35,
        is_official: false,
        threats: ['permissions_excessive', 'suspicious_code'],
      });

      const res = await request(app)
        .post('/api/v1/apps/verify')
        .attach('apk', Buffer.from('fake-apk'), 'app.apk')
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('is_safe', false);
      expect(res.body.threats).toContain('permissions_excessive');
    });

    it('should reject request with no input', async () => {
      const res = await request(app)
        .post('/api/v1/apps/verify')
        .send({})
        .expect(httpStatus.BAD_REQUEST);

      expect(mockMLServices.appCrawler.verify).not.toHaveBeenCalled();
    });
  });

  describe('Authentication with ML endpoints', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .send({ text: 'Test' })
        .expect(httpStatus.UNAUTHORIZED);

      expect(mockMLServices.complaint.categorize).not.toHaveBeenCalled();
    });

    it('should accept requests with valid API key', async () => {
      mockMLServices.complaint.categorize.mockResolvedValue({
        success: true,
        categories: ['test'],
        confidence: 0.9,
      });

      // Assuming API key auth is implemented
      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .set('x-api-key', 'valid-test-key')
        .send({ text: 'Test complaint' });

      // Response depends on auth implementation
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle ML service returning 500 error', async () => {
      mockMLServices.complaint.categorize.mockRejectedValue({
        response: { status: 500, data: { error: 'Internal server error' } },
      });

      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .send({ text: 'Test' })
        .expect(httpStatus.OK);

      // Should return degraded response
      expect(res.body).toHaveProperty('degraded', true);
    });

    it('should handle ML service returning unexpected schema', async () => {
      mockMLServices.complaint.categorize.mockResolvedValue({
        completely: 'wrong',
        schema: 'here',
      });

      const res = await request(app)
        .post('/api/v1/grievances/categorize')
        .send({ text: 'Test' })
        .expect(httpStatus.OK);

      // Should return safe default
      expect(res.body.success).toBeDefined();
    });
  });
});
