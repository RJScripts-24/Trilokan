# Trilokan Frontend-Backend Quick Start Guide 🚀

## Prerequisites
- Node.js 20+ and npm
- Python 3.12+
- PostgreSQL 14+
- All ML dependencies installed (see backend/ml-services docs)

---

## 1️⃣ Backend Setup

### Database
```bash
# Start PostgreSQL
# Create database: trilokan_db
# Run migrations from backend/api-gateway/db/migrations
```

### API Gateway
```bash
cd backend/api-gateway
npm install
npm start
# Runs on http://localhost:3000
```

### ML Services

**Complaint NLP Service** (Port 5000)
```bash
cd backend/ml-services/complaint
pip install -r requirements.txt
python app.py
```

**App Crawler Service** (Port 5001)
```bash
cd backend/ml-services/app-crawler
pip install -r requirements.txt
python main.py
```

**Identity Verifier Service** (Port 5002)
```bash
cd backend/ml-services/identity-verifier
pip install -r requirements.txt
python app.py
```

---

## 2️⃣ Frontend Setup

```bash
cd frontend/frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 3️⃣ Test the Integration

### Step 1: Register a User
1. Open http://localhost:3000
2. Click "Sign Up"
3. Fill in:
   - First Name: Test
   - Surname: User
   - Email: test@example.com
   - Password: Test1234 (must have uppercase, lowercase, number, 8+ chars)
4. Click "Sign Up"

### Step 2: Login
1. Use credentials from registration
2. Should redirect to Dashboard

### Step 3: Test Complaint Portal
1. Click "Complaint Portal" card
2. Click "File New Complaint"
3. Fill complaint details:
   - Category: Select any
   - Description: Type at least 20 characters
4. Optional: Add evidence files
5. Optional: Record voice complaint
6. Click "Submit Complaint"
7. View grievances list with AI analysis

### Step 4: Test Identity Verification
1. Click "Identity Verification" card
2. Click "Start Verification"
3. Allow camera access when prompted
4. Read and record the challenge phrase shown
5. Click "Stop Recording"
6. Optional: Upload ID document
7. Click "Submit Verification"
8. View verification results (confidence scores)

### Step 5: Test App Checker
1. Click "App Checker" card
2. **Option A - Upload File:**
   - Drag & drop an APK file OR click to browse
   - Click "CHECK"
3. **Option B - Check by Package:**
   - Select "Give Link" from dropdown
   - Enter package name (e.g., com.example.app)
   - Click "CHECK"
4. View trust score, permissions, and warnings

---

## 4️⃣ Common Issues & Solutions

### Issue: CORS Errors
**Solution:** Ensure Vite proxy is configured in `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

### Issue: 401 Unauthorized
**Solution:** 
- Check if backend is running
- Clear localStorage: `localStorage.clear()`
- Re-login

### Issue: Camera/Mic Not Working
**Solution:**
- Use HTTPS or localhost (not IP address)
- Check browser permissions
- Try Chrome/Firefox (latest versions)

### Issue: File Upload Fails
**Solution:**
- Check file size limits in `.env`
- Verify file type (APK, JPEG, PNG, PDF allowed)
- Ensure backend upload limits match frontend

### Issue: ML Services Not Responding
**Solution:**
- Check all 3 ML services are running
- Verify ports: 5000, 5001, 5002
- Check API Gateway can reach ML services
- Review ML service logs for errors

---

## 5️⃣ Environment Variables

Create `frontend/frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_VERSION=v1
VITE_MAX_FILE_SIZE=10485760
VITE_MAX_VIDEO_SIZE=52428800
VITE_ENABLE_VOICE_COMPLAINTS=true
VITE_ENABLE_IDENTITY_VERIFICATION=true
VITE_ENABLE_APP_VERIFICATION=true
```

---

## 6️⃣ API Service URLs

| Service | URL | Status Check |
|---------|-----|--------------|
| API Gateway | http://localhost:3000 | `GET /api/v1/health` |
| Complaint NLP | http://localhost:5000 | `GET /health` |
| App Crawler | http://localhost:5001 | `GET /health` |
| Identity Verifier | http://localhost:5002 | `GET /health` |

---

## 7️⃣ File Structure Reference

```
frontend/frontend/
├── .env                          # Environment configuration
├── src/
│   ├── api/
│   │   ├── client.ts            # Axios instance + interceptors
│   │   ├── auth.service.ts      # Authentication API
│   │   ├── grievance.service.ts # Complaints API
│   │   ├── identity.service.ts  # Identity verification API
│   │   ├── app.service.ts       # App checking API
│   │   └── index.ts             # Service exports
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   ├── utils/
│   │   └── errorHandler.ts     # Error handling + validation
│   ├── components/
│   │   ├── App.tsx              # ✅ Integrated
│   │   ├── Dashboard.tsx        # ✅ Integrated
│   │   ├── CompliantPortal.tsx  # ✅ Integrated
│   │   ├── IdentityVerification.tsx # ✅ Integrated
│   │   ├── AppChecker.tsx       # ✅ Integrated
│   │   └── Settings.tsx         # ✅ Integrated
│   └── ...
└── ...
```

---

## 8️⃣ Testing Workflow

1. **Start All Services** (backend + ML)
2. **Start Frontend** (`npm run dev`)
3. **Test Auth Flow:**
   - Register → Login → Verify token in localStorage → Logout
4. **Test Each Feature:**
   - ComplaintPortal → Create, upload files, record voice
   - IdentityVerification → Camera, challenge, verify
   - AppChecker → Upload APK, view results
5. **Check Network Tab:**
   - Verify API calls to `/api/v1/*`
   - Check response status codes
   - Inspect request/response payloads

---

## 9️⃣ Development Tips

### Debug API Calls
Open browser DevTools → Network tab → Filter: XHR

### Check Auth State
```javascript
// In browser console
localStorage.getItem('authTokens')
localStorage.getItem('currentUser')
```

### Clear Auth Data
```javascript
localStorage.clear()
// Then refresh page
```

### View Request Interceptors
See `src/api/client.ts` for:
- Token attachment logic
- Auto-refresh on 401
- Error handling

---

## 🔟 Production Deployment Checklist

- [ ] Update `.env` with production API URL
- [ ] Enable HTTPS for camera/microphone access
- [ ] Configure backend CORS for frontend domain
- [ ] Set secure token storage (httpOnly cookies)
- [ ] Add error tracking (Sentry, etc.)
- [ ] Enable production logging
- [ ] Test all features on production build
- [ ] Load test file uploads
- [ ] Verify ML services are accessible
- [ ] Set up monitoring for API endpoints

---

## 📚 Additional Resources

- **Full Integration Details:** See `INTEGRATION_COMPLETE.md`
- **Backend API Docs:** `backend/api-gateway/openapi.yaml`
- **ML Services Docs:** `backend/ml-services/openapi-ml.yaml`
- **Type Definitions:** `src/types/index.ts`

---

**Happy Coding! 🎉**

For issues, check the Network tab, browser console, and backend logs.
