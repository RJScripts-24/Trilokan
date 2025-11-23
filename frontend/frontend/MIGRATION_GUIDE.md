# Migration Guide: Updating Existing Components

This guide helps you update your existing frontend components to use the new optimized API services.

---

## 🔄 Quick Migration Steps

### 1. Update Imports

**Before:**
```typescript
import axios from 'axios';
```

**After:**
```typescript
import { authService, grievanceService, userService } from '@/api';
```

---

### 2. Replace Manual API Calls

**Before:**
```typescript
const login = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email,
      password
    });
    
    localStorage.setItem('accessToken', response.data.tokens.access.token);
    localStorage.setItem('refreshToken', response.data.tokens.refresh.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  } catch (error) {
    console.error(error);
  }
};
```

**After:**
```typescript
const login = async () => {
  try {
    const response = await authService.login({ email, password });
    // Tokens automatically stored!
    navigate('/dashboard');
  } catch (error) {
    console.error(error);
  }
};
```

---

### 3. Update Authentication Checks

**Before:**
```typescript
const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};
```

**After:**
```typescript
import { authService } from '@/api';

const isAuthenticated = authService.isAuthenticated();
const user = authService.getCurrentUser();
const isAdmin = authService.isAdmin();
const isStaff = authService.isStaff();
```

---

### 4. Update Grievance Creation

**Before:**
```typescript
const createGrievance = async (data) => {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('category', data.category);
  
  if (data.files) {
    data.files.forEach(file => formData.append('evidenceFiles', file));
  }
  
  const token = localStorage.getItem('accessToken');
  const response = await axios.post(
    'http://localhost:3000/api/v1/grievances',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  
  return response.data;
};
```

**After:**
```typescript
import { grievanceService } from '@/api';

const createGrievance = async (data) => {
  // Service handles FormData, auth headers, everything!
  return await grievanceService.createGrievance(data);
};

// With progress tracking:
const createGrievance = async (data) => {
  return await grievanceService.createGrievanceWithProgress(
    data,
    (progress) => setUploadProgress(progress)
  );
};
```

---

### 5. Update Data Fetching

**Before:**
```typescript
const [grievances, setGrievances] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchGrievances = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        'http://localhost:3000/api/v1/grievances?status=Open&page=1&limit=10',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      setGrievances(response.data.results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchGrievances();
}, []);
```

**After:**
```typescript
import { grievanceService } from '@/api';

const [grievances, setGrievances] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchGrievances = async () => {
    setLoading(true);
    try {
      const result = await grievanceService.getGrievances({
        status: 'Open',
        page: 1,
        limit: 10
      });
      setGrievances(result.results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchGrievances();
}, []);
```

---

## 📋 Component-by-Component Migration

### Dashboard.tsx

**Changes needed:**
```typescript
// Add imports
import { grievanceService, userService } from '@/api';

// Replace axios calls with service calls
const fetchStats = async () => {
  const stats = await grievanceService.getStatistics();
  // Use stats...
};

const fetchProfile = async () => {
  const profile = await userService.getProfile();
  // Use profile...
};
```

### CompliantPortal.tsx

**Changes needed:**
```typescript
import { grievanceService } from '@/api';

// Update form submission
const handleSubmit = async (formData) => {
  try {
    await grievanceService.createGrievanceWithProgress(
      formData,
      (progress) => setProgress(progress)
    );
    toast.success('Grievance submitted!');
  } catch (error) {
    toast.error('Submission failed');
  }
};
```

### IdentityVerification.tsx

**Changes needed:**
```typescript
import { identityService } from '@/api';

const handleVerify = async () => {
  try {
    // Use the complete flow helper
    const result = await identityService.completeVerification(
      faceVideo,
      voiceAudio,
      idDocument,
      (progress) => setProgress(progress)
    );
    
    if (result.verified) {
      toast.success('Identity verified!');
    }
  } catch (error) {
    toast.error('Verification failed');
  }
};
```

### AppChecker.tsx

**Changes needed:**
```typescript
import { appService } from '@/api';

const handleVerifyAPK = async (file) => {
  try {
    const result = await appService.verifyAppFileWithProgress(
      file,
      (progress) => setProgress(progress)
    );
    
    setVerificationResult(result);
  } catch (error) {
    toast.error('Verification failed');
  }
};

const handleVerifyPackage = async (packageName) => {
  const result = await appService.verifyAppPackage(packageName);
  setVerificationResult(result);
};
```

### Settings.tsx

