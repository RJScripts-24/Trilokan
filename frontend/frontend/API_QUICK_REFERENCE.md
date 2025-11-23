# API Quick Reference - Trilokan Frontend

## 🚀 Quick Start

```typescript
import { 
  authService, 
  userService,
  grievanceService,
  identityService,
  appService,
  systemService 
} from '@/api';
```

---

## 📋 Common Operations

### Authentication
```typescript
// Login
const { user, tokens } = await authService.login({ email, password });

// Register
const response = await authService.register({ email, password, name });

// Logout
await authService.logout();

// Check auth
const isAuth = authService.isAuthenticated();
const user = authService.getCurrentUser();
```

### Grievances
```typescript
// Create
const grievance = await grievanceService.createGrievance({
  title: 'Issue Title',
  description: 'Details...',
  category: 'Public Services',
  priority: 'High',
  evidenceFiles: [file1, file2]
});

// List with filters
const result = await grievanceService.getGrievances({
  status: 'Open',
  page: 1,
  limit: 10
});

// Update status (Admin/Staff)
await grievanceService.updateStatus(id, 'Resolved', 'Fixed!');
```

### Identity Verification
```typescript
// Get challenge and verify
const challenge = await identityService.getChallenge();
const result = await identityService.verifyIdentity({
  faceVideo,
  challengeId: challenge.id
});

// Or use helper
const result = await identityService.completeVerification(faceVideo);
```

### App Verification
```typescript
// Verify APK
const result = await appService.verifyAppFile(apkFile);

// Verify by package
const result = await appService.verifyAppPackage('com.example.app');

// Report app
await appService.reportApp({
  packageName: 'com.bad.app',
  appName: 'Bad App',
  reason: 'malware',
  description: 'Contains virus'
});
```

---

## 🎯 All Endpoints Map

| Service | Method | Endpoint | Auth | Description |
|---------|--------|----------|------|-------------|
| **Auth** | | | | |
| | register() | POST /api/v1/auth/register | ❌ | Register user |
| | login() | POST /api/v1/auth/login | ❌ | Login user |
| | logout() | POST /api/v1/auth/logout | ✅ | Logout user |
| | refreshTokens() | POST /api/v1/auth/refresh-tokens | ❌ | Refresh token |
| **User** | | | | |
| | getProfile() | GET /api/v1/users/profile | ✅ | Get profile |
| | updateProfile() | PATCH /api/v1/users/profile | ✅ | Update profile |
| | getAllUsers() | GET /api/v1/users | 🔐 Admin | List all users |
| | deleteUser() | DELETE /api/v1/users/:id | 🔐 Admin | Delete user |
| **Grievance** | | | | |
| | createGrievance() | POST /api/v1/grievances | ✅ | Create grievance |
| | getGrievances() | GET /api/v1/grievances | ✅ | List grievances |
| | getGrievance() | GET /api/v1/grievances/:id | ✅ | Get one |
| | updateGrievance() | PATCH /api/v1/grievances/:id | ✅ | Update |
| | deleteGrievance() | DELETE /api/v1/grievances/:id | ✅ | Delete |
| | updateStatus() | PATCH /api/v1/grievances/:id/status | 🔐 Staff | Update status |
| | assignGrievance() | PATCH /api/v1/grievances/:id/assign | 🔐 Admin | Assign to staff |
| **Identity** | | | | |
| | getChallenge() | GET /api/v1/identity/challenge | ✅ | Get challenge |
| | verifyIdentity() | POST /api/v1/identity/verify | ✅ | Verify identity |
| **App** | | | | |
| | verifyAppFile() | POST /api/v1/apps/verify-file | ✅ | Verify APK |
| | verifyAppPackage() | POST /api/v1/apps/verify-package | ✅ | Verify by package |
| | reportApp() | POST /api/v1/apps/report | ✅ | Report app |
| **System** | | | | |
| | getHealth() | GET /api/v1/app/health | ❌ | Health check |
| | getConfig() | GET /api/v1/app/config | ❌ | Get config |
| | submitFeedback() | POST /api/v1/app/feedback | ✅ | Submit feedback |
| | getEnums() | GET /api/v1/app/enums | ❌ | Get enums |

**Legend:**
- ❌ = No auth required
- ✅ = Auth required
- 🔐 Admin = Admin role required
- 🔐 Staff = Admin or Official role required

---

## 🔒 Role Checks

```typescript
// Check if user is authenticated
authService.isAuthenticated() // boolean

// Check if user is admin
authService.isAdmin() // boolean

// Check if user is staff (admin or official)
authService.isStaff() // boolean

// Check specific roles
authService.hasRole(['admin', 'official']) // boolean
```

---

## 📁 File Uploads

All file upload services support progress tracking:

```typescript
// Grievance with progress
await grievanceService.createGrievanceWithProgress(
  data,
  (progress) => console.log(`${progress}%`)
);

// Identity verification with progress
await identityService.verifyIdentityWithProgress(
  data,
  (progress) => setUploadProgress(progress)
);

// App verification with progress
await appService.verifyAppFileWithProgress(
  file,
  (progress) => updateProgressBar(progress)
);
```

---

## ⚠️ Error Handling Pattern

```typescript
try {
  const result = await someService.someMethod(data);
  // Success
} catch (error: any) {
  if (error.response) {
    // Server error
    const status = error.response.status;
    const message = error.response.data.message;
    const errors = error.response.data.errors; // Validation errors
    
    if (status === 401) {
      // Unauthorized - redirect to login
    } else if (status === 403) {
      // Forbidden - show access denied
    } else if (status === 404) {
      // Not found
    }
  } else if (error.request) {
    // Network error
    console.error('Network error - check connection');
  } else {
    // Other error
    console.error(error.message);
  }
}
```

---

## 🎨 React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { grievanceService } from '@/api';

function useGrievances(filters) {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        setLoading(true);
        const result = await grievanceService.getGrievances(filters);
        setGrievances(result.results);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrievances();
  }, [filters]);

  return { grievances, loading, error };
}

// Usage
function GrievanceList() {
  const { grievances, loading, error } = useGrievances({ status: 'Open' });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {grievances.map(g => <li key={g.id}>{g.title}</li>)}
    </ul>
  );
}
```

---

## 📦 TypeScript Types

All types are exported:

```typescript
import type {
  User,
  Grievance,
  AuthResponse,
  PaginatedResponse,
  IdentityVerificationResult,
  AppVerificationResult
} from '@/api';
```

---

## 🌐 Environment Setup

Create `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_VERSION=v1
VITE_API_TIMEOUT=30000
VITE_API_UPLOAD_TIMEOUT=60000
```

**Production:**
```env
VITE_API_BASE_URL=https://api.trilokan.com
```

---

**Updated:** November 24, 2025  
**Status:** Production Ready ✅
