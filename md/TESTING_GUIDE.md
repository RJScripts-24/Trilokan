# Testing Guide - Priority 1 Implementation

This guide provides step-by-step instructions to test all Priority 1 implementations.

## Prerequisites

1. All services running (see README.md for startup instructions)
2. PostgreSQL database running
3. API Gateway accessible at `http://localhost:3000`
4. All ML services accessible at their respective ports

## Test Suite

### 1. Health Checks

Verify all services are running:

```bash
# API Gateway
curl http://localhost:3000/health

# Expected: { "status": "ok", ... }

# Complaint ML Service
curl http://localhost:5000/health

# Expected: { "service": "complaint-ml-service", "status": "ok", "timestamp": "..." }

# App Crawler Service
curl http://localhost:5001/health

# Expected: { "service": "app-crawler", "status": "ok", "timestamp": "..." }

# Identity Verifier Service
curl http://localhost:5002/health

# Expected: { "service": "identity-verifier", "status": "ok", "timestamp": "..." }
```

**✅ Pass Criteria**: All endpoints return 200 status with `"status": "ok"`

---

### 2. Complaint Categorization

Test the grievance text categorization:

```bash
curl -X POST http://localhost:5000/api/v1/categorize \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-api-key-complaint-service" \
  -d '{
    "text": "I lost money in a fake banking app that looked like Google Pay"
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "result": {
    "categories": [
      {
        "name": "Fraud",
        "confidence": 0.85
      }
    ],
    "priority": "High",
    "keywords": ["money", "fake", "app"]
  },
  "meta": {
    "service": "complaint-ml-service",
    "timestamp": "2025-11-23T..."
  }
}
```

**✅ Pass Criteria**: 
- Returns 200 status
- `status: "success"`
- `categories` array with at least one category
- Each category has `name` and `confidence`

---

### 3. Audio Transcription

Test audio transcription endpoint:

```bash
# Create a test audio file or use an existing one
curl -X POST http://localhost:5000/transcribe \
  -H "x-api-key: dev-api-key-complaint-service" \
  -F "audio=@test-audio.mp3"
```

**Expected Response**:
```json
{
  "status": "success",
  "result": {
    "text": "Transcribed text here",
    "confidence": 0.9,
    "language": "en"
  },
  "meta": {
    "service": "complaint-ml-service",
    "timestamp": "..."
  }
}
```

**✅ Pass Criteria**:
- Returns 200 status
- `result.text` is present (non-empty if module implemented)
- 400 error if audio file missing

---

### 4. Deepfake Detection

Test deepfake detection endpoint:

```bash
curl -X POST http://localhost:5000/detect/deepfake \
  -H "x-api-key: dev-api-key-complaint-service" \
  -F "video=@test-video.mp4"
```

**Expected Response**:
```json
{
  "status": "success",
  "result": {
    "score": 0.15,
    "label": "real",
    "confidence": 0.85,
    "is_deepfake": false
  },
  "meta": {
    "service": "complaint-ml-service",
    "timestamp": "..."
  }
}
```

**✅ Pass Criteria**:
- Returns 200 status
- `result.score` is a number
- `result.label` is present
- 400 error if video file missing

---

### 5. App Verification (Package Name)

Test app verification with package name:

```bash
curl -X POST http://localhost:5001/app/verify \
  -H "x-api-key: dev-api-key-app-crawler" \
  -F "package_name=com.google.android.apps.nbu.paisa.user"
```

**Expected Response**:
```json
{
  "status": "success",
  "result": {
    "package_match": true,
    "verdict": "safe",
    "details": "Official app: Google Pay (com.google.android.apps.nbu.paisa.user)",
    "analysis_type": "package_name"
  },
  "meta": {
    "service": "app-crawler",
    "timestamp": "..."
  }
}
```

**✅ Pass Criteria**:
- Returns 200 status
- `result.package_match` is boolean
- `result.verdict` is present
- `result.details` provides meaningful information

---

### 6. Identity Verification

Test multi-modal identity verification:

```bash
curl -X POST http://localhost:5002/verify \
  -H "x-api-key: dev-api-key-identity-verifier" \
  -F "video=@test-face-video.mp4" \
  -F "audio=@test-voice.mp3" \
  -F "document=@test-id.jpg"
```

**Expected Response**:
```json
{
  "status": "success",
  "result": {
    "identity_verified": true,
    "confidence": 0.87,
    "details": {
      "face_analysis": { ... },
      "voice_analysis": { ... },
      "document_analysis": { ... }
    }
  },
  "meta": {
    "service": "identity-verifier",
    "timestamp": "..."
  }
}
```

**✅ Pass Criteria**:
- Returns 200 status
- `result.identity_verified` is boolean
- `result.confidence` is a float
- 400 error if required files missing
- 401 error if x-api-key invalid

---

### 7. Gateway Integration Tests

Test gateway endpoints that use ML services:

#### A. Gateway to Complaint ML

```bash
# First, get an auth token (adjust based on your auth setup)
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3000/api/v1/grievances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fraudulent App Alert",
    "description": "I downloaded a fake PhonePe app and lost money"
  }'
```

**✅ Pass Criteria**:
- Grievance created successfully
- Auto-categorized using ML service
- Priority assigned based on ML analysis

#### B. Gateway to Identity Verifier

