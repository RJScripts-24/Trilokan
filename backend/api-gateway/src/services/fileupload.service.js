const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { FileUpload } = require('../models');
const logger = require('../config/logger');

/**
 * Calculate SHA-256 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File hash
 */
const calculateFileHash = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

/**
 * Create a file upload record in the database
 * @param {Object} fileData - File data
 * @param {Object} options - Additional options
 * @returns {Promise<FileUpload>}
 */
const createFileUpload = async (fileData, options = {}) => {
  try {
    // Calculate file hash if not provided
    let fileHash = fileData.fileHash;
    if (!fileHash && fileData.filepath) {
      try {
        fileHash = await calculateFileHash(fileData.filepath);
      } catch (error) {
        logger.warn(`Could not calculate hash for file ${fileData.filepath}: ${error.message}`);
      }
    }

    const uploadRecord = await FileUpload.create({
      filename: fileData.filename || fileData.originalname,
      storedFilename: path.basename(fileData.filepath || fileData.path),
      filepath: fileData.filepath || fileData.path,
      mimetype: fileData.mimetype,
      size: fileData.size,
      fileHash,
      uploadType: options.uploadType || 'other',
      entityType: options.entityType || null,
      entityId: options.entityId || null,
      uploadedBy: options.uploadedBy || null,
      metadata: options.metadata || {},
    });

    logger.info(`File upload record created: ${uploadRecord.id} for ${fileData.filename}`);
    return uploadRecord;
  } catch (error) {
    logger.error(`Error creating file upload record: ${error.message}`);
    throw error;
  }
};

/**
 * Create multiple file upload records
 * @param {Array} files - Array of file objects
 * @param {Object} options - Additional options
 * @returns {Promise<Array<FileUpload>>}
 */
const createMultipleFileUploads = async (files, options = {}) => {
  const uploadPromises = files.map(file => createFileUpload(file, options));
  return Promise.all(uploadPromises);
};

/**
 * Get file upload by ID
 * @param {number} id - File upload ID
 * @returns {Promise<FileUpload>}
 */
const getFileUploadById = async (id) => {
  return FileUpload.findByPk(id);
};

/**
 * Get file uploads by entity
 * @param {string} entityType - Entity type (e.g., 'Grievance', 'User')
 * @param {number} entityId - Entity ID
 * @returns {Promise<Array<FileUpload>>}
 */
const getFileUploadsByEntity = async (entityType, entityId) => {
  return FileUpload.findAll({
    where: { entityType, entityId },
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Get file uploads by user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array<FileUpload>>}
 */
const getFileUploadsByUser = async (userId, options = {}) => {
  const where = { uploadedBy: userId };
  
  if (options.uploadType) {
    where.uploadType = options.uploadType;
  }

  return FileUpload.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: options.limit || 100,
  });
};

/**
 * Delete file upload record and file
 * @param {number} id - File upload ID
 * @returns {Promise<boolean>}
 */
const deleteFileUpload = async (id) => {
  try {
    const fileUpload = await getFileUploadById(id);
    if (!fileUpload) {
      return false;
    }

    // Delete file from disk
    try {
      await fs.unlink(fileUpload.filepath);
      logger.info(`File deleted from disk: ${fileUpload.filepath}`);
    } catch (error) {
      logger.warn(`Could not delete file from disk: ${error.message}`);
    }

    // Delete database record
    await fileUpload.destroy();
    logger.info(`File upload record deleted: ${id}`);
    
    return true;
  } catch (error) {
    logger.error(`Error deleting file upload: ${error.message}`);
    throw error;
  }
};

/**
 * Get file upload statistics
 * @returns {Promise<Object>}
 */
const getFileUploadStats = async () => {
  const { Sequelize } = require('../models');
  
  const totalUploads = await FileUpload.count();
  const totalSize = await FileUpload.sum('size');
  
  const uploadsByType = await FileUpload.findAll({
    attributes: [
      'uploadType',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      [Sequelize.fn('SUM', Sequelize.col('size')), 'totalSize'],
    ],
    group: ['uploadType'],
  });

  return {
    totalUploads,
    totalSize,
    uploadsByType: uploadsByType.map(stat => ({
      type: stat.uploadType,
      count: parseInt(stat.get('count'), 10),
      totalSize: parseInt(stat.get('totalSize'), 10) || 0,
    })),
  };
};

module.exports = {
  calculateFileHash,
  createFileUpload,
  createMultipleFileUploads,
  getFileUploadById,
  getFileUploadsByEntity,
  getFileUploadsByUser,
  deleteFileUpload,
  getFileUploadStats,
};
