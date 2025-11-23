import apiClient from './client';
import {
  Challenge,
  VerifyIdentityRequest,
  IdentityVerificationResult,
} from '../types';

const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

export const identityService = {
  /**
   * Get liveness challenge
   */
  getChallenge: async (): Promise<Challenge> => {
    const response = await apiClient.get(`/api/${API_VERSION}/identity/challenge`);
    return response.data;
  },

  /**
   * Verify identity with multi-modal verification
   */
  verifyIdentity: async (
    data: VerifyIdentityRequest
  ): Promise<IdentityVerificationResult> => {
    const formData = new FormData();
    
    formData.append('faceVideo', data.faceVideo);
    
    if (data.voiceAudio) {
      formData.append('voiceAudio', data.voiceAudio);
    }
    
    if (data.idDocument) {
      formData.append('idDocument', data.idDocument);
    }
    
    if (data.challengeId) {
      formData.append('challengeId', data.challengeId);
    }
    
    const response = await apiClient.post(
      `/api/${API_VERSION}/identity/verify`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for ML processing
      }
    );
    
    return response.data;
  },

  /**
   * Verify identity with progress tracking
   */
  verifyIdentityWithProgress: async (
    data: VerifyIdentityRequest,
    onProgress: (progress: number) => void
  ): Promise<IdentityVerificationResult> => {
    const formData = new FormData();
    
    formData.append('faceVideo', data.faceVideo);
    
    if (data.voiceAudio) {
      formData.append('voiceAudio', data.voiceAudio);
    }
    
    if (data.idDocument) {
      formData.append('idDocument', data.idDocument);
    }
    
    if (data.challengeId) {
      formData.append('challengeId', data.challengeId);
    }
    
    const response = await apiClient.post(
      `/api/${API_VERSION}/identity/verify`,
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

export default identityService;
