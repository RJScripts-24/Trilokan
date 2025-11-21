const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/asyncHandler');
const { grievanceService, mlService, emailService } = require('../services');

/**
 * Create a New Grievance
 * POST /api/v1/grievances
 * * Supports Multi-modal intake:
 * - Text: standard JSON body
 * - Voice: 'voiceAudio' file upload (converted to text via AI) [cite: 82]
 */
const createGrievance = catchAsync(async (req, res) => {
  const { title, attachments } = req.body;
  let { description } = req.body;

  // 1. Handle Voice Input (Inclusivity Feature)
  // If the user recorded a voice note, we send it to the AI service for Speech-to-Text.
  if (req.files && req.files.voiceAudio) {
    const transcriptionResult = await mlService.transcribeAudio(req.files.voiceAudio[0]);
    // Append transcription to description or use as main description
    description = description 
      ? `${description}\n\n[Voice Transcription]: ${transcriptionResult.text}`
      : transcriptionResult.text;
  }

  if (!description) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Description or Voice Note is required');
  }

  // 2. AI Categorization & Prioritization 
  // We analyze the text to automatically set the category (e.g., "Fraud", "Service")
  // and priority (e.g., "High" for fraud, "Low" for inquiries).
  const aiAnalysis = await mlService.analyzeGrievanceText(description);

  // 3. Save to Database
  const grievance = await grievanceService.createGrievance({
    userId: req.user.id,
    title: title || 'New Grievance', // Fallback title
    description,
    category: aiAnalysis.suggestedCategory || 'General',
    priority: aiAnalysis.suggestedPriority || 'Medium',
    status: 'Open',
    attachments: req.files ? req.files.evidence : [] // Handle evidence images/docs
  });

  // 4. Send Confirmation Email 
  // "Automated Alerts & Transparency" - assure user it's logged.
  await emailService.sendGrievanceLoggedEmail(req.user.email, grievance);

  res.status(httpStatus.CREATED).send(grievance);
});

/**
 * Get All Grievances (with Filters)
 * GET /api/v1/grievances
 * * Users see only their own. Admins see all.
 */
const getGrievances = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['status', 'category', 'priority']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // If not admin, force filter to only show own grievances
  if (req.user.role !== 'admin' && req.user.role !== 'official') {
    filter.userId = req.user.id;
  }

  const result = await grievanceService.queryGrievances(filter, options);
  res.send(result);
});

/**
 * Get Grievance by ID
 * GET /api/v1/grievances/:grievanceId
 */
const getGrievance = catchAsync(async (req, res) => {
  const grievance = await grievanceService.getGrievanceById(req.params.grievanceId);
  if (!grievance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grievance not found');
  }
  
  // Access Control
  const isOwner = grievance.userId === req.user.id;
  const isStaff = ['admin', 'official'].includes(req.user.role);
  
  if (!isOwner && !isStaff) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  res.send(grievance);
});

/**
 * Update Grievance (Status Change / Resolution)
 * PATCH /api/v1/grievances/:grievanceId
 * * Officials use this to move ticket to "Resolved".
 */
const updateGrievance = catchAsync(async (req, res) => {
  const grievance = await grievanceService.updateGrievanceById(req.params.grievanceId, req.body);
  
  // If status changed, notify the user immediately 
  if (req.body.status) {
    const user = await grievance.getUser(); // Sequelize helper to get owner
    await emailService.sendGrievanceStatusUpdateEmail(user.email, grievance);
  }

  res.send(grievance);
});

/**
 * Get Dashboard Analytics
 * GET /api/v1/grievances/analytics/stats
 * * Used for the "Recurring pain points" dashboard[cite: 69].
 */
const getGrievanceStats = catchAsync(async (req, res) => {
  // Returns counts by category, avg resolution time, etc.
  const stats = await grievanceService.getGrievanceStatistics();
  res.send(stats);
});

module.exports = {
  createGrievance,
  getGrievances,
  getGrievance,
  updateGrievance,
  getGrievanceStats,
};