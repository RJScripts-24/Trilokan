module.exports = {
  async up(db, client) {
    // 1. Create the 'users' collection with explicit JSON Schema Validation
    // This prevents bad data from entering the DB even if API validation fails
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'email', 'password', 'role', 'isEmailVerified'],
          properties: {
            name: {
              bsonType: 'string',
              description: 'must be a string and is required',
            },
            email: {
              bsonType: 'string',
              pattern: '^.+@.+$', // Basic regex for email structure
              description: 'must be a string matching email pattern and is required',
            },
            password: {
              bsonType: 'string',
              description: 'must be a string (hashed) and is required',
            },
            role: {
              bsonType: 'string',
              enum: ['user', 'admin', 'staff'], // Enforce role types for security
              description: 'must be one of the allowed roles',
            },
            isEmailVerified: {
              bsonType: 'bool',
              description: 'must be a boolean',
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
    // Unique index on email (Critical for Identity management)
    await db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'email_unique_idx' });
    
    // Index on role (To quickly find all 'staff' / Forensic Analysts)
    await db.collection('users').createIndex({ role: 1 }, { name: 'role_idx' });
  },

  async down(db, client) {
    // Revert: Drop the collection
    // BE CAREFUL: This deletes all user data
    await db.collection('users').drop();
  },
};