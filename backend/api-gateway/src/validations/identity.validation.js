const Joi = require('joi');

const verifyIdentity = {
  body: Joi.object().keys({
    challengeId: Joi.string().optional(),
    verificationData: Joi.object().optional(),
  }),
};

const getChallenge = {
  query: Joi.object().keys({
    type: Joi.string().valid('liveness', 'voice', 'document').optional(),
  }),
};

module.exports = {
  verifyIdentity,
  getChallenge,
};
