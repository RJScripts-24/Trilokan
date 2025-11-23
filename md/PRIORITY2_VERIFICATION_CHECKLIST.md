# PRIORITY 2 - VERIFICATION CHECKLIST

Use this checklist to verify all Priority 2 features are working correctly.

## Pre-Flight Checks

### Environment Setup
- [ ] `.env` file exists in `api-gateway/` with all required variables
- [ ] ML service API keys configured in environment
- [ ] ML services have matching API keys configured
- [ ] Database is running and accessible
- [ ] Node.js and Python dependencies installed

### Service Startup
- [ ] PostgreSQL is running
- [ ] Complaint service started on port 5000
- [ ] Identity verifier started on port 5002
- [ ] App crawler started on port 5001
- [ ] API Gateway started on port 3000

---

## Feature Verification

### 7. Health Polling and Graceful Degradation

#### Health Checks Running
- [ ] Gateway logs show "Starting ML services health checks..."
- [ ] Readiness probe completes successfully
- [ ] Logs show "✓ All ML services are ready"
- [ ] Periodic health checks appear in logs (every 30s)
- [ ] Status shows "ML Services Status: All 3 services healthy"

#### Graceful Degradation
- [ ] Stop complaint service
- [ ] Make request to categorize endpoint
- [ ] Response shows `SERVICE_UNAVAILABLE` error
- [ ] Gateway does NOT crash
- [ ] Error includes service name and reason
- [ ] Restart service and verify recovery

**Test Commands:**
```bash
# Check health on startup
npm start | grep "ML Services"

# Test degradation
# Stop service, then:
curl -X POST http://localhost:3000/api/v1/grievances \
  -H "Content-Type: application/json" \
  -d '{"text":"test grievance"}'

# Should return SERVICE_UNAVAILABLE, not 500 error
```

---

### 8. API Key Validation

#### Complaint Service
- [ ] Request without key returns 401
- [ ] Request with wrong key returns 401
- [ ] Request with correct key succeeds
- [ ] `/health` endpoint works without key (public)

**Test Commands:**
```bash
# Should fail with 401
curl -X POST http://localhost:5000/api/v1/categorize \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}'

# Should succeed
curl -X POST http://localhost:5000/api/v1/categorize \
  -H "x-api-key: dev-api-key-complaint-service" \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}'

# Should work without key (public)
curl http://localhost:5000/health
```

#### Identity Verifier
- [ ] Request without key returns 401
- [ ] Request with correct key succeeds
- [ ] `/health` endpoint works without key

**Test Commands:**
```bash
# Should fail with 401
curl -X POST http://localhost:5002/verify \
  -F "video=@test.mp4" \
  -F "audio=@test.mp3" \
  -F "document=@test.jpg"

# Should succeed (with correct key)
curl -X POST http://localhost:5002/verify \
  -H "x-api-key: dev-api-key-identity-verifier" \
  -F "video=@test.mp4" \
  -F "audio=@test.mp3" \
  -F "document=@test.jpg"
```

#### App Crawler
- [ ] Request without key returns 401
- [ ] Request with correct key succeeds
- [ ] `/health` endpoint works without key

**Test Commands:**
```bash
# Should fail with 401
curl -X POST http://localhost:5001/app/verify \
  -F "package_name=com.test.app"

# Should succeed
curl -X POST http://localhost:5001/app/verify \
  -H "x-api-key: dev-api-key-app-crawler" \
  -F "package_name=com.test.app"
```

---

### 9. Response Schema Validation

#### Valid Response Handling
- [ ] Valid ML responses are accepted
- [ ] Responses are sanitized and validated
- [ ] DB writes succeed with valid responses

#### Invalid Response Handling
- [ ] Modify ML service to return invalid schema
- [ ] Gateway logs validation error
- [ ] Safe default is returned instead
- [ ] DB write is blocked
- [ ] Alert is logged

