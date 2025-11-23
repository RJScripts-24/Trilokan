import apiClient from './client';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  LogoutRequest,
} from '../types';

const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

export const authService = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(`/api/${API_VERSION}/auth/register`, data);
    return response.data;
  },

  /**
   * Login user
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(`/api/${API_VERSION}/auth/login`, data);
    return response.data;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await apiClient.post(`/api/${API_VERSION}/auth/logout`, { refreshToken });
    }
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  /**
   * Refresh access token
   */
  refreshTokens: async (refreshToken: string): Promise<AuthResponse['tokens']> => {
    const response = await apiClient.post(`/api/${API_VERSION}/auth/refresh-tokens`, {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Store auth data in localStorage
   */
  storeAuthData: (authResponse: AuthResponse) => {
    localStorage.setItem('accessToken', authResponse.tokens.access.token);
    localStorage.setItem('refreshToken', authResponse.tokens.refresh.token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('accessToken');
    return !!token;
  },

  /**
   * Check if user has specific role
   */
  hasRole: (requiredRoles: string[]): boolean => {
    const user = authService.getCurrentUser();
    return user && requiredRoles.includes(user.role);
  },
};

export default authService;