**Changes needed:**
```typescript
import { userService } from '@/api';

const handleUpdateProfile = async (data) => {
  try {
    const updated = await userService.updateProfile(data);
    toast.success('Profile updated!');
    // Profile is automatically updated in localStorage
  } catch (error) {
    toast.error('Update failed');
  }
};
```

---

## 🔐 Protected Route Updates

**Before:**
```typescript
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return children;
};
```

**After:**
```typescript
import { authService } from '@/api';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && !authService.isAdmin()) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};

// Usage
<Route path="/admin" element={
  <ProtectedRoute requireAdmin>
    <AdminPanel />
  </ProtectedRoute>
} />
```

---

## 🎯 Custom Hooks

Create reusable hooks:

```typescript
// hooks/useAuth.ts
import { authService } from '@/api';

export function useAuth() {
  return {
    user: authService.getCurrentUser(),
    isAuthenticated: authService.isAuthenticated(),
    isAdmin: authService.isAdmin(),
    isStaff: authService.isStaff(),
    login: authService.login,
    logout: authService.logout,
    register: authService.register,
  };
}

// hooks/useGrievances.ts
import { useState, useEffect } from 'react';
import { grievanceService } from '@/api';

export function useGrievances(filters = {}) {
  const [data, setData] = useState({ results: [], loading: true, error: null });
  
  useEffect(() => {
    let mounted = true;
    
    grievanceService.getGrievances(filters)
      .then(result => mounted && setData({ results: result.results, loading: false, error: null }))
      .catch(error => mounted && setData({ results: [], loading: false, error }));
    
    return () => { mounted = false; };
  }, [JSON.stringify(filters)]);
  
  return data;
}

// Usage in component
function GrievanceList() {
  const { results, loading, error } = useGrievances({ status: 'Open' });
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <List items={results} />;
}
```

---

## ⚙️ Environment Configuration

Update your `.env` file:

```env
# Development
VITE_API_BASE_URL=http://localhost:3000
VITE_API_VERSION=v1
VITE_API_TIMEOUT=30000
VITE_API_UPLOAD_TIMEOUT=60000

# Production (when deploying)
# VITE_API_BASE_URL=https://api.trilokan.com
```

---

## ✅ Testing After Migration

Test each feature:

```typescript
// test-migration.ts
import { 
  authService, 
  userService,
  grievanceService,
  identityService,
  appService,
  systemService 
} from '@/api';

async function testMigration() {
  console.log('🧪 Testing API Migration...\n');
  
  try {
    // 1. System Health
    console.log('1️⃣ Testing system health...');
    const health = await systemService.getHealth();
    console.log('✅ Health:', health.status);
    
    // 2. Authentication
    console.log('\n2️⃣ Testing authentication...');
    const authResponse = await authService.login({
      email: 'test@example.com',
      password: 'password'
    });
    console.log('✅ Login successful:', authResponse.user.name);
    
    // 3. Profile
    console.log('\n3️⃣ Testing profile...');
    const profile = await userService.getProfile();
    console.log('✅ Profile loaded:', profile.email);
    
    // 4. Grievances
    console.log('\n4️⃣ Testing grievances...');
    const grievances = await grievanceService.getGrievances({ limit: 1 });
    console.log('✅ Grievances loaded:', grievances.totalResults, 'total');
    
    console.log('\n🎉 All tests passed!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run tests
testMigration();
```

---

## 🐛 Common Issues & Solutions

### Issue: "Module not found: @/api"

**Solution:** Check your `tsconfig.json` has path mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: "CORS error"

**Solution:** Backend must allow your frontend origin:
```javascript
// Backend CORS config
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true
}));
```

### Issue: "401 Unauthorized"

**Solution:** Check token is being sent:
```typescript
// Verify token exists
console.log('Token:', authService.getAccessToken());

// If null, user needs to login again
if (!authService.isAuthenticated()) {
  navigate('/login');
}
```

---

## 📊 Migration Checklist

- [ ] Update all imports from axios to API services
- [ ] Replace manual token storage with service methods
- [ ] Update authentication checks
- [ ] Convert FormData creation to service calls
- [ ] Add progress tracking where needed
- [ ] Update error handling
- [ ] Test all features
- [ ] Update environment variables
- [ ] Test with real backend
- [ ] Deploy and verify production

---

**Migration Status:** Ready to Execute  
**Estimated Time:** 2-4 hours (depending on component count)  
**Risk Level:** Low (backwards compatible, incremental migration possible)
