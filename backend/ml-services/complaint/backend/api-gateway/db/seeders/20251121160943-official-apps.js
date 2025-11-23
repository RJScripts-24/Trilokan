'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const appKey = 'official-web-portal';

    // Check if this config already exists
    const existingConfig = await queryInterface.sequelize.query(
      `SELECT id FROM app_configs WHERE key = :key LIMIT 1`,
      {
        replacements: { key: appKey },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (existingConfig.length > 0) {
      console.log(`App config for '${appKey}' already exists. Skipping.`);
      return;
    }

    // Insert Default Configuration
    await queryInterface.bulkInsert('app_configs', [
      {
        key: appKey,
        maintenanceMode: false,
        minClientVersion: '1.0.0',
        supportEmail: 'help@trustportal.com',
        features: JSON.stringify({
          enableGrievanceUploads: true,
          enableAiAnalysis: true,
          enableTrustScore: true,
          enablePublicRegistrations: true,
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(`Seeded App Config: ${appKey}`);
  },

  async down(queryInterface, Sequelize) {
    // Remove the seeded config
    await queryInterface.bulkDelete('app_configs', {
      key: 'official-web-portal',
    });
  },
};