/**
 * API Configuration
 * Central configuration for all API endpoints and settings
 */

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  VERSION: import.meta.env.VITE_API_VERSION || 'v1',
  TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  UPLOAD_TIMEOUT: Number(import.meta.env.VITE_API_UPLOAD_TIMEOUT) || 60000,
} as const;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: `/api/${API_CONFIG.VERSION}/auth/register`,
    LOGIN: `/api/${API_CONFIG.VERSION}/auth/login`,
    LOGOUT: `/api/${API_CONFIG.VERSION}/auth/logout`,
    REFRESH_TOKENS: `/api/${API_CONFIG.VERSION}/auth/refresh-tokens`,
  },
  
  // User endpoints
  USERS: {
    BASE: `/api/${API_CONFIG.VERSION}/users`,
    REGISTER: `/api/${API_CONFIG.VERSION}/users/register`,
    LOGIN: `/api/${API_CONFIG.VERSION}/users/login`,
    PROFILE: `/api/${API_CONFIG.VERSION}/users/profile`,
    LOGOUT: `/api/${API_CONFIG.VERSION}/users/logout`,
    BY_ID: (userId: string) => `/api/${API_CONFIG.VERSION}/users/${userId}`,
  },
  
  // Grievance endpoints
  GRIEVANCES: {
    BASE: `/api/${API_CONFIG.VERSION}/grievances`,
    BY_ID: (id: string) => `/api/${API_CONFIG.VERSION}/grievances/${id}`,
    STATUS: (id: string) => `/api/${API_CONFIG.VERSION}/grievances/${id}/status`,
    ASSIGN: (id: string) => `/api/${API_CONFIG.VERSION}/grievances/${id}/assign`,
  },
  
  // Identity verification endpoints
  IDENTITY: {
    CHALLENGE: `/api/${API_CONFIG.VERSION}/identity/challenge`,
    VERIFY: `/api/${API_CONFIG.VERSION}/identity/verify`,
  },
  
  // App verification endpoints
  APPS: {
    VERIFY_FILE: `/api/${API_CONFIG.VERSION}/apps/verify-file`,
    VERIFY_PACKAGE: `/api/${API_CONFIG.VERSION}/apps/verify-package`,
    REPORT: `/api/${API_CONFIG.VERSION}/apps/report`,
  },
  
  // System endpoints
  SYSTEM: {
    HEALTH: `/api/${API_CONFIG.VERSION}/app/health`,
    CONFIG: `/api/${API_CONFIG.VERSION}/app/config`,
    FEEDBACK: `/api/${API_CONFIG.VERSION}/app/feedback`,
    ENUMS: `/api/${API_CONFIG.VERSION}/app/enums`,
    DOCS: `/api/${API_CONFIG.VERSION}/docs`,
    DOCS_JSON: `/api/${API_CONFIG.VERSION}/docs/json`,
  },
} as const;

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
