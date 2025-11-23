module.exports = (sequelize, DataTypes) => {
  const FileUpload = sequelize.define('FileUpload', {
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Original filename uploaded by user',
    },
    storedFilename: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Unique filename stored on disk',
    },
    filepath: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Full path to the stored file',
    },
    mimetype: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'MIME type of the file',
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes',
    },
    fileHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'SHA-256 hash of the file for integrity verification',
    },
    uploadType: {
      type: DataTypes.ENUM('grievance_attachment', 'identity_document', 'app_file', 'voice_audio', 'other'),
      allowNull: false,
      comment: 'Type of upload to categorize files',
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Related entity type (e.g., Grievance, User, App)',
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID of the related entity',
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who uploaded the file',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional metadata about the file',
    },
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['uploadedBy'],
      },
      {
        fields: ['uploadType'],
      },
      {
        fields: ['entityType', 'entityId'],
      },
      {
        fields: ['fileHash'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  });

  return FileUpload;
};
