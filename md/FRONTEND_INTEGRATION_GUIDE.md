# Frontend Integration Guide for Trilokan Backend

**Version:** 1.0.0  
**Last Updated:** November 23, 2025  
**Backend Architecture:** Multi-service (API Gateway + 3 ML Microservices)

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Base Configuration](#base-configuration)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Data Models & Schemas](#data-models--schemas)
6. [File Upload Specifications](#file-upload-specifications)
7. [Error Handling](#error-handling)
8. [State Management Requirements](#state-management-requirements)
9. [Real-time Features](#real-time-features)
10. [Security Considerations](#security-considerations)
11. [Testing & Validation](#testing--validation)

---

## 🏗️ System Overview

### Architecture
```
Frontend Application
        ↓
API Gateway (Port 3000)
        ↓
┌───────────────┬──────────────────┬─────────────────┐
│               │                  │                 │
Complaint ML    Identity Verifier  App Crawler      PostgreSQL
(Port 5000)     (Port 5002)        (Port 5001)      (Port 5432)
```

### Service Responsibilities

| Service | Port | Purpose | Frontend Usage |
|---------|------|---------|----------------|
| **API Gateway** | 3000 | Main entry point | All frontend requests go here |
| Complaint ML | 5000 | NLP, Categorization, Transcription | Internal only (via gateway) |
| Identity Verifier | 5002 | Face/Voice/Document verification | Internal only (via gateway) |
| App Crawler | 5001 | APK safety analysis | Internal only (via gateway) |
| PostgreSQL | 5432 | Database | Internal only |

**⚠️ CRITICAL:** Frontend should **ONLY** communicate with the API Gateway (Port 3000). Never make direct requests to ML services.

---

## ⚙️ Base Configuration

### Environment Variables (Frontend .env)

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
# Production: https://api.trilokan.com

VITE_API_VERSION=v1
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_ENABLE_VOICE_COMPLAINTS=true
VITE_ENABLE_IDENTITY_VERIFICATION=true
VITE_ENABLE_APP_VERIFICATION=true

# Upload Limits (must match backend)
VITE_MAX_FILE_SIZE=10485760
# 10MB in bytes
VITE_MAX_VIDEO_SIZE=52428800
# 50MB for identity videos

# Supported File Types
VITE_ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/jpg
VITE_ALLOWED_AUDIO_TYPES=audio/mpeg,audio/wav,audio/mp3,audio/m4a
VITE_ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/quicktime
VITE_ALLOWED_DOCUMENT_TYPES=application/pdf,image/jpeg,image/png
```

### Axios/Fetch Configuration

```typescript
// api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Add Auth Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Handle Token Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Token expired - attempt refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/refresh-tokens`,
          { refreshToken }
        );
        
        // Update tokens
        localStorage.setItem('accessToken', data.access.token);
        localStorage.setItem('refreshToken', data.refresh.token);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.access.token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 🔐 Authentication & Authorization

### 1. User Registration

**Endpoint:** `POST /api/v1/auth/register`

```typescript
// types/auth.ts
interface RegisterRequest {
  email: string;        // Valid email format
  password: string;     // Min 8 chars, 1 letter, 1 number
  name: string;         // Full name
  phoneNumber?: string; // Optional, format: "+919876543210"
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'official' | 'admin';
    isIdentityVerified: boolean;
    preferredLanguage: string;
    createdAt: string;
    updatedAt: string;
  };
  tokens: {
    access: {
      token: string;
      expires: string;  // ISO 8601 datetime
    };
    refresh: {
      token: string;
      expires: string;
    };
  };
}

// api/auth.ts
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiClient.post('/api/v1/auth/register', data);
  return response.data;
};
```

**Frontend Actions:**
1. Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
2. Show password strength indicator
3. On success, store tokens in localStorage
4. Redirect to dashboard or identity verification page

### 2. User Login

**Endpoint:** `POST /api/v1/auth/login`

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post('/api/v1/auth/login', data);
  return response.data;
};
```

**Frontend Actions:**
1. Store `accessToken` and `refreshToken` in localStorage
2. Store user data in state management (Redux/Zustand)
3. Set axios default headers
4. Redirect based on role:
   - `user` → Dashboard
   - `official/admin` → Admin Dashboard

### 3. Token Management

**Access Token:** 
- Expires in **30 minutes**
- Include in all API requests: `Authorization: Bearer {token}`

**Refresh Token:**
- Expires in **30 days**
- Used to get new access tokens
- Endpoint: `POST /api/v1/auth/refresh-tokens`

```typescript
interface RefreshTokenRequest {
  refreshToken: string;
}

export const refreshTokens = async (refreshToken: string): Promise<AuthResponse['tokens']> => {
  const response = await apiClient.post('/api/v1/auth/refresh-tokens', {
    refreshToken,
  });
  return response.data;
};
```

### 4. Logout

**Endpoint:** `POST /api/v1/auth/logout`

```typescript
interface LogoutRequest {
  refreshToken: string;
}

export const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('refreshToken');
  await apiClient.post('/api/v1/auth/logout', { refreshToken });
  
  // Clear local storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};
```

### 5. Role-Based Access Control (RBAC)

**User Roles:**

| Role | Access Level | Permissions |
|------|--------------|-------------|
| `user` | Standard | Create/view own grievances, verify identity |
| `official` | Staff | View/update all grievances, identity verified required |
| `admin` | Full | All permissions, assign grievances, manage users |

**Frontend Route Protection:**

```typescript
// utils/auth.ts
export const hasRole = (requiredRoles: string[]): boolean => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return requiredRoles.includes(user.role);
};

// Route guard example (React Router)
const ProtectedRoute = ({ roles, children }) => {
  const user = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" />;
  }
  
  return children;
};
```

---

## 📡 API Endpoints Reference

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.trilokan.com/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login user |
| POST | `/auth/logout` | None | Logout user |
| POST | `/auth/refresh-tokens` | None | Refresh access token |

### Grievance Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/grievances` | ✅ | All | Create grievance |
| GET | `/grievances` | ✅ | All | List grievances (filtered by role) |
| GET | `/grievances/:id` | ✅ | All | Get specific grievance |
| PATCH | `/grievances/:id` | ✅ | Owner/Admin | Update grievance |
| DELETE | `/grievances/:id` | ✅ | Owner/Admin | Delete grievance |
| PATCH | `/grievances/:id/status` | ✅ | Admin/Staff | Update status |
| PATCH | `/grievances/:id/assign` | ✅ | Admin | Assign to staff |

### Identity Verification Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/challenge` | ✅ | Get liveness challenge |
| POST | `/identity/verify` | ✅ | Verify identity (multi-modal) |

### App Verification Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/apps/verify-file` | ✅ | Verify APK file |
| POST | `/apps/verify-package` | ✅ | Verify by package name |
| POST | `/apps/report` | ✅ | Report suspicious app |

### System Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/metrics` | None | Prometheus metrics |
| GET | `/docs` | None | Swagger API docs |

---

## 📊 Data Models & Schemas

### User Model

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'official' | 'admin';
  isIdentityVerified: boolean;
  preferredLanguage: string; // 'en', 'hi', 'ta', etc.
  createdAt: string;
  updatedAt: string;
}
```

### Grievance Model

```typescript
interface Grievance {
  id: string;
  title: string;
  description: string;
  category: string;
  // Categories: 'document_forgery', 'identity_theft', 'phishing_attempt',
  // 'financial_fraud', 'trust_verification', 'malware_suspicion'
  
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  
  userId: string;
  assignedTo?: string;
  
  attachments: string[]; // Array of file URLs
  resolutionNotes?: string;
  
  // AI Analysis Results
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
```

### Identity Verification Result

```typescript
interface IdentityVerificationResult {
  verified: boolean;
  confidence: number; // 0-1
  
  results: {
    faceMatch?: number;
    voiceMatch?: number;
    documentVerified?: boolean;
    livenessScore?: number;
  };
  
  warnings?: string[];
  recommendations?: string;
}
```

### App Verification Result

```typescript
interface AppVerificationResult {
  isSafe: boolean;
  trustScore: number; // 0-1
  
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
```

---

## 📤 File Upload Specifications

### General Upload Configuration

```typescript
// Upload limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB

// Allowed MIME types
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/jpg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf', 'image/jpeg', 'image/png'],
  apk: ['application/vnd.android.package-archive'],
};
```

### 1. Create Grievance with Files

**Endpoint:** `POST /api/v1/grievances`  
**Content-Type:** `multipart/form-data`

```typescript
interface CreateGrievanceRequest {
  title: string;
  description: string;
  category: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  
  // Optional audio transcription
  voiceAudio?: File; // Audio file for transcription
  
  // Evidence files
  evidenceFiles?: File[]; // Array of images/PDFs
}

// Frontend implementation
const createGrievance = async (data: CreateGrievanceRequest) => {
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
  
  const response = await apiClient.post('/api/v1/grievances', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};
```

**Response:**
```typescript
{
  id: "uuid",
  title: "...",
  description: "...",
  category: "financial_fraud",
  priority: "High",
  status: "Open",
  userId: "uuid",
  attachments: [
    "https://cdn.trilokan.com/uploads/evidence-123.jpg",
    "https://cdn.trilokan.com/uploads/evidence-124.pdf"
  ],
  aiAnalysis: {
    categories: [
      { name: "Financial Fraud", confidence: 0.92 }
    ],
    priority: "High"
  },
  createdAt: "2025-11-23T10:30:00Z",
  updatedAt: "2025-11-23T10:30:00Z"
}
```

### 2. Identity Verification with Files

**Endpoint:** `POST /api/v1/identity/verify`  
**Content-Type:** `multipart/form-data`

```typescript
interface VerifyIdentityRequest {
  faceVideo: File;      // Required - MP4/WebM
  voiceAudio?: File;    // Optional - MP3/WAV
  idDocument?: File;    // Optional - JPEG/PNG/PDF
  challengeId?: string; // From /identity/challenge
}

const verifyIdentity = async (data: VerifyIdentityRequest) => {
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
  
  const response = await apiClient.post('/api/v1/identity/verify', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60 seconds for ML processing
  });
  
  return response.data;
};
```

### 3. App Verification (APK Upload)

**Endpoint:** `POST /api/v1/apps/verify-file`  
**Content-Type:** `multipart/form-data`

```typescript
const verifyApp = async (apkFile: File) => {
  const formData = new FormData();
  formData.append('appFile', apkFile);
  
  const response = await apiClient.post('/api/v1/apps/verify-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
  
  return response.data;
};
```

### File Upload Progress Tracking

```typescript
const uploadWithProgress = async (
  url: string,
  formData: FormData,
  onProgress: (progress: number) => void
) => {
  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    },
  });
};
```

---

## ⚠️ Error Handling

### Error Response Format

All errors follow a consistent structure:

```typescript
interface ErrorResponse {
  code: number;        // HTTP status code
  message: string;     // Human-readable error message
  requestId?: string;  // Correlation ID for debugging
  errors?: Array<{     // Validation errors
    field: string;
    message: string;
  }>;
}
```

### Common Error Codes

| Code | Error | Frontend Action |
|------|-------|-----------------|
| 400 | Bad Request | Show validation errors to user |
| 401 | Unauthorized | Redirect to login, attempt token refresh |
| 403 | Forbidden | Show "Access Denied" message |
| 404 | Not Found | Show "Resource not found" |
| 409 | Conflict | Show "Email already exists" (registration) |
| 429 | Rate Limit | Show "Too many requests, try again later" |
| 500 | Server Error | Show generic error, report to monitoring |
| 503 | Service Unavailable | Show "Service temporarily down" |

### Error Handling Implementation

```typescript
// utils/errorHandler.ts
export const handleApiError = (error: any) => {
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
        window.location.href = '/login';
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
```

---

## 🗃️ State Management Requirements

### User State

```typescript
interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

// Actions needed
const userActions = {
  login: (email: string, password: string) => void;
  register: (data: RegisterRequest) => void;
  logout: () => void;
  refreshToken: () => void;
  updateProfile: (data: Partial<User>) => void;
};
```

### Grievance State

```typescript
interface GrievanceState {
  grievances: Grievance[];
  currentGrievance: Grievance | null;
  filters: {
    status?: string;
    category?: string;
    priority?: string;
  };
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
  loading: boolean;
  error: string | null;
}

// Actions needed
const grievanceActions = {
  fetchGrievances: (filters?: any, page?: number) => void;
  fetchGrievance: (id: string) => void;
  createGrievance: (data: CreateGrievanceRequest) => void;
  updateGrievance: (id: string, data: any) => void;
  deleteGrievance: (id: string) => void;
  updateStatus: (id: string, status: string) => void;
};
```

### Identity Verification State

```typescript
interface IdentityState {
  challenge: {
    text: string;
    id: string;
    expiresAt: string;
  } | null;
  verificationResult: IdentityVerificationResult | null;
  loading: boolean;
  error: string | null;
}
```

---

## 🔄 Real-time Features

### Polling for Status Updates

Since WebSockets are not implemented, use polling for real-time updates:

```typescript
// Grievance status polling
const useGrievancePolling = (grievanceId: string, interval = 5000) => {
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  
  useEffect(() => {
    const fetchGrievance = async () => {
      try {
        const data = await apiClient.get(`/api/v1/grievances/${grievanceId}`);
        setGrievance(data.data);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    
    // Initial fetch
    fetchGrievance();
    
    // Poll every 5 seconds
    const intervalId = setInterval(fetchGrievance, interval);
    
    return () => clearInterval(intervalId);
  }, [grievanceId, interval]);
  
  return grievance;
};
```

### Notification System

Implement a notification system to show updates:

```typescript
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

// Example: Show notification when grievance status changes
useEffect(() => {
  if (previousStatus && grievance.status !== previousStatus) {
    showNotification({
      type: 'info',
      message: `Grievance status updated to ${grievance.status}`,
    });
  }
}, [grievance.status]);
```

---

## 🔒 Security Considerations

### 1. Token Storage

**✅ DO:**
- Store tokens in `localStorage` for web apps
- Clear tokens on logout
- Implement automatic token refresh

**❌ DON'T:**
- Store tokens in cookies without HttpOnly flag
- Store sensitive data unencrypted
- Share tokens across domains

### 2. CORS Configuration

Backend CORS is configured to allow:
- `http://localhost:3000` (development)
- Production frontend domain

Ensure your frontend requests include credentials:

```typescript
apiClient.defaults.withCredentials = false; // JWT in header, not cookies
```

### 3. Input Validation

Always validate user input on the frontend before sending to backend:

```typescript
// Password validation
const validatePassword = (password: string): string[] => {
  const errors = [];
  
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

// Email validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

### 4. File Upload Security

```typescript
// Validate file before upload
const validateFile = (file: File, type: 'image' | 'audio' | 'video' | 'document' | 'apk') => {
  const allowedTypes = ALLOWED_TYPES[type];
  const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
  }
  
  return true;
};
```

### 5. XSS Prevention

```typescript
// Sanitize user input before rendering
import DOMPurify from 'dompurify';

const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty);
};

// Usage in React
<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userInput) }} />
```

---

## 🧪 Testing & Validation

### 1. API Testing Checklist

- [ ] All endpoints return expected response format
- [ ] Error responses match documented structure
- [ ] File uploads work with correct MIME types
- [ ] Token refresh works correctly
- [ ] Unauthorized requests return 401
- [ ] Role-based access control works

### 2. Integration Test Examples

```typescript
// Test login flow
describe('Authentication', () => {
  it('should login successfully with valid credentials', async () => {
    const response = await login({
      email: 'test@example.com',
      password: 'Test1234',
    });
    
    expect(response.user).toBeDefined();
    expect(response.tokens.access.token).toBeDefined();
    expect(response.tokens.refresh.token).toBeDefined();
  });
  
  it('should reject invalid credentials', async () => {
    await expect(
      login({ email: 'test@example.com', password: 'wrong' })
    ).rejects.toThrow();
  });
});

