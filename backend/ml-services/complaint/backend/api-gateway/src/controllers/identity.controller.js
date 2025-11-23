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
 * Verify Identity (Deepfake & Liveness Check)
 * POST /api/v1/identity/verify
 * * Expects 'multipart/form-data' with:
 * - faceVideo: The video file of the user performing the action.
 * - voiceAudio: The audio file of the user speaking the phrase.
 * - idDocument: (Optional) Image of their government ID.
 */
const verifyIdentity = catchAsync(async (req, res) => {
  // 1. Check if files were uploaded
  if (!req.files || !req.files.faceVideo) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Face video is required for liveness check');
  }

  const faceVideo = req.files.faceVideo[0];
  const voiceAudio = req.files.voiceAudio ? req.files.voiceAudio[0] : null;
  const idDocument = req.files.idDocument ? req.files.idDocument[0] : null;

  // 2. Call the Python AI Microservice
  // We pass the file buffers/paths to the service which sends them to the Python backend.
  // This aligns with the "Multi-modal verification" requirement[cite: 16, 18, 21].
  const result = await mlService.detectDeepfake({
    faceVideo,
    voiceAudio,
    idDocument,
    userId: req.user.id // From auth middleware
  });

  // 3. Analyze result
  // The ML service returns a confidence score (0.0 to 1.0) and a boolean verdict.
  if (!result.isReal) {
    // If fake, we might want to log a security alert here (future enhancement)
    return res.status(httpStatus.OK).send({
      verified: false,
      reason: result.reason || 'Deepfake artifacts detected',
      confidenceScore: result.confidenceScore
    });
  }

  // 4. Success response
  res.status(httpStatus.OK).send({
    verified: true,
    message: 'Identity verified successfully',
    confidenceScore: result.confidenceScore
  });
});

module.exports = {
  getVerificationChallenge,
  verifyIdentity
};