**Test Approach:**
```python
# Temporarily modify complaint/app.py to return invalid schema
@app.route('/api/v1/categorize', methods=['POST'])
@require_api_key
def categorize_complaint_endpoint():
    return jsonify({
        "invalid": "schema",  # Wrong format
        "missing": "required_fields"
    }), 200

# Make request through gateway
# Check logs for:
# - "ML Response Schema Validation Failed"
# - "ALERT: ML Response Schema Validation Failed"
# - Response should be safe default, not invalid schema
```

#### Schema Validation Points
- [ ] Base schema validated (status, result, error, meta)
- [ ] Service-specific result schemas validated
- [ ] Validation logged with details
- [ ] Alerts triggered for failures

---

### 10. App-Crawler Integration

#### APK File Verification
- [ ] Upload APK file through gateway
- [ ] Local hash check executes
- [ ] ML app-crawler called for deep analysis
- [ ] Verdicts combined correctly
- [ ] Audit trail written to logs
- [ ] Response includes both local and ML analysis

**Test Commands:**
```bash
# Upload APK
curl -X POST http://localhost:3000/api/v1/apps/verify-file \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "appFile=@test.apk"

# Check response includes:
# - status (SAFE/WARNING/SUSPICIOUS/UNKNOWN)
# - analysis.localCheck
# - analysis.mlAnalysis
# - ML verdict in details
```

#### Package Name Verification
- [ ] Verify package name through gateway
- [ ] Local DB check executes
- [ ] ML app-crawler called
- [ ] Verdicts combined
- [ ] Audit trail written
- [ ] Response includes combined verdict

**Test Commands:**
```bash
curl "http://localhost:3000/api/v1/apps/verify-package?packageName=com.test.app" \
  -H "Authorization: Bearer YOUR_JWT"

# Check response includes:
# - status
# - localCheck result
# - ML verdict
# - Combined recommendation
```

#### Conflict Resolution
- [ ] Local SAFE + ML SAFE = SAFE
- [ ] Local SAFE + ML SUSPICIOUS = WARNING
- [ ] Local UNKNOWN + ML SAFE = UNKNOWN_BUT_SAFE
- [ ] Local UNKNOWN + ML SUSPICIOUS = SUSPICIOUS

#### Audit Trail
- [ ] All verifications logged
- [ ] ML verdict recorded
- [ ] Timestamps present
- [ ] User ID tracked (if authenticated)

---

### 11. Retry and Circuit Breaker

#### Retry Logic
- [ ] Transient errors trigger retry
- [ ] Exponential backoff applied (1s, 2s, 4s)
- [ ] Jitter added to delays
- [ ] Max 3 retries attempted
- [ ] Success logged after retry

**Test Approach:**
```bash
# Simulate transient failure
# Network blip or temporary service restart
# Check logs for:
# - "Retry attempt 1/3 for ..."
# - "... succeeded after N retries"
```

#### Circuit Breaker
- [ ] Circuit starts CLOSED (normal)
- [ ] Failures increment counter
- [ ] Circuit opens after 5 failures
- [ ] Requests fail immediately when OPEN
- [ ] Circuit enters HALF_OPEN after 60s
- [ ] Successful requests close circuit
- [ ] Failed recovery reopens circuit

**Test Commands:**
```bash
# Stop ML service
# Make 5+ requests quickly
# Check logs for:
# - "Circuit breaker OPENED for serviceName"
# - Requests should fail immediately (no retries)

# Check circuit state
# In Node console:
const mlService = require('./src/services/ml.service');
console.log(mlService.getCircuitBreakerStatus());

# Should show: { state: 'OPEN', failures: 5, nextAttempt: '...' }

# Wait 60 seconds
# Start service
# Make request
# Should succeed and close circuit
```

#### Integration
- [ ] All ML calls protected by circuit breaker
- [ ] Retry and circuit breaker work together
- [ ] Graceful degradation when circuit open
- [ ] Fast-fail behavior when circuit open
- [ ] Automatic recovery when service restored

