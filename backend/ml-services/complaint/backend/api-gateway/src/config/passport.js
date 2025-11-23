const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('./config');
const { User } = require('../models'); // We will define this model in the next steps

const jwtOptions = {
  // 1. Where to find the token? (In the "Authorization: Bearer <token>" header)
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  
  // 2. The secret key to verify the signature (loaded from .env via config.js)
  secretOrKey: config.jwt.secret,
};

/**
 * The Verify Callback
 * This runs automatically when a protected route is hit.
 * @param {Object} payload - The decoded JWT JSON object (contains userId, type, etc.)
 * @param {Function} done - The callback to tell Passport if the user is valid
 */
const jwtVerify = async (payload, done) => {
  try {
    // Security Check: Ensure this is an 'access' token, not a 'refresh' token
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    // 3. Check if the user actually exists in the DB
    // (payload.sub usually holds the user ID)
    const user = await User.findByPk(payload.sub);

    if (!user) {
      return done(null, false); // Token is valid, but user no longer exists
    }

    // 4. Success! Attach the user object to req.user
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};