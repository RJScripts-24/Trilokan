const express = require('express');
const validate = require('../../middleware/validate.middleware');
const identityValidation = require('../../validations/identity.validation');
const identityController = require('../../controllers/identity.controller');
const auth = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload.middleware');

const router = express.Router();

/**
 * @route   GET /v1/identity/challenge
 * @desc    Get a random liveness challenge for identity verification
 * @access  Private
 */
router.get(
  '/challenge',
  auth(),
  identityController.getVerificationChallenge
);

/**
 * @route   POST /v1/identity/verify
 * @desc    Verify identity using multi-modal verification (face, voice, document)
 * @access  Private
 */
router.post(
  '/verify',
  auth(),
  upload.fields([
    { name: 'faceVideo', maxCount: 1 },
    { name: 'voiceAudio', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 }
  ]),
  identityController.verifyIdentity
);

module.exports = router;