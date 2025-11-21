module.exports = {
  async up(db, client) {
    // 1. Create 'app_configs' collection
    // This stores global settings for your Digital Trust Platform
    await db.createCollection('app_configs', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['key', 'maintenanceMode'],
          properties: {
            key: {
              bsonType: 'string',
              description: 'Unique identifier for the config (e.g., "global", "ios_client")',
            },
            maintenanceMode: {
              bsonType: 'bool',
              description: 'If true, blocks all non-admin requests',
            },
            minClientVersion: {
              bsonType: 'string',
              description: 'Forces users to update their app',
            },
            supportEmail: {
              bsonType: 'string',
            },
            // Feature Flags specific to your Project
            features: {
              bsonType: 'object',
              properties: {
                enableGrievanceUploads: { bsonType: 'bool' }, // Toggle upload capability
                enableAiAnalysis: { bsonType: 'bool' },       // Toggle ML Service connection
                enableTrustScore: { bsonType: 'bool' },       // Toggle visibility of risk scores
              },
            },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    });

    // 2. Create Index on 'key' to ensure we don't have duplicate configs
    await db.collection('app_configs').createIndex({ key: 1 }, { unique: true, name: 'config_key_idx' });

    // 3. SEED DATA (Crucial Step)
    // Insert the default configuration so your App Service doesn't crash on first load
    await db.collection('app_configs').insertOne({
      key: 'default',
      maintenanceMode: false,
      minClientVersion: '1.0.0',
      supportEmail: 'fraud-support@digitaltrust.com',
      features: {
        enableGrievanceUploads: true,
        enableAiAnalysis: true, // Defaulting your AI Forensic tools to ON
        enableTrustScore: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async down(db, client) {
    // Revert operation
    await db.collection('app_configs').drop();
  },
};