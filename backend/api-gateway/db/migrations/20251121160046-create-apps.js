'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create Apps table for storing app verification data
    await queryInterface.createTable('Apps', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      appName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      packageName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fileHash: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'SHA-256 hash of the APK file',
      },
      version: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      publisher: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      storeUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('verified', 'suspicious', 'malicious'),
        defaultValue: 'suspicious',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      reporterId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    // Add indexes for performance
    await queryInterface.addIndex('Apps', ['fileHash']);
    await queryInterface.addIndex('Apps', ['packageName']);
    await queryInterface.addIndex('Apps', ['status']);
    await queryInterface.addIndex('Apps', {
      unique: true,
      fields: ['packageName', 'version', 'fileHash'],
      name: 'apps_unique_package_version_hash',
    });

    // Create app_configs table
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
    await queryInterface.dropTable('Apps');
    await queryInterface.dropTable('app_configs');
  }
};
