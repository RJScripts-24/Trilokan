# Priority 3 - Verification Checklist

Use this checklist to verify the Priority 3 implementation is working correctly.

## ✅ Pre-Deployment Verification

### 1. Dependencies Installation

```bash
cd api-gateway
npm install
```

**Verify:**
- [ ] `uuid` package installed
- [ ] `prom-client` package installed
- [ ] No dependency errors

### 2. Database Migration

```bash
npm run db:migrate
```

**Verify:**
- [ ] Migration `20251123000001-add-correlation-id.js` executed
- [ ] `grievances.correlation_id` column exists
- [ ] `grievance_logs.correlation_id` column exists
- [ ] Index `grievance_logs_correlation_id_idx` created

**SQL Check:**
```sql
-- Verify columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'grievances' AND column_name = 'correlation_id';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'grievance_logs' AND column_name = 'correlation_id';

-- Verify index exists
SELECT indexname FROM pg_indexes 
WHERE indexname = 'grievance_logs_correlation_id_idx';
```

---

## ✅ Correlation ID Functionality

### Test 1: Auto-Generation

```bash
curl -v http://localhost:3000/api/v1/grievances
```

**Verify:**
- [ ] Response includes `x-request-id` header
- [ ] Header value is valid UUID v4 format
- [ ] Same ID appears in logs

**Expected:**
```
< x-request-id: 550e8400-e29b-41d4-a716-446655440000
```

### Test 2: Client-Provided ID

```bash
curl -v -H "x-request-id: test-correlation-123" \
  http://localhost:3000/api/v1/grievances
```

**Verify:**
- [ ] Response includes same `x-request-id: test-correlation-123`
- [ ] Logs show `test-correlation-123`

### Test 3: Propagation to ML Services

```bash
curl -v -H "x-request-id: ml-test-456" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test complaint"}' \
  http://localhost:3000/api/v1/grievances/categorize
```

**Verify in logs:**
- [ ] Request log shows `ml-test-456`
- [ ] ML service call log shows `ml-test-456`
- [ ] ML service response log shows `ml-test-456`

**Expected log sequence:**
```
[2025-11-23 10:30:45] [ml-test-456] info: Incoming request
[2025-11-23 10:30:45] [ml-test-456] info: ML service call initiated
[2025-11-23 10:30:46] [ml-test-456] info: ML service call completed
[2025-11-23 10:30:46] [ml-test-456] info: Request completed
```

### Test 4: Database Persistence

Create a grievance and check database:

```sql
-- Check most recent grievances
SELECT id, title, correlation_id 
FROM grievances 
ORDER BY created_at DESC 
LIMIT 5;

-- Find all logs for a correlation ID
SELECT * FROM grievance_logs 
WHERE correlation_id = '<your-request-id>';
```

**Verify:**
- [ ] `correlation_id` saved in `grievances` table
- [ ] `correlation_id` saved in `grievance_logs` table
- [ ] Can query by correlation ID efficiently

---

## ✅ Integration Tests

### Run All Tests

```bash
cd api-gateway
npm test
```

**Verify:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] ML integration tests pass (15+ tests)
- [ ] Correlation ID tests pass

**Expected output:**
```
PASS  tests/integration/ml.integration.test.js
  ML Integration - End-to-End Flow
    POST /api/v1/grievances/categorize
      ✓ should categorize with correlation ID
      ✓ should generate correlation ID if not provided
      ...
    
Tests: 15 passed, 15 total
```

### Test Coverage

```bash
npm run coverage
```

**Verify:**
- [ ] Coverage report generated
- [ ] Line coverage > 70%
- [ ] Branch coverage > 60%
- [ ] New files included in coverage

---

## ✅ CI Pipeline

### Trigger CI

```bash
git add .
git commit -m "feat: implement Priority 3 - operational excellence"
git push origin Rishabh
```

**Verify on GitHub Actions:**
- [ ] Workflow triggered
- [ ] Lint job passes
- [ ] Test job passes (Node 18 & 20)
- [ ] Integration tests pass
- [ ] ML services health check passes
- [ ] Docker build succeeds
- [ ] Security scan completes

