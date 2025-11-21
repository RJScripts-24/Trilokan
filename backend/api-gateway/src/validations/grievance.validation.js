const Joi = require('joi');


// Custom validator for integer IDs (Postgres)
const intId = Joi.number().integer().positive();

const createGrievance = {
  body: Joi.object().keys({
    title: Joi.string().required().min(5).max(150)
      .messages({ 'string.empty': 'Subject of the fraud report is required' }),
    
    description: Joi.string().required().min(20)
      .messages({ 'string.min': 'Please provide a detailed description of the incident (min 20 chars)' }),
    
    // Categories specific to Cyber Fraud & Trust
    category: Joi.string().required().valid(
      'document_forgery',      // Fake PDFs, altered bank statements
      'identity_theft',        // Impersonation
      'phishing_attempt',      // Malicious links/emails
      'financial_fraud',       // UPI/Credit Card fraud
      'trust_verification',    // Request to verify a vendor/document
      'malware_suspicion'      // Suspicious files
    ),

    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),

    // Crucial for your project: The Evidence (PDFs, Screenshots)
    attachments: Joi.array().items(
      Joi.string().uri().pattern(/\.(pdf|jpg|jpeg|png)$/i) // Validate file extensions if needed
    ).min(1).required().messages({
      'array.min': 'You must upload at least one document (PDF/Image) for analysis',
    }),

    // Optional fields for Cyber Forensics
    incidentDate: Joi.date().max('now').optional(),
    transactionId: Joi.string().allow('').optional(), // For financial fraud
    suspectDetails: Joi.string().allow('').optional(), // Email/Phone of the fraudster
    affectedUrl: Joi.string().uri().allow('').optional(), // If it happened on a website
  }),
};

const getGrievances = {
  query: Joi.object().keys({
    title: Joi.string(),
    status: Joi.string().valid('pending_analysis', 'under_forensics', 'verified_safe', 'confirmed_fraud', 'rejected'),
    category: Joi.string(),
    severity: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getGrievance = {
  params: Joi.object().keys({
    grievanceId: intId.required(),
  }),
};

const updateGrievance = {
  params: Joi.object().keys({
    grievanceId: intId.required(),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string().min(5).max(150),
      description: Joi.string().min(20),
      category: Joi.string().valid('document_forgery', 'identity_theft', 'phishing_attempt', 'financial_fraud', 'trust_verification', 'malware_suspicion'),
      incidentDate: Joi.date(),
      suspectDetails: Joi.string(),
      attachments: Joi.array().items(Joi.string().uri()),
    })
    .min(1),
};

const deleteGrievance = {
  params: Joi.object().keys({
    grievanceId: intId.required(),
  }),
};

const updateStatus = {
  params: Joi.object().keys({
    grievanceId: intId.required(),
  }),
  body: Joi.object().keys({
    // Updated status enums to match a forensic/trust workflow
    status: Joi.string().required().valid(
      'pending_analysis', 
      'under_forensics', 
      'verified_safe',     // Trust enhanced
      'confirmed_fraud',   // Fraud detected
      'rejected'
    ),
    remarks: Joi.string().allow('').optional(), // E.g., "AI detected 98% probability of Photoshop manipulation"
    riskScore: Joi.number().min(0).max(100).optional(), // AI Trust Score
  }),
};

const assignGrievance = {
  params: Joi.object().keys({
    grievanceId: intId.required(),
  }),
  body: Joi.object().keys({
    assigneeId: intId.required(), // Assign to a Forensic Analyst
  }),
};

module.exports = {
  createGrievance,
  getGrievances,
  getGrievance,
  updateGrievance,
  deleteGrievance,
  updateStatus,
  assignGrievance,
};