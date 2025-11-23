import apiClient from './client';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/api';
import type {
  User,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UpdateUserProfileRequest,
  PaginatedResponse,
} from '../types';

/**
 * User Service
 * Handles all user-related API calls
 * Endpoints: /api/v1/users/*
 */
export const userService = {
  /**
   * Register a new user (alternative endpoint)
   * POST /api/v1/users/register
   * @param data - Registration data
   * @returns AuthResponse with user and tokens
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.USERS.REGISTER, data);
    
    // Auto-store auth data on successful registration
    if (response.data) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.tokens.access.token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.tokens.refresh.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  /**
   * Login user (alternative endpoint)
   * POST /api/v1/users/login
   * @param data - Login credentials
   * @returns AuthResponse with user and tokens
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.USERS.LOGIN, data);
    
    // Auto-store auth data on successful login
    if (response.data) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.tokens.access.token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.tokens.refresh.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  /**
   * Get current user profile
   * GET /api/v1/users/profile
   * Requires: Authentication
   * @returns User profile
   */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get(API_ENDPOINTS.USERS.PROFILE);
    
    // Update stored user data
    if (response.data) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
    }
    
    return response.data;
  },

  /**
   * Update user profile
   * PATCH /api/v1/users/profile
   * Requires: Authentication
   * @param data - Updated profile data
   * @returns Updated user profile
   */
  updateProfile: async (data: UpdateUserProfileRequest): Promise<User> => {
    const response = await apiClient.patch(API_ENDPOINTS.USERS.PROFILE, data);
    
    // Update stored user data
    if (response.data) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
    }
    
    return response.data;
  },

  /**
   * Logout user (alternative endpoint)
   * POST /api/v1/users/logout
   * Requires: Authentication
   */
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    try {
      if (refreshToken) {
        await apiClient.post(API_ENDPOINTS.USERS.LOGOUT, { refreshToken });
      }
    } finally {
      // Always clear local storage
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },

  /**
   * Get all users (Admin only)
   * GET /api/v1/users
   * Requires: Authentication, Admin role
   * @param params - Query parameters (page, limit, role, etc.)
   * @returns Paginated list of users
   */
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    sortBy?: string;
  }): Promise<PaginatedResponse<User>> => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    
    const response = await apiClient.get(
      `${API_ENDPOINTS.USERS.BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    
    return response.data;
  },

  /**
   * Delete user (Admin only)
   * DELETE /api/v1/users/:userId
   * Requires: Authentication, Admin role
   * @param userId - User ID to delete
   */
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.USERS.BY_ID(userId));
  },

  /**
   * Get user by ID (Admin only)
   * GET /api/v1/users/:userId
   * Requires: Authentication, Admin role
   * @param userId - User ID
   * @returns User data
   */
  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get(API_ENDPOINTS.USERS.BY_ID(userId));
    return response.data;
  },
};

export default userService;