---

## ✅ Docker Compose Development

### Start Environment

```bash
cd backend
docker-compose -f docker-compose.dev.yml up -d
```

**Verify:**
- [ ] All services start successfully
- [ ] No port conflicts
- [ ] Health checks pass for all services

### Check Service Health

```bash
# PostgreSQL
docker-compose -f docker-compose.dev.yml ps postgres
# Status should be "Up (healthy)"

# API Gateway
curl http://localhost:3000/health
# Should return status: "healthy"

# ML Services
curl http://localhost:5000/health  # Complaint ML
curl http://localhost:5001/health  # App Crawler
curl http://localhost:5002/health  # Identity Verifier
```

**Verify:**
- [ ] PostgreSQL healthy
- [ ] API Gateway healthy
- [ ] All ML services healthy
- [ ] Prometheus accessible (http://localhost:9090)
- [ ] Grafana accessible (http://localhost:3001)

### Test Hot Reload

1. Edit `api-gateway/src/routes/index.js`
2. Add a comment
3. Save file

**Verify:**
- [ ] Container detects change
- [ ] Server restarts automatically
- [ ] No manual rebuild needed

### Volume Persistence

```bash
# Stop services
docker-compose -f docker-compose.dev.yml down

# Start again
docker-compose -f docker-compose.dev.yml up -d
```

**Verify:**
- [ ] Database data persists
- [ ] Uploaded files persist
- [ ] Logs persist

---

## ✅ Monitoring & Metrics

### Metrics Endpoint

```bash
curl http://localhost:3000/metrics
```

**Verify metrics present:**
- [ ] `trilokan_gateway_http_requests_total`
- [ ] `trilokan_gateway_http_request_duration_seconds`
- [ ] `trilokan_gateway_ml_requests_total`
- [ ] `trilokan_gateway_ml_request_duration_seconds`
- [ ] `trilokan_gateway_ml_errors_total`
- [ ] `trilokan_gateway_circuit_breaker_state`
- [ ] `trilokan_gateway_active_requests`
- [ ] `trilokan_gateway_auth_attempts_total`

### Prometheus Integration

1. Open http://localhost:9090
2. Go to Status → Targets
3. Check `api-gateway` target

**Verify:**
- [ ] Target state: UP
- [ ] Last scrape successful
- [ ] Scrape duration < 100ms

### Test Metric Recording

```bash
# Generate some requests
for i in {1..10}; do
  curl http://localhost:3000/health
done

# Check metrics updated
curl http://localhost:3000/metrics | grep http_requests_total
```

**Verify:**
- [ ] Counter incremented
- [ ] Histogram buckets populated
- [ ] Labels applied correctly

### Prometheus Queries

In Prometheus UI (http://localhost:9090), test these queries:

```promql
# Request rate
rate(trilokan_gateway_http_requests_total[5m])

# Error rate
rate(trilokan_gateway_http_requests_total{status_code=~"5.."}[5m])

# Active requests
trilokan_gateway_active_requests

# Circuit breaker status
trilokan_gateway_circuit_breaker_state
```

**Verify:**
- [ ] Queries return data
- [ ] Graphs render correctly
- [ ] Labels filter properly

### Grafana Setup

1. Open http://localhost:3001
2. Login: admin/admin
3. Check datasources

**Verify:**
- [ ] Prometheus datasource configured
- [ ] Connection successful
- [ ] Can query metrics

---

## ✅ Alert Rules

### Verify Alert Rules Loaded

In Prometheus UI:
1. Go to Status → Rules
2. Check `api_gateway_alerts` group

**Verify:**
- [ ] Alert rules loaded
- [ ] No syntax errors
- [ ] Rules evaluating correctly

### Test Alert Triggering (Optional)

**Simulate high error rate:**
```bash
# Trigger errors
for i in {1..20}; do
  curl http://localhost:3000/nonexistent
done
```

**Check alerts:**
1. Go to Prometheus → Alerts
2. Look for `HighErrorRate` alert

**Verify:**
- [ ] Alert appears
- [ ] State changes to PENDING
- [ ] After threshold, state changes to FIRING

---

## ✅ Enhanced Health Endpoint

```bash
curl http://localhost:3000/health | jq
```

**Verify response includes:**
- [ ] `status` field (healthy/degraded/unhealthy)
- [ ] `timestamp`
- [ ] `uptime`
- [ ] `services.database`
- [ ] `services.mlServices` (all three services)
- [ ] `services.circuitBreakers` (all three breakers)
- [ ] `criticalIssues` array

**Expected structure:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-23T10:30:45Z",
  "uptime": 123.45,
  "services": {
    "database": "connected",
    "mlServices": {
      "complaint": { "available": true },
      "identity": { "available": true },
      "appCrawler": { "available": true }
    },
    "circuitBreakers": {
      "complaint": "CLOSED",
      "identity": "CLOSED",
      "appCrawler": "CLOSED"
    }
  },
  "criticalIssues": []
}
```

---

## ✅ Log Sanitization

### Test PII Removal

```bash
# Make request with file upload
curl -F "audio=@test.mp3" \
  -H "x-request-id: pii-test-789" \
  http://localhost:3000/api/v1/grievances/transcribe
```

**Check logs for `pii-test-789`:**

**Verify:**
- [ ] Binary data NOT logged
- [ ] File marked as `[BINARY_DATA]`
- [ ] Only metadata logged (filename, size, type)
- [ ] No sensitive content in logs

**Expected log:**
```
[2025-11-23 10:30:45] [pii-test-789] info: ML service call initiated {
  "serviceName": "complaint",
  "operation": "transcribe",
  "context": {
    "audioFile": "[BINARY_DATA]",
    "hasAudio": true,
    "filename": "test.mp3"
  }
}
```

---

## ✅ Documentation

**Verify files exist:**
- [ ] `PRIORITY3_IMPLEMENTATION.md`
- [ ] `PRIORITY3_QUICK_REFERENCE.md`
- [ ] `PRIORITY3_VERIFICATION_CHECKLIST.md` (this file)
- [ ] `DEV_SETUP.md`
- [ ] `.env.example` updated

**Verify README instructions:**
- [ ] Clear setup steps
- [ ] Environment variables documented
- [ ] Troubleshooting section included
- [ ] Examples provided

---

## ✅ Production Readiness

### Security
- [ ] API keys in environment variables (not hardcoded)
- [ ] JWT secret configurable
- [ ] PII sanitized from logs
- [ ] Security scan passes (Trivy)
- [ ] npm audit shows no critical vulnerabilities

### Performance
- [ ] Metrics show acceptable latency (<500ms p95)
- [ ] No memory leaks (check after 1hr runtime)
- [ ] Circuit breakers working correctly
- [ ] Database connection pool not exhausted

### Reliability
- [ ] All health checks passing
- [ ] Circuit breakers recover from failures
- [ ] Degraded responses served when ML services down
- [ ] No infinite retry loops

### Observability
- [ ] Correlation IDs in all logs
- [ ] Metrics exposed for all services
- [ ] Alerts configured for critical issues
- [ ] Can trace requests end-to-end

---

## 🎯 Final Acceptance

**All Priority 3 requirements met:**

✅ **Task 12: Request/Response Logging**
- Correlation IDs generated/accepted
- Propagated to ML services
- Persisted in database
- PII-safe logging

✅ **Task 13: Integration Tests & CI**
- 15+ integration tests
- CI pipeline running
- Negative cases covered
- Prevents regressions

✅ **Task 14: Docker Compose & Env**
- One-command startup works
- Environment documented
- Reproducible dev environment
- README with instructions

✅ **Task 15: Monitoring & Alerting**
- Prometheus metrics exposed
- Alert rules configured
- Health checks comprehensive
- Alerts fire correctly

---

## 📋 Sign-Off

**Tested by:** _________________  
**Date:** _________________  
**Status:** ⬜ Pass  ⬜ Fail  
**Notes:** _________________

---

**Ready for Production Deployment** ✅