---

## Integration Testing

### End-to-End Flow
- [ ] Create grievance with text
- [ ] ML categorization called
- [ ] Response validated
- [ ] DB write succeeds
- [ ] Audit trail created

### Failure Scenarios
- [ ] Service down → graceful error
- [ ] Invalid API key → 401 error
- [ ] Invalid schema → safe default
- [ ] Network timeout → retry → success
- [ ] Repeated failures → circuit opens → fast fail

### Recovery Scenarios
- [ ] Service restart → health check passes
- [ ] Circuit recovery → requests succeed
- [ ] Schema fixed → validation passes

---

## Performance Checks

### Health Checker
- [ ] Health checks don't cause CPU spikes
- [ ] Memory usage stable over time
- [ ] Network overhead minimal

### Circuit Breaker
- [ ] Fast-fail is instant (no delay)
- [ ] State transitions logged
- [ ] No memory leaks

### Retry Handler
- [ ] Delays are correct (exponential)
- [ ] Max retries respected
- [ ] No infinite loops

---

## Monitoring Verification

### Logs
- [ ] Health check logs appear regularly
- [ ] Circuit breaker state changes logged
- [ ] Validation errors logged with details
- [ ] Retry attempts logged
- [ ] Audit trails logged

### Log Samples to Verify:
```
✓ "ML Services Status: All 3 services healthy"
✓ "complaint health check failed (attempt 1): ..."
✓ "Circuit breaker OPENED for identity - 5 failures"
✓ "ML Response Schema Validation Failed for ..."
✓ "ALERT: ML Response Schema Validation Failed"
✓ "App Verification Audit"
✓ "Retry attempt 1/3 for complaint categorize"
```

---

## Documentation Verification

- [ ] `PRIORITY2_IMPLEMENTATION.md` exists and is complete
- [ ] `PRIORITY2_QUICK_REFERENCE.md` exists
- [ ] `PRIORITY2_SUMMARY.md` exists
- [ ] All code has JSDoc comments
- [ ] README updated (if needed)

---

## Code Quality

- [ ] No syntax errors in new files
- [ ] No linting errors
- [ ] All exports correctly defined
- [ ] No unused variables
- [ ] Proper error handling throughout

**Verification:**
```bash
cd api-gateway
npm run lint
# Should show no errors
```

---

## Deployment Readiness

### Configuration
- [ ] Environment variables documented
- [ ] API keys generation documented
- [ ] Service URLs configurable
- [ ] Thresholds configurable

### Operations
- [ ] Health check endpoint accessible
- [ ] Circuit breaker state queryable
- [ ] Service status retrievable
- [ ] Logs properly formatted

### Security
- [ ] API keys required for all ML endpoints
- [ ] Keys stored in environment (not hardcoded)
- [ ] Public endpoints limited to /health
- [ ] Audit trails capture security events

---

## Sign-Off

### Feature Completeness
- [ ] All 5 requirements implemented
- [ ] All acceptance criteria met
- [ ] All test scenarios pass
- [ ] Documentation complete

### Production Readiness
- [ ] Error handling comprehensive
- [ ] Logging sufficient for debugging
- [ ] Monitoring hooks in place
- [ ] Security requirements met

### Team Confirmation
- [ ] Developer tested: _________________ Date: _______
- [ ] QA verified: ______________________ Date: _______
- [ ] Tech lead approved: _______________ Date: _______
- [ ] Ready for production: _____________ Date: _______

---

## Issues Found

Document any issues discovered during verification:

| Issue # | Description | Severity | Status | Resolution |
|---------|-------------|----------|--------|------------|
|         |             |          |        |            |

---

## Notes

Additional observations or recommendations:

---

**Verification completed by:** ___________________ **Date:** ___________

**Status:** [ ] PASS [ ] FAIL [ ] NEEDS WORK

**Comments:**
