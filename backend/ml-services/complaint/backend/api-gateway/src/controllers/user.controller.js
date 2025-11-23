const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/asyncHandler');
const { userService } = require('../services');

/**
 * Create a user manually (Admin only)
 * POST /api/v1/users
 */
const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

/**
 * Get all users (with pagination & filtering)
 * GET /api/v1/users?role=user&limit=10&page=1
 */
const getUsers = catchAsync(async (req, res) => {
  // 1. Pick allows us to select only safe filter keys from the query string
  const filter = pick(req.query, ['name', 'role', 'email']);
  
  // 2. Pick options for sorting and pagination
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // 3. Call service to query DB
  const result = await userService.queryUsers(filter, options);
  
  res.send(result);
});

/**
 * Get a specific user by ID
 * GET /api/v1/users/:userId
 */
const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

/**
 * Update a user's details
 * PATCH /api/v1/users/:userId
 */
const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

/**
 * Delete a user
 * DELETE /api/v1/users/:userId
 */
const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  // 204 No Content is the standard response for successful deletion
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};