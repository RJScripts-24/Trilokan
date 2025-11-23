// ===========================
// User Types
// ===========================
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'official' | 'admin';
  isIdentityVerified: boolean;
  preferredLanguage: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  name?: string;
  phoneNumber?: string;
  preferredLanguage?: string;
}

// ===========================
// Auth Types
// ===========================
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: {
      token: string;
      expires: string;
    };
    refresh: {
      token: string;
      expires: string;
    };
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

// ===========================
// Grievance/Complaint Types
// ===========================
export interface Grievance {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  userId: string;
  assignedTo?: string;
  attachments: string[];
  resolutionNotes?: string;
  aiAnalysis?: {
    categories: Array<{
      name: string;
      confidence: number;
    }>;
    sentiment?: {
      label: 'positive' | 'neutral' | 'negative';
      score: number;
    };
    priority?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateGrievanceRequest {
  title: string;
  description: string;
  category: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  voiceAudio?: File;
  evidenceFiles?: File[];
}

export interface UpdateGrievanceRequest {
  title?: string;
  description?: string;
  category?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  status?: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  resolutionNotes?: string;
}

export interface GrievanceFilters {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

// ===========================
// Pagination Types
// ===========================
export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

// ===========================
// Identity Verification Types
// ===========================
export interface Challenge {
  id: string;
  text: string;
  expiresAt: string;
}

export interface VerifyIdentityRequest {
  faceVideo: File;
  voiceAudio?: File;
  idDocument?: File;
  challengeId?: string;
}

export interface IdentityVerificationResult {
  verified: boolean;
  confidence: number;
  results: {
    faceMatch?: number;
    voiceMatch?: number;
    documentVerified?: boolean;
    livenessScore?: number;
  };
  warnings?: string[];
  recommendations?: string;
}

// ===========================
// App Verification Types
// ===========================
export interface VerifyAppFileRequest {
  appFile: File;
}

export interface VerifyAppPackageRequest {
  packageName: string;
}

export interface ReportAppRequest {
  packageName: string;
  appName: string;
  reason: string;
  description: string;
  evidence?: File[];
}

export interface AppVerificationResult {
  isSafe: boolean;
  trustScore: number;
  analysis: {
    packageName: string;
    appName: string;
    version: string;
    developer: string;
    isOfficial: boolean;
    permissions: Array<{
      name: string;
      risk: 'low' | 'medium' | 'high';
    }>;
    malwareDetected: boolean;
    signatures: {
      valid: boolean;
      issuer?: string;
    };
  };
  warnings: string[];
  recommendations: string;
}

// ===========================
// System/App Types
// ===========================
export interface SystemHealth {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services?: {
    database?: 'ok' | 'down';
    ml?: 'ok' | 'down';
    storage?: 'ok' | 'down';
  };
}

export interface SystemConfig {
  environment: string;
  version: string;
  features: {
    identityVerification: boolean;
    appVerification: boolean;
    voiceComplaints: boolean;
    mlAnalysis: boolean;
  };
}

export interface FeedbackRequest {
  type: 'bug' | 'feature' | 'general';
  subject: string;
  message: string;
  email?: string;
}

export interface SystemEnums {
  grievanceCategories: string[];
  grievancePriorities: string[];
  grievanceStatuses: string[];
  userRoles: string[];
  languages: string[];
}

// ===========================
// Error Types
// ===========================
export interface ApiError {
  code: number;
  message: string;
  requestId?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// ===========================
// API Response Type
// ===========================
export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
}
