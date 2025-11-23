import apiClient from './client';
import {
  Grievance,
  CreateGrievanceRequest,
  UpdateGrievanceRequest,
  GrievanceFilters,
  PaginatedResponse,
} from '../types';

const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

export const grievanceService = {
  /**
   * Create a new grievance/complaint
   */
  createGrievance: async (data: CreateGrievanceRequest): Promise<Grievance> => {
    const formData = new FormData();
    
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    
    if (data.priority) {
      formData.append('priority', data.priority);
    }
    
    if (data.voiceAudio) {
      formData.append('voiceAudio', data.voiceAudio);
    }
    
    if (data.evidenceFiles) {
      data.evidenceFiles.forEach((file) => {
        formData.append('evidenceFiles', file);
      });
    }
    
    const response = await apiClient.post(
      `/api/${API_VERSION}/grievances`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },

  /**
   * Get all grievances with filters and pagination
   */
  getGrievances: async (
    filters?: GrievanceFilters
  ): Promise<PaginatedResponse<Grievance>> => {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(
      `/api/${API_VERSION}/grievances?${params.toString()}`
    );
    
    return response.data;
  },

  /**
   * Get a specific grievance by ID
   */
  getGrievance: async (id: string): Promise<Grievance> => {
    const response = await apiClient.get(`/api/${API_VERSION}/grievances/${id}`);
    return response.data;
  },

  /**
   * Update a grievance
   */
  updateGrievance: async (
    id: string,
    data: UpdateGrievanceRequest
  ): Promise<Grievance> => {
    const response = await apiClient.patch(
      `/api/${API_VERSION}/grievances/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a grievance
   */
  deleteGrievance: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/${API_VERSION}/grievances/${id}`);
  },

  /**
   * Update grievance status (Admin/Staff only)
   */
  updateStatus: async (id: string, status: string): Promise<Grievance> => {
    const response = await apiClient.patch(
      `/api/${API_VERSION}/grievances/${id}/status`,
      { status }
    );
    return response.data;
  },

  /**
   * Assign grievance to staff (Admin only)
   */
  assignGrievance: async (id: string, assignedTo: string): Promise<Grievance> => {
    const response = await apiClient.patch(
      `/api/${API_VERSION}/grievances/${id}/assign`,
      { assignedTo }
    );
    return response.data;
  },

  /**
   * Upload with progress tracking
   */
  createGrievanceWithProgress: async (
    data: CreateGrievanceRequest,
    onProgress: (progress: number) => void
  ): Promise<Grievance> => {
    const formData = new FormData();
    
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    
    if (data.priority) {
      formData.append('priority', data.priority);
    }
    
    if (data.voiceAudio) {
      formData.append('voiceAudio', data.voiceAudio);
    }
    
    if (data.evidenceFiles) {
      data.evidenceFiles.forEach((file) => {
        formData.append('evidenceFiles', file);
      });
    }
    
    const response = await apiClient.post(
      `/api/${API_VERSION}/grievances`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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

export default grievanceService;
