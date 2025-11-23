/**
 * API Services Export
 * Central export point for all API services
 */

// Core API client
export { default as apiClient } from './client';

// Authentication services
export { default as authService } from './auth.service';
export { default as userService } from './user.service';

// Feature services
export { default as grievanceService } from './grievance.service';
export { default as identityService } from './identity.service';
export { default as appService, systemService } from './app.service';

// API Configuration
export { API_CONFIG, API_ENDPOINTS, STORAGE_KEYS, HTTP_STATUS } from '../config/api';

// Re-export types for convenience
export type * from '../types';
