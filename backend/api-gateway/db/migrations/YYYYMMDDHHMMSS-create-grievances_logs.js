module.exports = {
  async up(db, client) {
    // 1. Create 'grievance_logs' collection
    // This acts as the "Chain of Custody" for forensic evidence and workflow actions
    await db.createCollection('grievance_logs', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['grievance', 'action', 'performedBy', 'createdAt'],
          properties: {
            grievance: {
              bsonType: 'objectId',
              description: 'Reference to the parent Grievance/Fraud Report',
            },
            action: {
              bsonType: 'string',
              enum: [
                'CREATED',             // User submitted the report
                'STATUS_CHANGE',       // Admin/Staff changed status (e.g., Pending -> Forensics)
                'ASSIGNED',            // Admin assigned a Forensic Analyst
                'RISK_SCORE_UPDATE',   // AI or Analyst updated the risk score
                'COMMENT_ADDED',       // Internal note added
                'EVIDENCE_ADDED'       // Additional files uploaded
              ],
              description: 'The type of event that occurred',
            },
            performedBy: {
              bsonType: 'objectId',
              description: 'User ID of the person (Admin/Staff/User) who performed the action',
            },
            // Flexible field to store diffs
            details: {
              bsonType: 'object',
              properties: {
                from: { bsonType: ['string', 'number', 'null'] },
                to: { bsonType: ['string', 'number', 'null'] },
                remark: { bsonType: 'string' }, // Reason for the change
              },
            },
            createdAt: {
              bsonType: 'date',
            },
          },
        },
      },
    });

    // 2. Create Indexes
    
    // CRITICAL: To display the "Activity Timeline" for a specific fraud case
    // We index by grievance ID + createdAt (descending) to get the latest logs first fast
    await db.collection('grievance_logs').createIndex(
      { grievance: 1, createdAt: -1 },
      { name: 'grievance_timeline_idx' }
    );
  },

  async down(db, client) {
    // Revert: Drop the logs
    await db.collection('grievance_logs').drop();
  },
};