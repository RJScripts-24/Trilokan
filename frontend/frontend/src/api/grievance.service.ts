import apiClient from './client';
import { API_ENDPOINTS, API_CONFIG } from '../config/api';
import type {
  Grievance,
  CreateGrievanceRequest,
  UpdateGrievanceRequest,
  GrievanceFilters,
  PaginatedResponse,
} from '../types';

/**
 * Grievance Service
 * Handles all grievance/complaint-related API calls
 * Endpoints: /api/v1/grievances/*
 */
export const grievanceService = {
  /**
   * Create a new grievance/complaint
   * POST /api/v1/grievances
   * Requires: Authentication
   * Supports: File uploads (multipart/form-data)
   * @param data - Grievance data with optional files
   * @returns Created grievance
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
    
    if (data.evidenceFiles && data.evidenceFiles.length > 0) {
      data.evidenceFiles.forEach((file) => {
        formData.append('evidenceFiles', file);
      });
    }
    
    const response = await apiClient.post(
      API_ENDPOINTS.GRIEVANCES.BASE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.UPLOAD_TIMEOUT,
      }
    );
    
    return response.data;
  },

  /**
   * Get all grievances with filters and pagination
   * GET /api/v1/grievances
   * Requires: Authentication
   * @param filters - Filter and pagination options
   * @returns Paginated list of grievances
   */
  getGrievances: async (
    filters?: GrievanceFilters
  ): Promise<PaginatedResponse<Grievance>> => {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    
    const queryString = params.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.GRIEVANCES.BASE}?${queryString}`
      : API_ENDPOINTS.GRIEVANCES.BASE;
    
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get a specific grievance by ID
   * GET /api/v1/grievances/:grievanceId
   * Requires: Authentication
   * @param id - Grievance ID
   * @returns Grievance details
   */
  getGrievance: async (id: string): Promise<Grievance> => {
    const response = await apiClient.get(API_ENDPOINTS.GRIEVANCES.BY_ID(id));
    return response.data;
  },

  /**
   * Update a grievance
   * PATCH /api/v1/grievances/:grievanceId
   * Requires: Authentication
   * @param id - Grievance ID
   * @param data - Updated grievance data
   * @returns Updated grievance
   */
  updateGrievance: async (
    id: string,
    data: UpdateGrievanceRequest
  ): Promise<Grievance> => {
    const response = await apiClient.patch(
      API_ENDPOINTS.GRIEVANCES.BY_ID(id),
      data
    );
    return response.data;
  },

  /**
   * Delete a grievance
   * DELETE /api/v1/grievances/:grievanceId
   * Requires: Authentication
   * @param id - Grievance ID
   */
  deleteGrievance: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.GRIEVANCES.BY_ID(id));
  },

  /**
   * Update grievance status (Admin/Staff only)
   * PATCH /api/v1/grievances/:grievanceId/status
   * Requires: Authentication, Admin or Official role
   * @param id - Grievance ID
   * @param status - New status
   * @returns Updated grievance
   */
  updateStatus: async (
    id: string, 
    status: string,
    resolutionNotes?: string
  ): Promise<Grievance> => {
    const response = await apiClient.patch(
      API_ENDPOINTS.GRIEVANCES.STATUS(id),
      { status, resolutionNotes }
    );
    return response.data;
  },

  /**
   * Assign grievance to staff (Admin only)
   * PATCH /api/v1/grievances/:grievanceId/assign
   * Requires: Authentication, Admin role
   * @param id - Grievance ID
   * @param assignedTo - User ID to assign to
   * @returns Updated grievance
   */
  assignGrievance: async (id: string, assignedTo: string): Promise<Grievance> => {
    const response = await apiClient.patch(
      API_ENDPOINTS.GRIEVANCES.ASSIGN(id),
      { assignedTo }
    );
    return response.data;
  },

  /**
   * Create grievance with upload progress tracking
   * POST /api/v1/grievances (with progress callback)
   * Requires: Authentication
   * @param data - Grievance data with optional files
   * @param onProgress - Progress callback (0-100)
   * @returns Created grievance
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
    
    if (data.evidenceFiles && data.evidenceFiles.length > 0) {
      data.evidenceFiles.forEach((file) => {
        formData.append('evidenceFiles', file);
      });
    }
    
    const response = await apiClient.post(
      API_ENDPOINTS.GRIEVANCES.BASE,
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
   * Get grievance statistics (for dashboard)
   * Helper method to aggregate grievance data
   * @returns Statistics object
   */
  getStatistics: async (): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> => {
    const response = await grievanceService.getGrievances({ limit: 1000 });
    const grievances = response.results;
    
    const stats = {
      total: response.totalResults,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };
    
    grievances.forEach((g) => {
      stats.byStatus[g.status] = (stats.byStatus[g.status] || 0) + 1;
      stats.byCategory[g.category] = (stats.byCategory[g.category] || 0) + 1;
      stats.byPriority[g.priority] = (stats.byPriority[g.priority] || 0) + 1;
    });
    
    return stats;
  },
};

export default grievanceService;
