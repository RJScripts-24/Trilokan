import { AxiosError } from 'axios';
import { ApiError } from '../types';

export interface ErrorHandlerResult {
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export const handleApiError = (error: any): ErrorHandlerResult => {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        // Validation errors
        return {
          message: data.message || 'Invalid request',
          errors: data.errors || [],
        };
      
      case 401:
        // Unauthorized - redirect to login
        localStorage.clear();
        window.location.href = '/';
        return { message: 'Session expired, please login again' };
      
      case 403:
        return { message: 'You do not have permission to perform this action' };
      
      case 404:
        return { message: 'Resource not found' };
      
      case 409:
        return { message: data.message || 'Conflict - resource already exists' };
      
      case 429:
        return { message: 'Too many requests. Please try again later.' };
      
      case 500:
      case 502:
      case 503:
        return { message: 'Server error. Please try again later.' };
      
      default:
        return { message: data.message || 'An error occurred' };
    }
  } else if (error.request) {
    // Request made but no response
    return { message: 'Network error. Please check your connection.' };
  } else {
    // Something else happened
    return { message: error.message || 'An unexpected error occurred' };
  }
};

export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  return errors;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateFile = (
  file: File,
  type: 'image' | 'audio' | 'video' | 'document' | 'apk'
): void => {
  const allowedTypesMap: Record<string, string[]> = {
    image: (import.meta.env.VITE_ALLOWED_IMAGE_TYPES || '').split(','),
    audio: (import.meta.env.VITE_ALLOWED_AUDIO_TYPES || '').split(','),
    video: (import.meta.env.VITE_ALLOWED_VIDEO_TYPES || '').split(','),
    document: (import.meta.env.VITE_ALLOWED_DOCUMENT_TYPES || '').split(','),
    apk: (import.meta.env.VITE_ALLOWED_APK_TYPES || '').split(','),
  };

  const maxSizeMap: Record<string, number> = {
    image: Number(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760,
    audio: Number(import.meta.env.VITE_MAX_AUDIO_SIZE) || 20971520,
    video: Number(import.meta.env.VITE_MAX_VIDEO_SIZE) || 52428800,
    document: Number(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760,
    apk: Number(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760,
  };

  const allowedTypes = allowedTypesMap[type];
  const maxSize = maxSizeMap[type];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
  }
};
