module.exports = {
  async up(db, client) {
    // 1. Create 'grievances' collection with Strict Schema Validation
    await db.createCollection('grievances', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title', 'description', 'user', 'category', 'status', 'priority', 'attachments'],
          properties: {
            title: {
              bsonType: 'string',
              description: 'Short subject of the fraud report',
            },
            description: {
              bsonType: 'string',
              description: 'Detailed explanation of the incident',
            },
            user: {
              bsonType: 'objectId',
              description: 'Reference to the User (Victim) who reported it',
            },
            // Project-Specific Categories
            category: {
              bsonType: 'string',
              enum: [
                'document_forgery',      // Fake PDFs
                'identity_theft',        // Impersonation
                'phishing_attempt',      // Malicious Links
                'financial_fraud',       // UPI/Bank Scams
                'trust_verification',    // Request to verify document safety
                'malware_suspicion'
              ],
              description: 'Type of cyber fraud or trust issue',
            },
            // Forensic Workflow Statuses
            status: {
              bsonType: 'string',
              enum: [
                'pending_analysis',  // Default: AI/Staff hasn't looked at it yet
                'under_forensics',   // Staff is currently investigating
                'verified_safe',     // Trust Verified: Document is authentic
                'confirmed_fraud',   // Fraud Detected: Document is fake/malicious
                'rejected'           // Invalid report
              ],
              description: 'Current stage in the forensic lifecycle',
            },
            priority: {
              bsonType: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Urgency level',
            },
            // Evidence Files
            attachments: {
              bsonType: 'array',
              minItems: 1, // Must have at least one piece of evidence
              items: {
                bsonType: 'string', // URL to S3/Cloudinary
              },
            },
            // Forensic Data (Optional initially)
            assignedTo: {
              bsonType: 'objectId',
              description: 'Reference to the Forensic Analyst (Staff) working on this',
            },
            riskScore: {
              bsonType: 'number',
              minimum: 0,
              maximum: 100,
              description: 'AI Calculated Trust/Risk Score (0 = Safe, 100 = High Risk)',
            },
            transactionId: {
              bsonType: 'string',
              description: 'For financial fraud tracking',
            },
            suspectDetails: {
              bsonType: 'string',
              description: 'Phone/Email of the fraudster',
            },
            incidentDate: {
              bsonType: 'date',
            },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    });

    // 2. Create Indexes for Dashboard Performance
    
    // For Users: "Show my reports"
    await db.collection('grievances').createIndex({ user: 1 });

    // For Admins: "Show all pending fraud cases"
    await db.collection('grievances').createIndex({ status: 1 });

    // For Analysts: "Show cases assigned to me"
    await db.collection('grievances').createIndex({ assignedTo: 1 });

    // For Analytics: "Show recent high-priority cases"
    await db.collection('grievances').createIndex({ createdAt: -1, priority: 1 });
  },

  async down(db, client) {
    // Revert: Drop the collection
    await db.collection('grievances').drop();
  },
};