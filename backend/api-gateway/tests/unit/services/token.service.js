const moment = require('moment');
const jwt = require('jsonwebtoken');
const config = require('../../../src/config/config');
const tokenService = require('../../../src/services/token.service');
const { Token } = require('../../../src/models');
const { tokenTypes } = require('../../../src/config/tokens');

// Mock the Token model to avoid connecting to a real MongoDB
jest.mock('../../../src/models', () => ({
  Token: {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

describe('Token Service Unit Tests', () => {
  const userId = '5ebac534954b54139806c112';
  const userEmail = 'test@example.com';
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- GENERATE TOKEN ---
  describe('generateToken', () => {
    test('should return a valid JWT string signed with the secret', () => {
      const token = tokenService.generateToken(userId, accessTokenExpires, tokenTypes.ACCESS);
      
      expect(typeof token).toBe('string');
      
      // Verify the payload inside the token
      const payload = jwt.verify(token, config.jwt.secret);
      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe(tokenTypes.ACCESS);
    });
  });

  // --- SAVE TOKEN ---
  describe('saveToken', () => {
    test('should create a token document in the database', async () => {
      const token = 'abc123token';
      // Mock the return value of Token.create
      Token.create.mockResolvedValue({
        token,
        user: userId,
        type: tokenTypes.REFRESH,
        expires: accessTokenExpires.toDate(),
      });

      const result = await tokenService.saveToken(token, userId, accessTokenExpires, tokenTypes.REFRESH);

      expect(Token.create).toHaveBeenCalledWith({
        token,
        user: userId,
        expires: accessTokenExpires.toDate(),
        type: tokenTypes.REFRESH,
        blacklisted: false,
      });
      expect(result).toBeDefined();
    });
  });

  // --- VERIFY TOKEN ---
  describe('verifyToken', () => {
    test('should return the token document if token is valid and exists in DB', async () => {
      const token = tokenService.generateToken(userId, accessTokenExpires, tokenTypes.REFRESH);
      
      // Mock finding the token in DB
      Token.findOne.mockResolvedValue({
        token,
        user: userId,
        type: tokenTypes.REFRESH,
        blacklisted: false,
      });

      const doc = await tokenService.verifyToken(token, tokenTypes.REFRESH);
      
      expect(doc).toBeDefined();
      expect(doc.user).toBe(userId);
      expect(Token.findOne).toHaveBeenCalled();
    });

    test('should throw error if token is not found in DB (e.g. blacklisted or fake)', async () => {
      const token = tokenService.generateToken(userId, accessTokenExpires, tokenTypes.REFRESH);
      
      // Mock DB returning null (not found)
      Token.findOne.mockResolvedValue(null);

      await expect(tokenService.verifyToken(token, tokenTypes.REFRESH))
        .rejects
        .toThrow('Token not found');
    });

    test('should throw error if token signature is invalid', async () => {
      const invalidToken = 'invalid.jwt.string';

      await expect(tokenService.verifyToken(invalidToken, tokenTypes.REFRESH))
        .rejects
        .toThrow(); // JWT malformed error
    });
  });

  // --- GENERATE AUTH TOKENS ---
  describe('generateAuthTokens', () => {
    test('should return access and refresh tokens', async () => {
      const user = { id: userId };
      
      // Mock saveToken behavior
      Token.create.mockResolvedValue({});

      const authTokens = await tokenService.generateAuthTokens(user);

      expect(authTokens).toHaveProperty('access');
      expect(authTokens).toHaveProperty('refresh');
      
      expect(authTokens.access).toHaveProperty('token');
      expect(authTokens.access).toHaveProperty('expires');
      
      expect(authTokens.refresh).toHaveProperty('token');
      expect(authTokens.refresh).toHaveProperty('expires');

      // Ensure refresh token was saved to DB
      expect(Token.create).toHaveBeenCalledTimes(1);
    });
  });
});