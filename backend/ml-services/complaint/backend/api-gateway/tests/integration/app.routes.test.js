const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { userOne, insertUsers } = require('../fixtures/user.fixture');
const { tokenService } = require('../../src/services');
const { tokenTypes } = require('../../src/config/tokens');
const { User } = require('../../src/models');

// Connect to test database before running tests
setupTestDB();

describe('App / System Routes', () => {
  
  // --- HEALTH CHECK TESTS ---
  describe('GET /v1/app/health', () => {
    test('should return 200 and system status "UP"', async () => {
      const res = await request(app)
        .get('/v1/app/health')
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual(expect.objectContaining({
        status: 'UP',
        system: expect.objectContaining({
          database: expect.any(String), // e.g., 'connected' or 'disconnected'
          version: expect.any(String),
        }),
      }));
    });
  });

  // --- CONFIG TESTS ---
  describe('GET /v1/app/config', () => {
    test('should return 200 and application configuration', async () => {
      const res = await request(app)
        .get('/v1/app/config')
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('minClientVersion');
      expect(res.body).toHaveProperty('features');
      expect(res.body.features).toHaveProperty('enableDarkTheme');
    });
  });

  // --- ENUMS TESTS ---
  describe('GET /v1/app/enums', () => {
    test('should return 200 and lists of system constants', async () => {
      const res = await request(app)
        .get('/v1/app/enums')
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('roles');
      expect(res.body.roles).toContain('user');
      expect(res.body.roles).toContain('admin');
      
      expect(res.body).toHaveProperty('grievanceStatus');
      // Ensure our specific Digital Trust statuses are present
      expect(res.body.grievanceStatus).toContain('pending_analysis');
      expect(res.body.grievanceStatus).toContain('confirmed_fraud');
    });
  });

  // --- FEEDBACK TESTS ---
  describe('POST /v1/app/feedback', () => {
    let newFeedback;
    let userAccessToken;

    beforeEach(async () => {
      // 1. Create a user
      await insertUsers([userOne]);
      
      // 2. Generate a valid access token for that user
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);
      userAccessToken = tokenService.generateToken(userOne._id, expires, tokenTypes.ACCESS);

      newFeedback = {
        rating: 5,
        comment: 'Great app for checking document forgery!',
        category: 'feature_request',
      };
    });

    test('should return 201 and create feedback if data is valid', async () => {
      const res = await request(app)
        .post('/v1/app/feedback')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(newFeedback)
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(res.body.rating).toBe(newFeedback.rating);
      expect(res.body.comment).toBe(newFeedback.comment);
      
      // Verify user association (though often not returned in response, it should be in DB)
      // const dbFeedback = await Feedback.findById(res.body.id);
      // expect(dbFeedback.user).toBe(userOne._id);
    });

    test('should return 401 if authentication token is missing', async () => {
      await request(app)
        .post('/v1/app/feedback')
        .send(newFeedback)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 400 if rating is out of bounds (e.g., 6 stars)', async () => {
      newFeedback.rating = 6;

      await request(app)
        .post('/v1/app/feedback')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(newFeedback)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if comment is too short', async () => {
      newFeedback.comment = 'bad'; // Less than 5 chars

      await request(app)
        .post('/v1/app/feedback')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(newFeedback)
        .expect(httpStatus.BAD_REQUEST);
    });
  });
});