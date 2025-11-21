const request = require('supertest');
const faker = require('faker');
const httpStatus = require('http-status');
const app = require('../../src/app'); // Assuming your Express app is exported here
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const { userOne, insertUsers } = require('../fixtures/user.fixture');
const { tokenService } = require('../../src/services');
const { tokenTypes } = require('../../src/config/tokens');

// Connect to test database before running tests
setupTestDB();

describe('Auth Routes', () => {
  
  // --- REGISTER TESTS ---
  describe('POST /v1/identity/register', () => {
    let newUser;

    beforeEach(() => {
      newUser = {
        name: faker.name.findName(),
        email: faker.internet.email().toLowerCase(),
        password: 'password123', // Valid password (letters + numbers)
      };
    });

    test('should return 201 and successfully register user if request data is valid', async () => {
      const res = await request(app)
        .post('/v1/identity/register')
        .send(newUser)
        .expect(httpStatus.CREATED);

      // Verify response structure
      expect(res.body).toEqual({
        user: expect.objectContaining({
          id: expect.anything(),
          name: newUser.name,
          email: newUser.email,
          role: 'user', // Default role
        }),
        tokens: expect.objectContaining({
          access: expect.objectContaining({
            token: expect.anything(),
            expires: expect.anything(),
          }),
          refresh: expect.objectContaining({
            token: expect.anything(),
            expires: expect.anything(),
          }),
        }),
      });

      // Verify DB insertion
      const dbUser = await User.findOne({ email: newUser.email });
      expect(dbUser).toBeDefined();
      expect(dbUser.password).not.toBe(newUser.password); // Should be hashed
      expect(dbUser.isEmailVerified).toBe(false); // Should default to false
    });

    test('should return 400 if email is already taken', async () => {
      await insertUsers([userOne]); // Pre-fill DB with userOne
      newUser.email = userOne.email; // Try to register with same email

      await request(app)
        .post('/v1/identity/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if password is weak (no numbers)', async () => {
      newUser.password = 'passwordonlyletters'; // Invalid based on your custom validator

      await request(app)
        .post('/v1/identity/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if password is too short', async () => {
      newUser.password = '1234';

      await request(app)
        .post('/v1/identity/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  // --- LOGIN TESTS ---
  describe('POST /v1/identity/login', () => {
    test('should return 200 and tokens if email and password match', async () => {
      await insertUsers([userOne]); // Ensure user exists

      const res = await request(app)
        .post('/v1/identity/login')
        .send({
          email: userOne.email,
          password: userOne.password, // The unhashed password from fixture
        })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('tokens');
    });

    test('should return 401 if password is incorrect', async () => {
      await insertUsers([userOne]);

      await request(app)
        .post('/v1/identity/login')
        .send({
          email: userOne.email,
          password: 'wrongPassword123',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  // --- LOGOUT TESTS ---
  describe('POST /v1/identity/logout', () => {
    test('should return 204 if refresh token is valid', async () => {
      await insertUsers([userOne]);
      const expires = new Date(); 
      expires.setDate(expires.getDate() + 1);
      
      // Generate a real refresh token for the user
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH);

      await request(app)
        .post('/v1/identity/logout')
        .send({ refreshToken })
        .expect(httpStatus.NO_CONTENT); // 204
    });

    test('should return 404 if refresh token is not found in DB', async () => {
      await request(app)
        .post('/v1/identity/logout')
        .send({ refreshToken: 'fake_refresh_token' })
        .expect(httpStatus.NOT_FOUND);
    });
  });

  // --- REFRESH TOKEN TESTS ---
  describe('POST /v1/identity/refresh-tokens', () => {
    test('should return 200 and new tokens if refresh token is valid', async () => {
      await insertUsers([userOne]);
      const expires = new Date();
      expires.setDate(expires.getDate() + 1);
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH);

      const res = await request(app)
        .post('/v1/identity/refresh-tokens')
        .send({ refreshToken })
        .expect(httpStatus.OK);

      // Should return new pair
      expect(res.body).toHaveProperty('access');
      expect(res.body).toHaveProperty('refresh');
    });
  });
});