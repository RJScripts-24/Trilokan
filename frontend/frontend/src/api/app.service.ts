import apiClient from './client';
import { API_ENDPOINTS, API_CONFIG } from '../config/api';
import type {
  AppVerificationResult,
  ReportAppRequest,
  SystemHealth,
  SystemConfig,
  FeedbackRequest,
  SystemEnums,
} from '../types';

/**
 * App Verification Service
 * Handles all app verification and reporting API calls
 * Endpoints: /api/v1/apps/*
 */
export const appService = {
  /**
   * Verify APK file
   * POST /api/v1/apps/verify-file
   * Requires: Authentication
   * @param appFile - APK file to verify
   * @returns Verification result with trust score and analysis
   */
  verifyAppFile: async (appFile: File): Promise<AppVerificationResult> => {
    const formData = new FormData();
    formData.append('appFile', appFile);
    
    const response = await apiClient.post(
      API_ENDPOINTS.APPS.VERIFY_FILE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.UPLOAD_TIMEOUT, // 60 seconds for analysis
      }
    );
    
    return response.data;
  },

  /**
   * Verify app by package name
   * POST /api/v1/apps/verify-package
   * Requires: Authentication
   * @param packageName - Android package name (e.g., com.example.app)
   * @returns Verification result
   */
  verifyAppPackage: async (
    packageName: string
  ): Promise<AppVerificationResult> => {
    const response = await apiClient.post(
      API_ENDPOINTS.APPS.VERIFY_PACKAGE,
      { packageName }
    );
    
    return response.data;
  },

  /**
   * Report suspicious app
   * POST /api/v1/apps/report
   * Requires: Authentication
   * @param data - Report data (package name, reason, evidence files)
   */
  reportApp: async (data: ReportAppRequest): Promise<void> => {
    const formData = new FormData();
    
    formData.append('packageName', data.packageName);
    formData.append('appName', data.appName);
    formData.append('reason', data.reason);
    formData.append('description', data.description);
    
    if (data.evidence && data.evidence.length > 0) {
      data.evidence.forEach((file) => {
        formData.append('evidence', file);
      });
    }
    
    await apiClient.post(API_ENDPOINTS.APPS.REPORT, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Verify app file with upload progress tracking
   * POST /api/v1/apps/verify-file (with progress callback)
   * Requires: Authentication
   * @param appFile - APK file to verify
   * @param onProgress - Progress callback (0-100)
   * @returns Verification result
   */
  verifyAppFileWithProgress: async (
    appFile: File,
    onProgress: (progress: number) => void
  ): Promise<AppVerificationResult> => {
    const formData = new FormData();
    formData.append('appFile', appFile);
    
    const response = await apiClient.post(
      API_ENDPOINTS.APPS.VERIFY_FILE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.UPLOAD_TIMEOUT,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );
    
    return response.data;
  },
};

/**
 * System Service
 * Handles system-level API calls (health, config, feedback)
 * Endpoints: /api/v1/app/*
 */
export const systemService = {
  /**
   * Check system health
   * GET /api/v1/app/health
   * No authentication required
   * @returns Health status
   */
  getHealth: async (): Promise<SystemHealth> => {
    const response = await apiClient.get(API_ENDPOINTS.SYSTEM.HEALTH);
    return response.data;
  },

  /**
   * Get application configuration
   * GET /api/v1/app/config
   * No authentication required
   * @returns System configuration
   */
  getConfig: async (): Promise<SystemConfig> => {
    const response = await apiClient.get(API_ENDPOINTS.SYSTEM.CONFIG);
    return response.data;
  },

  /**
   * Submit user feedback
   * POST /api/v1/app/feedback
   * Requires: Authentication
   * @param data - Feedback data
   */
  submitFeedback: async (data: FeedbackRequest): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.SYSTEM.FEEDBACK, data);
  },

  /**
   * Get system enums/constants
   * GET /api/v1/app/enums
   * No authentication required
   * @returns System enums and constants
   */
  getEnums: async (): Promise<SystemEnums> => {
    const response = await apiClient.get(API_ENDPOINTS.SYSTEM.ENUMS);
    return response.data;
  },

  /**
   * Get API documentation URL
   * @returns Swagger docs URL
   */
  getDocsUrl: (): string => {
    return `${API_CONFIG.BASE_URL}${API_ENDPOINTS.SYSTEM.DOCS}`;
  },

  /**
   * Get OpenAPI JSON URL
   * @returns OpenAPI JSON URL
   */
  getDocsJsonUrl: (): string => {
    return `${API_CONFIG.BASE_URL}${API_ENDPOINTS.SYSTEM.DOCS_JSON}`;
  },
};

export default appService;
