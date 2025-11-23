# Frontend-Backend Integration Summary

**Generated:** November 23, 2025  
**Purpose:** Quick reference for frontend developers integrating with Trilokan backend

---

## 🎯 Critical Information

### Base Configuration
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_VERSION=v1
VITE_MAX_FILE_SIZE=10485760  # 10MB
VITE_MAX_VIDEO_SIZE=52428800 # 50MB
```

### API Gateway (Main Entry Point)
- **URL:** `http://localhost:3000`
- **All frontend requests go here** - DO NOT call ML services directly
- **API Docs:** `http://localhost:3000/api/v1/docs` (Swagger UI)

---

## 🔐 Authentication Flow

### 1. Register/Login
```typescript
POST /api/v1/auth/register
POST /api/v1/auth/login

Response:
{
  user: { id, email, name, role, ... },
  tokens: {
    access: { token, expires },  // 30 min
    refresh: { token, expires }  // 30 days
  }
}
```

### 2. Store Tokens
```typescript
localStorage.setItem('accessToken', data.tokens.access.token);
localStorage.setItem('refreshToken', data.tokens.refresh.token);
```

### 3. Include in Requests
```typescript
Authorization: Bearer {accessToken}
```

### 4. Auto-Refresh on 401
```typescript
// Intercept 401 responses
// Call POST /api/v1/auth/refresh-tokens
// Retry original request with new token
```

---

## 📋 Key Endpoints

### Authentication
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | ❌ | Create account |
| `/auth/login` | POST | ❌ | Get tokens |
| `/auth/logout` | POST | ❌ | Invalidate token |
| `/auth/refresh-tokens` | POST | ❌ | Get new access token |

### Grievances
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/grievances` | GET | ✅ | List grievances |
| `/grievances` | POST | ✅ | Create (with files) |
| `/grievances/:id` | GET | ✅ | Get details |
| `/grievances/:id` | PATCH | ✅ | Update |
| `/grievances/:id/status` | PATCH | ✅ | Change status (Admin) |

### Identity Verification
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/identity/challenge` | GET | ✅ | Get liveness challenge |
| `/identity/verify` | POST | ✅ | Upload face/voice/ID |

### App Verification
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/apps/verify-file` | POST | ✅ | Upload APK |
| `/apps/verify-package` | POST | ✅ | Check by package name |

---

## 📤 File Uploads

### Grievance with Evidence
```typescript
const formData = new FormData();
formData.append('title', 'Fraud Report');
formData.append('description', 'Detailed description...');
formData.append('category', 'financial_fraud');

// Optional voice complaint
formData.append('voiceAudio', audioFile);

// Evidence files
evidenceFiles.forEach(file => {
  formData.append('evidenceFiles', file);
});

POST /api/v1/grievances
Content-Type: multipart/form-data
```

### Identity Verification
```typescript
const formData = new FormData();
formData.append('faceVideo', videoFile);   // Required
formData.append('voiceAudio', audioFile);  // Optional
formData.append('idDocument', imageFile);  // Optional

POST /api/v1/identity/verify
Content-Type: multipart/form-data
```

---

## 🎭 User Roles & Permissions

| Role | Can Do |
|------|--------|
| `user` | Create/view own grievances, verify identity |
| `official` | View all grievances, update status |
| `admin` | Full access, assign tasks, manage users |

**Frontend Route Protection:**
```typescript
const ProtectedRoute = ({ roles, children }) => {
  const user = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" />;
  }
  return children;
};
```

---

## 📊 Data Models

### User
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'user' | 'official' | 'admin';
  isIdentityVerified: boolean;
  preferredLanguage: string;
}
```

### Grievance
```typescript
{
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  userId: string;
  assignedTo?: string;
  attachments: string[];
  aiAnalysis?: {
    categories: [{ name, confidence }];
    priority: string;
  };
}
```

---

## ⚠️ Error Handling

### Standard Error Response
```typescript
{
  code: 400,
  message: "Validation error",
  requestId: "uuid",
  errors: [
    { field: "email", message: "Invalid email format" }
  ]
}
```

### Common Errors
- **400** - Validation error → Show field errors
- **401** - Unauthorized → Redirect to login
- **403** - Forbidden → Show access denied
- **404** - Not found → Show not found message
- **429** - Rate limit → Show "try again later"
- **500** - Server error → Show generic error

---

## 🔒 Security Checklist

- [ ] Validate passwords (min 8 chars, 1 letter, 1 number)
- [ ] Sanitize user input before rendering (XSS prevention)
- [ ] Validate file types before upload
- [ ] Implement token refresh on 401
- [ ] Clear localStorage on logout
- [ ] Use HTTPS in production
- [ ] Never expose API keys in frontend code

---

## 📝 File Upload Limits

| Type | Max Size | Allowed MIME Types |
|------|----------|-------------------|
| Images | 10MB | image/jpeg, image/png |
| Audio | 20MB | audio/mpeg, audio/wav, audio/mp3 |
| Video | 50MB | video/mp4, video/webm |
| Documents | 10MB | application/pdf, image/* |
| APK | 100MB | application/vnd.android.package-archive |

---

## 🧪 Testing

### Health Check
```bash
GET http://localhost:3000/health

Expected: { status: "healthy", uptime: 12345, ... }
```

### Test Login
```bash
POST http://localhost:3000/api/v1/auth/login
{
  "email": "test@example.com",
  "password": "Test1234"
}
```

### API Documentation
- **Swagger UI:** http://localhost:3000/api/v1/docs
- Try all endpoints interactively
- Export as Postman collection

---

## 🚀 Quick Start Steps

1. **Set up environment**
   ```bash
   cp .env.example .env
   # Update VITE_API_BASE_URL
   ```

2. **Configure API client**
   ```typescript
   // See FRONTEND_INTEGRATION_GUIDE.md for axios setup
   ```

3. **Implement auth flow**
   - Login/Register
   - Token storage
   - Auto-refresh

4. **Create grievance**
   - Form with file uploads
   - Progress tracking
   - Error handling

5. **Test integration**
   - Check all endpoints
   - Verify file uploads
   - Test error scenarios

---

## 📚 Full Documentation

See **FRONTEND_INTEGRATION_GUIDE.md** for:
- Complete API reference
- Detailed code examples
- State management setup
- Advanced error handling
- Security best practices
- Full TypeScript types

---

## 🆘 Troubleshooting

### CORS Errors
- Backend allows `http://localhost:3000` in development
- Ensure frontend runs on port 3000 OR update backend CORS config

### 401 Errors
- Check token is included: `Authorization: Bearer {token}`
- Verify token hasn't expired
- Implement auto-refresh

### File Upload Fails
- Check file size limits
- Verify MIME type matches allowed types
- Use `multipart/form-data` content type

### Can't Connect to Backend
```bash
# Check backend is running
curl http://localhost:3000/health

# Check all services
docker-compose ps
```

---

## 📞 Resources

- **Swagger Docs:** http://localhost:3000/api/v1/docs
- **OpenAPI Spec:** `/backend/api-gateway/openapi.yaml`
- **ML Services Spec:** `/backend/ml-services/openapi-ml.yaml`
- **Backend README:** `/backend/README.md`
- **Security Guide:** `/backend/SECURITY_POSTURE.md`

---

**Ready to integrate? Start with the full guide: `FRONTEND_INTEGRATION_GUIDE.md`** 🚀