// Test grievance creation
describe('Grievances', () => {
  it('should create grievance with files', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const response = await createGrievance({
      title: 'Test Grievance',
      description: 'Test description with sufficient length for validation',
      category: 'financial_fraud',
      evidenceFiles: [file],
    });
    
    expect(response.id).toBeDefined();
    expect(response.category).toBe('financial_fraud');
  });
});
```

### 3. Health Check Implementation

```typescript
// Check if backend is available
const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/health`,
      { timeout: 5000 }
    );
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

// Use on app initialization
useEffect(() => {
  checkBackendHealth().then((isHealthy) => {
    if (!isHealthy) {
      showNotification({
        type: 'error',
        message: 'Backend service is unavailable',
      });
    }
  });
}, []);
```

---

## 📝 Additional Resources

### API Documentation
- **Swagger UI:** http://localhost:3000/api/v1/docs
- **OpenAPI Spec (JSON):** http://localhost:3000/api/v1/docs/json
- **OpenAPI Spec (YAML):** `/backend/api-gateway/openapi.yaml`

### Backend Documentation
- **README:** `/backend/README.md`
- **Security Guide:** `/backend/SECURITY_POSTURE.md`
- **Testing Guide:** `/backend/TESTING_GUIDE.md`

### Example Requests (Postman/Insomnia)

Import the OpenAPI spec into Postman/Insomnia for ready-to-use request collections.

---

## 🚀 Quick Start Checklist

- [ ] Set up environment variables
- [ ] Configure axios/fetch client with interceptors
- [ ] Implement authentication flow (login, register, logout, refresh)
- [ ] Set up state management for user and grievances
- [ ] Implement file upload with progress tracking
- [ ] Add error handling for all API calls
- [ ] Implement role-based route protection
- [ ] Add loading states for async operations
- [ ] Test all critical flows (auth, grievance creation, file upload)
- [ ] Implement health check on app initialization

---

## 📞 Support & Questions

For backend-related issues or questions:
1. Check Swagger documentation: `http://localhost:3000/api/v1/docs`
2. Review backend logs for detailed error messages
3. Check correlation IDs in error responses for tracing

---

**Happy Coding! 🎉**
