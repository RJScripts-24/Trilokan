import apiClient from './client';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/api';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from '../types';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 * Endpoints: /api/v1/auth/*
 */
export const authService = {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   * @param data - Registration data (email, password, name, phoneNumber)
   * @returns AuthResponse with user and tokens
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
    
    // Auto-store auth data on successful registration
    if (response.data) {
      authService.storeAuthData(response.data);
    }
    
    return response.data;
  },

  /**
   * Login user
   * POST /api/v1/auth/login
   * @param data - Login credentials (email, password)
   * @returns AuthResponse with user and tokens
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, data);
    
    // Auto-store auth data on successful login
    if (response.data) {
      authService.storeAuthData(response.data);
    }
    
    return response.data;
  },

  /**
   * Logout user
   * POST /api/v1/auth/logout
   * Requires: Authentication
   */
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    try {
      if (refreshToken) {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
      }
    } finally {
      // Always clear local storage even if API call fails
      authService.clearAuthData();
    }
  },

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-tokens
   * @param refreshToken - Refresh token
   * @returns New tokens
   */
  refreshTokens: async (refreshToken: string): Promise<AuthResponse['tokens']> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKENS, {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user from localStorage
   * @returns User object or null
   */
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  },

  /**
   * Store auth data in localStorage
   * @param authResponse - Auth response from login/register
   */
  storeAuthData: (authResponse: AuthResponse): void => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authResponse.tokens.access.token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authResponse.tokens.refresh.token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authResponse.user));
  },

  /**
   * Clear all auth data from localStorage
   */
  clearAuthData: (): void => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  /**
   * Check if user is authenticated
   * @returns boolean
   */
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  },

  /**
   * Check if user has specific role
   * @param requiredRoles - Array of allowed roles
   * @returns boolean
   */
  hasRole: (requiredRoles: string[]): boolean => {
    const user = authService.getCurrentUser();
    return user !== null && requiredRoles.includes(user.role);
  },

  /**
   * Check if user is admin
   * @returns boolean
   */
  isAdmin: (): boolean => {
    return authService.hasRole(['admin']);
  },

  /**
   * Check if user is staff (admin or official)
   * @returns boolean
   */
  isStaff: (): boolean => {
    return authService.hasRole(['admin', 'official']);
  },

  /**
   * Get access token
   * @returns Access token or null
   */
  getAccessToken: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Get refresh token
   * @returns Refresh token or null
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
};

export default authService;
