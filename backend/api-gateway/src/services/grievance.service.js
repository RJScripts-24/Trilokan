const httpStatus = require('http-status');
const { Grievance, User, GrievanceLog } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * Create a new grievance
 * @param {Object} grievanceBody
 * @returns {Promise<Grievance>}
 */
const createGrievance = async (grievanceBody) => {
  try {
    // Handle file attachments - convert to array of file paths/metadata
    let attachmentsData = [];
    
    if (grievanceBody.attachments) {
      if (Array.isArray(grievanceBody.attachments)) {
        // If it's already an array, use it
        attachmentsData = grievanceBody.attachments.map(file => {
          if (typeof file === 'string') {
            return file; // Already a path
          }
          // If it's a file object
          return {
            filename: file.filename || file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          };
        });
      } else if (typeof grievanceBody.attachments === 'object') {
        // Single file object
        attachmentsData = [{
          filename: grievanceBody.attachments.filename || grievanceBody.attachments.originalname,
          path: grievanceBody.attachments.path,
          mimetype: grievanceBody.attachments.mimetype,
          size: grievanceBody.attachments.size,
          uploadedAt: new Date().toISOString(),
        }];
      }
    }

    const grievance = await Grievance.create({
      ...grievanceBody,
      attachments: attachmentsData,
    });

    // Create initial log entry
    await GrievanceLog.create({
      grievanceId: grievance.id,
      status: grievance.status,
      updatedBy: grievanceBody.userId,
      notes: 'Grievance created',
    });

    logger.info(`Grievance created: ${grievance.id} by user ${grievanceBody.userId}`);
    return grievance;
  } catch (error) {
    logger.error(`Error creating grievance: ${error.message}`);
    throw error;
  }
};

/**
 * Query for grievances with pagination
 * @param {Object} filter - Filter options
 * @param {Object} options - Query options (limit, page, sortBy)
 * @returns {Promise<QueryResult>}
 */
const queryGrievances = async (filter, options) => {
  const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const offset = (page - 1) * limit;

  // Build order clause
  let order = [['createdAt', 'DESC']]; // Default sort
  if (options.sortBy) {
    const parts = options.sortBy.split(':');
    const sortField = parts[0];
    const sortOrder = parts[1] && parts[1].toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    order = [[sortField, sortOrder]];
  }

  const { count, rows } = await Grievance.findAndCountAll({
    where: filter,
    limit,
    offset,
    order,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });

  return {
    results: rows,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
    totalResults: count,
  };
};

/**
 * Get grievance by id
 * @param {number} id
 * @returns {Promise<Grievance>}
 */
const getGrievanceById = async (id) => {
  const grievance = await Grievance.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: GrievanceLog,
        as: 'history',
        order: [['createdAt', 'DESC']],
      },
    ],
  });
  return grievance;
};

/**
 * Update grievance by id
 * @param {number} grievanceId
 * @param {Object} updateBody
 * @returns {Promise<Grievance>}
 */
const updateGrievanceById = async (grievanceId, updateBody) => {
  const grievance = await getGrievanceById(grievanceId);
  if (!grievance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grievance not found');
  }

  const oldStatus = grievance.status;

  Object.assign(grievance, updateBody);
  await grievance.save();

  // Log status change
  if (updateBody.status && updateBody.status !== oldStatus) {
    await GrievanceLog.create({
      grievanceId: grievance.id,
      status: updateBody.status,
      updatedBy: updateBody.updatedBy || null,
      notes: updateBody.resolutionNotes || `Status changed from ${oldStatus} to ${updateBody.status}`,
    });
  }

  logger.info(`Grievance updated: ${grievance.id}`);
  return grievance;
};

/**
 * Delete grievance by id
 * @param {number} grievanceId
 * @returns {Promise<Grievance>}
 */
const deleteGrievanceById = async (grievanceId) => {
  const grievance = await getGrievanceById(grievanceId);
  if (!grievance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grievance not found');
  }
  await grievance.destroy();
  logger.info(`Grievance deleted: ${grievanceId}`);
  return grievance;
};

/**
 * Update grievance status
 * @param {number} grievanceId
 * @param {string} status
 * @param {number} updatedBy
 * @param {string} notes
 * @returns {Promise<Grievance>}
 */
const updateStatus = async (grievanceId, status, updatedBy, notes) => {
  const grievance = await getGrievanceById(grievanceId);
  if (!grievance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grievance not found');
  }

  const oldStatus = grievance.status;
  grievance.status = status;
  await grievance.save();

  // Create log entry
  await GrievanceLog.create({
    grievanceId: grievance.id,
    status,
    updatedBy,
    notes: notes || `Status changed from ${oldStatus} to ${status}`,
  });

  logger.info(`Grievance ${grievanceId} status updated to ${status} by user ${updatedBy}`);
  return grievance;
};

/**
 * Assign grievance to staff
 * @param {number} grievanceId
 * @param {number} assignedTo
 * @param {number} assignedBy
 * @returns {Promise<Grievance>}
 */
const assignGrievance = async (grievanceId, assignedTo, assignedBy) => {
  const grievance = await getGrievanceById(grievanceId);
  if (!grievance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grievance not found');
  }

  grievance.assignedTo = assignedTo;
  await grievance.save();

  // Create log entry
  await GrievanceLog.create({
    grievanceId: grievance.id,
    status: grievance.status,
    updatedBy: assignedBy,
    notes: `Grievance assigned to user ${assignedTo}`,
  });

  logger.info(`Grievance ${grievanceId} assigned to user ${assignedTo}`);
  return grievance;
};

/**
 * Get grievance statistics
 * @returns {Promise<Object>}
 */
const getGrievanceStatistics = async () => {
  const { Sequelize } = require('../models');
  const { Op } = Sequelize;

  const totalGrievances = await Grievance.count();
  const openGrievances = await Grievance.count({ where: { status: 'Open' } });
  const inProgressGrievances = await Grievance.count({ where: { status: 'In Progress' } });
  const resolvedGrievances = await Grievance.count({ where: { status: 'Resolved' } });
  const closedGrievances = await Grievance.count({ where: { status: 'Closed' } });

  // Count by category
  const categoryStats = await Grievance.findAll({
    attributes: [
      'category',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    group: ['category'],
  });

  // Count by priority
  const priorityStats = await Grievance.findAll({
    attributes: [
      'priority',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    group: ['priority'],
  });

  return {
    total: totalGrievances,
    byStatus: {
      open: openGrievances,
      inProgress: inProgressGrievances,
      resolved: resolvedGrievances,
      closed: closedGrievances,
    },
    byCategory: categoryStats.map(stat => ({
      category: stat.category,
      count: parseInt(stat.get('count'), 10),
    })),
    byPriority: priorityStats.map(stat => ({
      priority: stat.priority,
      count: parseInt(stat.get('count'), 10),
    })),
  };
};

module.exports = {
  createGrievance,
  queryGrievances,
  getGrievanceById,
  updateGrievanceById,
  deleteGrievanceById,
  updateStatus,
  assignGrievance,
  getGrievanceStatistics,
};
