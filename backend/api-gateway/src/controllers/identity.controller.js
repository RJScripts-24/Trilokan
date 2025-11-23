const httpStatus = require('http-status');
const catchAsync = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { mlService } = require('../services');

/**
 * Get a Random Liveness Challenge
 * GET /api/v1/identity/challenge
 * * Returns a random phrase for the user to speak and an action to perform.
 * This prevents "replay attacks" (playing a pre-recorded video).
 * [cite: 16, 18]
 */
const getVerificationChallenge = catchAsync(async (req, res) => {
  const phrases = [
    "The quick brown fox jumps over the lazy dog",
    "Trust is the currency of digital finance",
    "Secure banking for a better future",
    "Verify my identity for this transaction"
  ];
  
  const actions = [
    "Blink your eyes twice",
    "Turn your head slowly to the left",
    "Nod your head three times",
    "Smile and then look neutral"
  ];

  // Pick random challenge
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];

  res.status(httpStatus.OK).send({
    challengeId: Date.now().toString(), // Simple ID for tracking
    textChallenge: phrase,
    actionChallenge: action
  });
});

/**
 * Verify Identity (Multi-modal Verification)
 * POST /api/v1/identity/verify
 * * Expects 'multipart/form-data' with:
 * - faceVideo: The video file of the user performing the action.
 * - voiceAudio: The audio file of the user speaking the phrase.
 * - idDocument: (Optional) Image of their government ID.
 */
const verifyIdentity = catchAsync(async (req, res) => {
  // 1. Check if required files were uploaded
  if (!req.files || !req.files.faceVideo) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Face video is required for identity verification');
  }

  // 2. Prepare files for ML service
  const files = {};
  
  if (req.files.faceVideo && req.files.faceVideo[0]) {
    files.video = req.files.faceVideo[0];
  }
  
  if (req.files.voiceAudio && req.files.voiceAudio[0]) {
    files.audio = req.files.voiceAudio[0];
  }
  
  if (req.files.idDocument && req.files.idDocument[0]) {
    files.document = req.files.idDocument[0];
  }

  // 3. Call the ML Identity Verification Service
  // Uses the new standardized verifyIdentity wrapper
  const result = await mlService.verifyIdentity(files);

  // 4. Check result status
  if (result.status === 'error') {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, result.error || 'Identity verification service error');
  }

  // 5. Return standardized response
  res.status(httpStatus.OK).send({
    verified: result.identityVerified,
    confidence: result.confidence,
    message: result.identityVerified 
      ? 'Identity verified successfully' 
      : 'Identity verification failed',
    details: result.details
  });
});

module.exports = {
  getVerificationChallenge,
  verifyIdentity
};