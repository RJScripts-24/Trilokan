const express = require('express');
const auth = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const grievanceValidation = require('../../validations/grievance.validation');
const grievanceController = require('../../controllers/grievance.controller');

const router = express.Router();

// --- General Grievance Operations ---

/**
 * @route   POST /v1/grievances
 * @desc    Create a new grievance/complaint
 * @access  Private (Any authenticated user)
 */
router.post(
  '/',
  auth(),
  validate(grievanceValidation.createGrievance),
  grievanceController.createGrievance
);

/**
 * @route   GET /v1/grievances
 * @desc    Get a list of grievances
 * - Standard Users: See only their own grievances
 * - Admins/Staff: See all grievances (with filters)
 * @access  Private
 */
router.get(
  '/',
  auth(),
  validate(grievanceValidation.getGrievances),
  grievanceController.getGrievances
);

// --- Specific Grievance Operations ---

/**
 * @route   GET /v1/grievances/:grievanceId
 * @desc    Get details of a specific grievance
 * @access  Private
 */
router.get(
  '/:grievanceId',
  auth(),
  validate(grievanceValidation.getGrievance),
  grievanceController.getGrievance
);

/**
 * @route   PATCH /v1/grievances/:grievanceId
 * @desc    Update grievance details
 * - Users can usually only update if status is 'pending'
 * @access  Private
 */
router.patch(
  '/:grievanceId',
  auth(),
  validate(grievanceValidation.updateGrievance),
  grievanceController.updateGrievance
);

/**
 * @route   DELETE /v1/grievances/:grievanceId
 * @desc    Delete a grievance (Soft delete preferred)
 * @access  Private (Admin or User if ticket is draft)
 */
router.delete(
  '/:grievanceId',
  auth(),
  validate(grievanceValidation.deleteGrievance),
  grievanceController.deleteGrievance
);

// --- Workflow Actions (Status & Assignment) ---

/**
 * @route   PATCH /v1/grievances/:grievanceId/status
 * @desc    Update the status of a grievance (e.g., Pending -> In Progress -> Resolved)
 * @access  Private (Admin/Staff only)
 */
router.patch(
  '/:grievanceId/status',
  auth('admin', 'staff'),
  validate(grievanceValidation.updateStatus),
  grievanceController.updateStatus
);

/**
 * @route   PATCH /v1/grievances/:grievanceId/assign
 * @desc    Assign the grievance to a specific staff member or department
 * @access  Private (Admin only)
 */
router.patch(
  '/:grievanceId/assign',
  auth('admin'),
  validate(grievanceValidation.assignGrievance),
  grievanceController.assignGrievance
);

module.exports = router;