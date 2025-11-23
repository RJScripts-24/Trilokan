'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('FileUploads', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Original filename uploaded by user',
      },
      storedFilename: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Unique filename stored on disk',
      },
      filepath: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Full path to the stored file',
      },
      mimetype: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'MIME type of the file',
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes',
      },
      fileHash: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'SHA-256 hash of the file for integrity verification',
      },
      uploadType: {
        type: Sequelize.ENUM('grievance_attachment', 'identity_document', 'app_file', 'voice_audio', 'other'),
        allowNull: false,
        comment: 'Type of upload to categorize files',
      },
      entityType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Related entity type (e.g., Grievance, User, App)',
      },
      entityId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID of the related entity',
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who uploaded the file',
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional metadata about the file',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('FileUploads', ['uploadedBy']);
    await queryInterface.addIndex('FileUploads', ['uploadType']);
    await queryInterface.addIndex('FileUploads', ['entityType', 'entityId']);
    await queryInterface.addIndex('FileUploads', ['fileHash']);
    await queryInterface.addIndex('FileUploads', ['createdAt']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('FileUploads');
  }
};

