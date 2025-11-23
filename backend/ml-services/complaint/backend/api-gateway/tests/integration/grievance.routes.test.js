const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { userOne, admin, insertUsers } = require('../fixtures/user.fixture');
const { grievanceOne, insertGrievances } = require('../fixtures/grievance.fixture');
const { tokenService } = require('../../src/services');
const { tokenTypes } = require('../../src/config/tokens');
const { Grievance } = require('../../src/models');

// Connect to test database before running tests
setupTestDB();

describe('Fraud Reporting Routes (Grievances)', () => {
  let userAccessToken;
  let adminAccessToken;

  beforeEach(async () => {
    // 1. Setup Users
    await insertUsers([userOne, admin]);

    // 2. Generate Tokens
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);
    
    userAccessToken = tokenService.generateToken(userOne._id, expires, tokenTypes.ACCESS);
    adminAccessToken = tokenService.generateToken(admin._id, expires, tokenTypes.ACCESS);
  });

  // --- SUBMIT FRAUD REPORT TESTS ---
  describe('POST /v1/grievances', () => {
    let newFraudReport;

    beforeEach(() => {
      newFraudReport = {
        title: 'Urgent: Phishing Link in SMS',
        description: 'I received a text message claiming to be from my bank asking me to update KYC. The link looks suspicious.',
        category: 'phishing_attempt', // Project-specific category
        priority: 'high',
        attachments: ['https://evidence-bucket.s3.com/screenshot1.jpg'],
        suspectDetails: 'Sender ID: AX-HDFC',
      };
    });

    test('should return 201 and successfully create a fraud report', async () => {
      const res = await request(app)
        .post('/v1/grievances')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(newFraudReport)
        .expect(httpStatus.CREATED);

      // Verify Response
      expect(res.body).toEqual(expect.objectContaining({
        title: newFraudReport.title,
        category: 'phishing_attempt',
        status: 'pending_analysis', // Default status for new fraud reports
        user: userOne._id.toHexString(),
      }));

      // Verify DB
      const dbGrievance = await Grievance.findById(res.body.id);
      expect(dbGrievance).toBeDefined();
      expect(dbGrievance.status).toBe('pending_analysis');
    });

    test('should return 400 if attachments (evidence) are missing', async () => {
      delete newFraudReport.attachments;

      await request(app)
        .post('/v1/grievances')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(newFraudReport)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if description is too short (not enough forensic detail)', async () => {
      newFraudReport.description = 'Scam alert'; // Too short

      await request(app)
        .post('/v1/grievances')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(newFraudReport)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  // --- VIEW REPORTS TESTS ---
  describe('GET /v1/grievances', () => {
    test('should return 200 and all reports for Admin (Forensic Dashboard)', async () => {
      await insertGrievances([grievanceOne]);

      const res = await request(app)
        .get('/v1/grievances')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].id).toBe(grievanceOne._id.toHexString());
    });

    test('should return 200 but ONLY own reports for Standard User', async () => {
      await insertGrievances([grievanceOne]); // Assume grievanceOne belongs to userOne

      const res = await request(app)
        .get('/v1/grievances')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
    });
  });

  // --- UPDATE STATUS (FORENSIC ANALYSIS) TESTS ---
  describe('PATCH /v1/grievances/:grievanceId/status', () => {
    test('should return 200 when Admin marks report as "confirmed_fraud"', async () => {
      await insertGrievances([grievanceOne]);

      const updateBody = {
        status: 'confirmed_fraud',
        remarks: 'Forensic analysis shows metadata manipulation in the PDF.',
        riskScore: 95, // AI Trust Score
      };

      const res = await request(app)
        .patch(`/v1/grievances/${grievanceOne._id}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.status).toBe('confirmed_fraud');
      expect(res.body.riskScore).toBe(95);

      // Verify DB update
      const dbGrievance = await Grievance.findById(grievanceOne._id);
      expect(dbGrievance.status).toBe('confirmed_fraud');
    });

    test('should return 403 (Forbidden) if a Standard User tries to update status', async () => {
      await insertGrievances([grievanceOne]);

      const updateBody = {
        status: 'verified_safe',
      };

      await request(app)
        .patch(`/v1/grievances/${grievanceOne._id}/status`)
        .set('Authorization', `Bearer ${userAccessToken}`) // User trying to be admin
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });
  });
});