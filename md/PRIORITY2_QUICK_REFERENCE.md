# Quick Reference - Priority 2 Production Features

## Files Created/Modified

### New Files Created
1. `api-gateway/src/utils/health-checker.js` - ML services health monitoring
2. `api-gateway/src/utils/circuit-breaker.js` - Circuit breaker implementation
3. `api-gateway/src/utils/retry-handler.js` - Retry with exponential backoff
4. `api-gateway/src/utils/response-validator.js` - Response schema validation
5. `PRIORITY2_IMPLEMENTATION.md` - Complete documentation

### Modified Files
1. `api-gateway/src/services/ml.service.js` - Integrated all production features
2. `api-gateway/server.js` - Added health check startup
3. `api-gateway/src/controllers/app.controller.js` - App-crawler integration
4. `api-gateway/src/services/app.service.js` - Added audit trail methods

## Quick Start

### 1. Environment Setup

Create `.env` file in `api-gateway/`:
```bash
# ML Service URLs
ML_COMPLAINT_URL=http://localhost:5000
ML_IDENTITY_URL=http://localhost:5002
ML_APP_CRAWLER_URL=http://localhost:5001

# API Keys (change in production!)
ML_COMPLAINT_API_KEY=your-secure-key-1
ML_IDENTITY_API_KEY=your-secure-key-2
ML_APP_CRAWLER_API_KEY=your-secure-key-3
```

Set corresponding keys in ML services:
```bash
# In each ML service
X_API_KEY=your-secure-key-matching-gateway
```

### 2. Start Services

```bash
# Terminal 1 - Database
docker-compose up postgres

# Terminal 2 - Complaint Service
cd ml-services/complaint
python app.py

# Terminal 3 - Identity Verifier
cd ml-services/identity-verifier
python app.py

# Terminal 4 - App Crawler
cd ml-services/app-crawler
python app_api.py

# Terminal 5 - API Gateway
cd api-gateway
npm start
```

### 3. Verify Health

Check gateway logs for:
```
INFO: Checking ML services readiness...
INFO: ✓ All ML services are ready
INFO: Starting health checker for ML services
INFO: ML Services Status: All 3 services healthy
```

## Key Features at a Glance

### Health Monitoring
- **Automatic:** Checks every 30 seconds
- **Startup:** Readiness probe before accepting traffic
- **Degradation:** Returns error when service unavailable

### API Security
- **Header:** `x-api-key` required for all ML endpoints
- **Response:** 401 Unauthorized if missing/invalid
- **Public:** `/health` endpoints don't require auth

### Response Validation
- **Schema:** Joi-based validation
- **DB Protection:** Invalid responses blocked from DB
- **Alerts:** Critical logs for schema violations

### App Verification
- **Local Check:** Fast SHA256 hash lookup
- **ML Analysis:** Deep inspection by app-crawler
- **Combined:** Best of both with conflict resolution
- **Audit:** All verifications logged

### Fault Tolerance
- **Retry:** 3 attempts with exponential backoff
- **Circuit Breaker:** Opens after 5 failures
- **Recovery:** Auto-retry after 60 seconds
- **Fast Fail:** Immediate error when circuit open

## API Examples

### Check ML Services Status (Programmatic)
```javascript
const mlService = require('./services/ml.service');

// Get overall status
const status = mlService.getMLServicesStatus();
// Returns: { timestamp, services: { complaint, identity, appCrawler } }

// Get circuit breaker status
const circuits = mlService.getCircuitBreakerStatus();
// Returns: { complaint: {...}, identity: {...}, appCrawler: {...} }
```

### Verify APK File
```bash
curl -X POST http://localhost:3000/api/v1/apps/verify-file \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "appFile=@path/to/app.apk"

# Response:
{
  "status": "SAFE",
  "message": "This is a verified official application.",
  "details": {
    "name": "Official Bank App",
    "publisher": "Bank Corp",
    "mlVerdict": "Confirmed safe by ML analysis"
  },
  "analysis": {
    "localCheck": "MATCHED",
    "mlAnalysis": "COMPLETED"
  }
}
```

### Verify Package Name
```bash
curl "http://localhost:3000/api/v1/apps/verify-package?packageName=com.bank.mobile" \
  -H "Authorization: Bearer YOUR_JWT"

# Response:
{
  "status": "OFFICIAL",
  "message": "Verified package found - Confirmed by ML analysis.",
  "officialHash": "abc123...",
  "storeUrl": "https://play.google.com/...",
  "mlVerdict": "safe"
}
```

## Monitoring Checklist

### Daily Checks
- [ ] Review health check logs for failures
- [ ] Check circuit breaker states (should be CLOSED)
- [ ] Monitor response validation errors
- [ ] Review audit logs for suspicious patterns

### Weekly Checks
- [ ] Analyze retry rates and patterns
- [ ] Review ML service response times
- [ ] Check for schema validation alerts
- [ ] Verify API key rotations (if scheduled)

### Monthly Checks
- [ ] Review and tune circuit breaker thresholds
- [ ] Analyze failure patterns and root causes
- [ ] Update response schemas if needed
- [ ] Performance testing under load

## Troubleshooting Commands

### Check if ML Service is Reachable
```bash
# From gateway server
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:5002/health

# Should return: {"service": "...", "status": "ok", "timestamp": "..."}
```

### Test API Key Authentication
```bash
# Without key (should fail with 401)
curl http://localhost:5000/api/v1/categorize \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'

# With key (should succeed)
curl http://localhost:5000/api/v1/categorize \
  -H "x-api-key: dev-api-key-complaint-service" \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'
```

### Reset Circuit Breaker (Manual)
```javascript
// In gateway console or script
const { circuitBreakers } = require('./src/services/ml.service');
circuitBreakers.complaint.reset();
circuitBreakers.identity.reset();
circuitBreakers.appCrawler.reset();
```

### View Health Status
```bash
# In gateway logs, look for:
grep "ML Services Status" logs/app.log
grep "Circuit breaker" logs/app.log
grep "health check" logs/app.log
```

## Production Deployment Checklist

### Pre-Deployment
- [ ] Generate strong API keys (32+ characters)
- [ ] Update all environment variables
- [ ] Test health checks in staging
- [ ] Verify circuit breaker thresholds
- [ ] Run integration test suite

### Deployment
- [ ] Deploy ML services first
- [ ] Verify ML services are healthy
- [ ] Deploy gateway
- [ ] Watch startup logs for readiness probe
- [ ] Verify all circuits are CLOSED

### Post-Deployment
- [ ] Monitor health check success rate
- [ ] Watch for response validation errors
- [ ] Check circuit breaker state
- [ ] Review initial retry patterns
- [ ] Validate app verification flow

### Monitoring Setup
- [ ] Configure alerts for consecutive health failures (5+)
- [ ] Set up circuit breaker state change alerts
- [ ] Monitor response validation failure rate
- [ ] Track retry success/failure rates
- [ ] Set up dashboard for service health

## Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Service unavailable | `SERVICE_UNAVAILABLE` errors | Check service is running, verify URL/port |
| Circuit breaker stuck | Immediate failures | Wait for timeout (60s) or restart gateway |
| Auth failures | 401 errors | Verify API keys match between gateway and services |
| Validation errors | Schema validation logs | Fix ML service response format |
| High retry rate | Many retry logs | Check network stability, scale ML services |

## Contact and Support

For issues or questions:
1. Check `PRIORITY2_IMPLEMENTATION.md` for detailed documentation
2. Review logs in `api-gateway/logs/`
3. Check ML service logs
4. Verify environment configuration

---

**All Priority 2 features are implemented and production-ready!** ✅
