'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('app_configs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique identifier for the config (e.g., "global", "ios_client")',
      },
      maintenanceMode: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, blocks all non-admin requests',
      },
      minClientVersion: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Forces users to update their app',
      },
      supportEmail: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Support contact email',
      },
      features: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Feature flags object',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('app_configs');
  }
};
