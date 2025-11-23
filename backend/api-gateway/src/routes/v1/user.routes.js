const express = require('express');
const userController = require('../../controllers/user.controller');
const auth = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const userValidation = require('../../validations/user.validation');

const router = express.Router();

// --- Public Routes ---

/**
 * @route   POST /v1/users/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  validate(userValidation.register),
  userController.register
);

/**
 * @route   POST /v1/users/login
 * @desc    Login user and return tokens
 * @access  Public
 */
router.post(
  '/login',
  validate(userValidation.login),
  userController.login
);

// --- Protected Routes (Requires Login) ---

/**
 * @route   GET /v1/users/profile
 * @desc    Get current logged-in user's profile
 * @access  Private
 */
router.get(
  '/profile',
  auth(), 
  userController.getProfile
);

/**
 * @route   PATCH /v1/users/profile
 * @desc    Update current user's profile details
 * @access  Private
 */
router.patch(
  '/profile',
  auth(),
  validate(userValidation.updateUser),
  userController.updateProfile
);

/**
 * @route   POST /v1/users/logout
 * @desc    Logout user (invalidate tokens)
 * @access  Private
 */
router.post(
  '/logout',
  auth(),
  userController.logout
);

// --- Admin Routes (Requires 'admin' role) ---

/**
 * @route   GET /v1/users
 * @desc    Get all users (with pagination)
 * @access  Private (Admin only)
 */
router.get(
  '/',
  auth('admin'),
  validate(userValidation.getUsers),
  userController.getUsers
);

/**
 * @route   DELETE /v1/users/:userId
 * @desc    Delete a specific user
 * @access  Private (Admin only)
 */
router.delete(
  '/:userId',
  auth('admin'),
  validate(userValidation.deleteUser),
  userController.deleteUser
);

module.exports = router;