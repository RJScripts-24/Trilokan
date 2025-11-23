import apiClient from './client';
import { API_ENDPOINTS, API_CONFIG } from '../config/api';
import type {
  Challenge,
  VerifyIdentityRequest,
  IdentityVerificationResult,
} from '../types';

/**
 * Identity Verification Service
 * Handles all identity verification API calls
 * Endpoints: /api/v1/identity/*
 */
export const identityService = {
  /**
   * Get liveness challenge
   * GET /api/v1/identity/challenge
   * Requires: Authentication
   * @returns Challenge object with ID and text
   */
  getChallenge: async (): Promise<Challenge> => {
    const response = await apiClient.get(API_ENDPOINTS.IDENTITY.CHALLENGE);
    return response.data;
  },

  /**
   * Verify identity with multi-modal verification
   * POST /api/v1/identity/verify
   * Requires: Authentication
   * Supports: Face video, voice audio, ID document uploads
   * @param data - Verification data (faceVideo required, others optional)
   * @returns Identity verification result
   */
  verifyIdentity: async (
    data: VerifyIdentityRequest
  ): Promise<IdentityVerificationResult> => {
    const formData = new FormData();
    
    // Required field
    formData.append('faceVideo', data.faceVideo);
    
    // Optional fields
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
      API_ENDPOINTS.IDENTITY.VERIFY,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.UPLOAD_TIMEOUT, // 60 seconds for ML processing
      }
    );
    
    return response.data;
  },

  /**
   * Verify identity with upload progress tracking
   * POST /api/v1/identity/verify (with progress callback)
   * Requires: Authentication
   * @param data - Verification data
   * @param onProgress - Progress callback (0-100)
   * @returns Identity verification result
   */
  verifyIdentityWithProgress: async (
    data: VerifyIdentityRequest,
    onProgress: (progress: number) => void
  ): Promise<IdentityVerificationResult> => {
    const formData = new FormData();
    
    // Required field
    formData.append('faceVideo', data.faceVideo);
    
    // Optional fields
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
      API_ENDPOINTS.IDENTITY.VERIFY,
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

  /**
   * Complete identity verification flow
   * Helper method that gets challenge and verifies identity
   * @param faceVideo - Face video file
   * @param voiceAudio - Voice audio file (optional)
   * @param idDocument - ID document file (optional)
   * @param onProgress - Progress callback (optional)
   * @returns Identity verification result
   */
  completeVerification: async (
    faceVideo: File,
    voiceAudio?: File,
    idDocument?: File,
    onProgress?: (progress: number) => void
  ): Promise<IdentityVerificationResult> => {
    // Get challenge first
    const challenge = await identityService.getChallenge();
    
    // Verify with challenge
    const verifyData: VerifyIdentityRequest = {
      faceVideo,
      voiceAudio,
      idDocument,
      challengeId: challenge.id,
    };
    
    if (onProgress) {
      return identityService.verifyIdentityWithProgress(verifyData, onProgress);
    } else {
      return identityService.verifyIdentity(verifyData);
    }
  },
};

export default identityService;