```bash
curl -X POST http://localhost:3000/api/v1/identity/verify \
  -H "Authorization: Bearer $TOKEN" \
  -F "faceVideo=@video.mp4" \
  -F "voiceAudio=@audio.mp3" \
  -F "idDocument=@id.jpg"
```

**✅ Pass Criteria**:
- Returns verification result
- No "undefined function" errors
- Consistent response format

---

### 8. Authentication Tests

Test API key validation:

#### Missing API Key
```bash
curl -X POST http://localhost:5000/api/v1/categorize \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'
```

**Expected**: 401 Unauthorized

#### Invalid API Key
```bash
curl -X POST http://localhost:5000/api/v1/categorize \
  -H "Content-Type: application/json" \
  -H "x-api-key: invalid-key" \
  -d '{"text": "test"}'
```

**Expected**: 401 Unauthorized

**✅ Pass Criteria**: Both return 401 with appropriate error message

---

### 9. Error Handling Tests

#### Missing Required Fields
```bash
curl -X POST http://localhost:5000/api/v1/categorize \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-api-key-complaint-service" \
  -d '{}'
```

**Expected**: 400 Bad Request with error message

#### Invalid File Upload
```bash
curl -X POST http://localhost:5002/verify \
  -H "x-api-key: dev-api-key-identity-verifier" \
  -F "video=@test.txt"
```

**Expected**: 400 Bad Request (missing required files)

**✅ Pass Criteria**: All return appropriate error codes and messages

---

### 10. Legacy Compatibility Routes

Test deprecated ML routes through gateway:

```bash
# Legacy categorization endpoint
curl -X POST http://localhost:3000/api/v1/ml/predict/category \
  -H "Content-Type: application/json" \
  -d '{"text": "test complaint"}'
```

**✅ Pass Criteria**:
- Returns result (backward compatible format)
- Warning logged about deprecation
- No 404 errors

---

## Port Conflict Test

Start all services simultaneously:

```bash
# Terminal 1
cd ml-services/complaint && python app.py

# Terminal 2
cd ml-services/app-crawler && python app_api.py

# Terminal 3
cd ml-services/identity-verifier && python app.py

# Terminal 4
cd api-gateway && npm start
```

**✅ Pass Criteria**: All services start without port conflicts

---

## Automated Test Script

Save this as `test-services.sh`:

```bash
#!/bin/bash

echo "Testing Trilokan Backend Services..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test health endpoints
echo -e "\n${GREEN}Testing Health Endpoints...${NC}"

for port in 3000 5000 5001 5002; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
    if [ $response -eq 200 ]; then
        echo -e "${GREEN}✓ Port $port health check passed${NC}"
    else
        echo -e "${RED}✗ Port $port health check failed (HTTP $response)${NC}"
    fi
done

# Test API key validation
echo -e "\n${GREEN}Testing API Key Validation...${NC}"

response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:5000/api/v1/categorize \
    -H "Content-Type: application/json" \
    -d '{"text":"test"}')

if [ $response -eq 401 ]; then
    echo -e "${GREEN}✓ API key validation working (returned 401)${NC}"
else
    echo -e "${RED}✗ API key validation failed (expected 401, got $response)${NC}"
fi

echo -e "\n${GREEN}Basic tests complete!${NC}"
```

---

## PowerShell Test Script (Windows)

Save this as `test-services.ps1`:

```powershell
Write-Host "`nTesting Trilokan Backend Services..." -ForegroundColor Cyan

# Test health endpoints
Write-Host "`nTesting Health Endpoints..." -ForegroundColor Green

$ports = @(3000, 5000, 5001, 5002)
foreach ($port in $ports) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Port $port health check passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "✗ Port $port health check failed" -ForegroundColor Red
    }
}

# Test API key validation
Write-Host "`nTesting API Key Validation..." -ForegroundColor Green

try {
    $body = @{ text = "test" } | ConvertTo-Json
    $response = Invoke-WebRequest `
        -Uri "http://localhost:5000/api/v1/categorize" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✓ API key validation working (returned 401)" -ForegroundColor Green
    } else {
        Write-Host "✗ API key validation failed" -ForegroundColor Red
    }
}

Write-Host "`nBasic tests complete!" -ForegroundColor Green
```

---

## Success Checklist

- [ ] All health endpoints return 200 OK
- [ ] Complaint categorization returns categories array
- [ ] Transcription endpoint accepts audio files
- [ ] Deepfake detection endpoint accepts video files
- [ ] App verification returns package analysis
- [ ] Identity verification accepts multi-modal inputs
- [ ] Gateway successfully calls all ML services
- [ ] API key validation working (401 on missing/invalid)
- [ ] Error handling returns appropriate status codes
- [ ] Legacy compatibility routes work
- [ ] All services start on unique ports
- [ ] No port conflicts when running simultaneously

---

## Troubleshooting

### Service won't start
1. Check port availability: `netstat -ano | findstr :<PORT>`
2. Verify environment variables are set
3. Check logs for detailed error messages

### 401 Unauthorized errors
1. Verify x-api-key header is being sent
2. Check API key matches in .env files
3. Ensure header name is exactly `x-api-key` (lowercase)

### Connection refused
1. Verify service is running
2. Check firewall settings
3. Verify correct port in configuration

### ML service errors
1. Check Python dependencies installed
2. Verify virtual environment activated (if using)
3. Check module imports in service files

---

**Last Updated**: November 23, 2025
**Test Environment**: Local development
**Status**: Ready for testing
