module.exports = {
  async up(db, client) {
    // 1. Create 'tokens' collection with Schema Validation
    await db.createCollection('tokens', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['token', 'user', 'type', 'expires'],
          properties: {
            token: {
              bsonType: 'string',
              description: 'The JWT string or random hash',
            },
            user: {
              bsonType: 'objectId',
              description: 'Owner of the token',
            },
            type: {
              bsonType: 'string',
              enum: ['refresh', 'resetPassword', 'verifyEmail'],
              description: 'Purpose of the token',
            },
            expires: {
              bsonType: 'date',
              description: 'When this token becomes invalid',
            },
            blacklisted: {
              bsonType: 'bool',
              description: 'If true, token is revoked before expiration',
            },
            createdAt: {
              bsonType: 'date',
            },
            updatedAt: {
              bsonType: 'date',
            },
          },
        },
      },
    });

    // 2. Create Indexes

    // Fast lookup by token string (Verified during login/reset)
    await db.collection('tokens').createIndex({ token: 1 }, { name: 'token_lookup_idx' });

    // Fast lookup by user (To invalidate all tokens for a specific user)
    await db.collection('tokens').createIndex({ user: 1 }, { name: 'user_tokens_idx' });

    // *** CRITICAL SECURITY FEATURE: TTL INDEX ***
    // Automatically deletes the document 0 seconds after the 'expires' time is reached.
    // This ensures dead tokens don't clutter the DB and cannot be reused.
    await db.collection('tokens').createIndex({ expires: 1 }, { expireAfterSeconds: 0, name: 'token_auto_cleanup_idx' });
  },

  async down(db, client) {
    // Revert
    await db.collection('tokens').drop();
  },
};