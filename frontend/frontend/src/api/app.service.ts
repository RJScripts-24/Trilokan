import apiClient from './client';
import {
  VerifyAppFileRequest,
  VerifyAppPackageRequest,
  ReportAppRequest,
  AppVerificationResult,
} from '../types';

const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

export const appService = {
  /**
   * Verify APK file
   */
  verifyAppFile: async (appFile: File): Promise<AppVerificationResult> => {
    const formData = new FormData();
    formData.append('appFile', appFile);
    
    const response = await apiClient.post(
      `/api/${API_VERSION}/apps/verify-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for analysis
      }
    );
    
    return response.data;
  },

  /**
   * Verify app by package name
   */
  verifyAppPackage: async (
    packageName: string
  ): Promise<AppVerificationResult> => {
    const response = await apiClient.post(
      `/api/${API_VERSION}/apps/verify-package`,
      { packageName }
    );
    
    return response.data;
  },

  /**
   * Report suspicious app
   */
  reportApp: async (data: ReportAppRequest): Promise<void> => {
    const formData = new FormData();
    
    formData.append('packageName', data.packageName);
    formData.append('appName', data.appName);
    formData.append('reason', data.reason);
    formData.append('description', data.description);
    
    if (data.evidence) {
      data.evidence.forEach((file) => {
        formData.append('evidence', file);
      });
    }
    
    await apiClient.post(`/api/${API_VERSION}/apps/report`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Verify app file with progress tracking
   */
  verifyAppFileWithProgress: async (
    appFile: File,
    onProgress: (progress: number) => void
  ): Promise<AppVerificationResult> => {
    const formData = new FormData();
    formData.append('appFile', appFile);
    
    const response = await apiClient.post(
      `/api/${API_VERSION}/apps/verify-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
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

export default appService;
