module.exports = {
  async up(db, client) {
    const appKey = 'official-web-portal';

    // 1. Check if this config already exists
    const existingConfig = await db.collection('app_configs').findOne({ key: appKey });

    if (existingConfig) {
      console.log(`App config for '${appKey}' already exists. Skipping.`);
      return;
    }

    // 2. Insert Default Configuration
    // This allows your frontend (React) to query /v1/app/config and know which features are active.
    await db.collection('app_configs').insertOne({
      key: appKey,
      maintenanceMode: false,
      minClientVersion: '1.0.0',
      supportEmail: 'help@trustportal.com',
      
      // Feature Flags specific to Cyber Fraud/Trust
      features: {
        enableGrievanceUploads: true, // Allow users to upload evidence
        enableAiAnalysis: true,       // Connect to Python ML Service
        enableTrustScore: true,       // Show the 0-100% risk meter to users
        enablePublicRegistrations: true, // Allow new victims to sign up
      },
      
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Seeded App Config: ${appKey}`);
  },

  async down(db, client) {
    // Revert: Delete the config
    await db.collection('app_configs').deleteOne({ key: 'official-web-portal' });
  },
};