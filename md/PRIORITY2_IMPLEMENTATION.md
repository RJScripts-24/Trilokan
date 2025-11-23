# Priority 2 Implementation - Production Hardening

This document describes the implementation of Priority 2 features for production readiness.

## Overview

All Priority 2 features have been implemented to harden the system for production deployment:

1. ✅ Health polling and graceful degradation
2. ✅ API key validation across ML services
3. ✅ Standardized response schema and validation
4. ✅ App-crawler integration into verification flow
5. ✅ Retry and circuit-breaker capability

## Features Implemented

### 1. Health Polling and Graceful Degradation

**Location:** `api-gateway/src/utils/health-checker.js`

**Features:**
- Periodic health checks for all ML services (default: every 30 seconds)
- Readiness probe on gateway startup
- Service availability tracking with consecutive failure counts
- Graceful degradation responses when services are unavailable
- Feature gating for optional services (e.g., voice complaints)

**Usage:**
```javascript
const mlService = require('./services/ml.service');

// Start health checks (called automatically on server startup)
await mlService.startHealthChecks();

// Check service status
const status = mlService.getMLServicesStatus();

// Check if specific service is available
const isAvailable = mlService.healthChecker.isServiceAvailable('identity');
```

**Configuration:**
- `ML_SERVICES` in `ml.service.js` defines which services are `required` vs optional
- Required services log errors if unavailable on startup
- Optional services are feature-gated (disabled) when unavailable

**Graceful Degradation:**
When a service is down, the gateway returns:
```json
{
  "status": "error",
  "message": "Service temporarily unavailable",
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "service": "complaint",
    "operation": "transcribe",
    "reason": "Service unreachable"
  },
  "meta": {
    "service": "api-gateway",
    "timestamp": "2025-11-23T10:30:00.000Z"
  }
}
```

### 2. API Key Validation

**Implementation:** Already implemented in all ML services

**Services Protected:**
- ✅ Complaint Service (`/api/v1/categorize`, `/transcribe`, `/detect/deepfake`)
- ✅ Identity Verifier (`/verify`, `/verify/identity`)
- ✅ App Crawler (`/app/verify`)

**Authentication Method:**
- Header: `x-api-key`
- Environment variables:
  - `ML_COMPLAINT_API_KEY` (default: `dev-api-key-complaint-service`)
  - `ML_IDENTITY_API_KEY` (default: `dev-api-key-identity-verifier`)
  - `ML_APP_CRAWLER_API_KEY` (default: `dev-api-key-app-crawler`)

**Response on Missing/Invalid Key:**
```json
{
  "status": "error",
  "message": "Unauthorized - Invalid or missing x-api-key"
}
```
HTTP Status: `401 Unauthorized`

### 3. Standardized Response Schema

**Location:** `api-gateway/src/utils/response-validator.js`

**Standard Schema:**
All ML services must return responses conforming to:
```json
{
  "status": "success" | "error",
  "result": {
    // Service-specific payload (required on success)
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {} // optional
  },
  "meta": {
    "service": "service-name",
    "timestamp": "ISO-8601 datetime"
  }
}
```

**Service-Specific Schemas:**

**Complaint Service - Categorize:**
```json
{
  "result": {
    "categories": [{"name": "string", "confidence": 0.0-1.0}],
    "priority": "Low|Medium|High|Critical",
    "keywords": ["string"]
  }
}
```

**Identity Verifier:**
```json
{
  "result": {
    "identity_verified": boolean,
    "confidence": 0.0-1.0,
    "details": {}
  }
}
```

**App Crawler:**
```json
{
  "result": {
    "package_match": boolean,
    "verdict": "safe|suspicious|malicious|error",
    "details": {},
    "hashes": {}
  }
}
```

**Validation Features:**
- Schema validation using Joi
- Automatic rejection of invalid responses
- Safe defaults when validation fails
- Alert logging for schema violations
- Prevention of DB writes with invalid data

**Usage:**
```javascript
const { ResponseValidator } = require('../utils/response-validator');

// Validate response
const validation = ResponseValidator.validateResponse(
  mlResponse, 
  'complaint', 
  'categorize'
);

if (!validation.valid) {
  // Handle invalid response
  logger.error(validation.error);
  return ResponseValidator.getSafeDefault('complaint', 'categorize');
}

// Use sanitized response
const sanitized = validation.sanitized;

// Validate before DB write
const canWrite = ResponseValidator.validateForDbWrite(
  mlResponse,
  'identity',
  'verify'
);
```

### 4. App-Crawler Integration

**Location:** `api-gateway/src/controllers/app.controller.js`

**Features:**
- Combined local hash check + ML analysis
- Fast pre-check using local database
- Deep ML analysis for comprehensive verification
- Conflict resolution between local and ML verdicts
- Audit trail for all verifications

**Verification Flow:**

**APK File Upload:**
1. Calculate SHA256 hash (fast local check)
2. Check hash against local registry
3. Call ML app-crawler for deep analysis
4. Combine verdicts with conflict resolution
5. Write audit trail to database
6. Return comprehensive verdict

**Package Name Verification:**
1. Check package name in local database
2. Call ML app-crawler for package analysis
3. Combine results
4. Write audit trail
5. Return verdict

**Verdict Types:**
- `SAFE`: Verified official app (both checks passed)
- `WARNING`: Conflicts detected (e.g., hash match but ML flagged)
- `SUSPICIOUS`: ML detected issues
- `UNKNOWN`: Unable to verify

**Example Response:**
```json
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

### 5. Retry and Circuit Breaker

**Retry Handler:** `api-gateway/src/utils/retry-handler.js`

**Features:**
- Exponential backoff (default: 1s, 2s, 4s)
- Jitter to prevent thundering herd
- Configurable max retries (default: 3)
- Retryable error detection

**Retryable Errors:**
- Network errors: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNREFUSED`
- HTTP 5xx (server errors)
- HTTP 429 (too many requests)

**Configuration:**
```javascript
const retryHandler = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000,     // 1 second
  maxDelay: 10000,        // 10 seconds
  backoffMultiplier: 2
});
```

**Circuit Breaker:** `api-gateway/src/utils/circuit-breaker.js`

**States:**
- `CLOSED`: Normal operation, requests pass through
- `OPEN`: Service failing, requests rejected immediately
- `HALF_OPEN`: Testing recovery, limited requests allowed

**Features:**
- Automatic failure detection
- Configurable thresholds (default: 5 failures)
- Recovery attempts after timeout (default: 60 seconds)
- Rolling window for failure tracking

**Configuration:**
```javascript
const circuitBreaker = new CircuitBreaker('serviceName', {
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes in half-open
  timeout: 60000,           // 60 seconds before retry
  monitoringPeriod: 10000   // 10 second rolling window
});
```

**Usage:**
```javascript
// Execute with circuit breaker protection
const result = await circuitBreaker.execute(async () => {
  return await apiCall();
});

// Check circuit state
const state = circuitBreaker.getState();
// Returns: { state: 'CLOSED|OPEN|HALF_OPEN', failures: 0, ... }
```

**Integrated Flow:**
All ML service calls automatically use:
1. Circuit breaker check (fast fail if service is down)
2. Retry with exponential backoff (for transient errors)
3. Response validation (schema check)
4. Graceful degradation (return safe defaults on failure)

## Monitoring and Observability

### Health Check Endpoint

**Gateway Health:**
```
GET /
Response: { message: 'API Gateway is running.' }
```

**ML Services Health:**
```javascript
// Programmatic access
const status = mlService.getMLServicesStatus();
const circuitStatus = mlService.getCircuitBreakerStatus();
```

### Logging

All components use Winston logger with structured logging:

**Health Checks:**
```
INFO: ML Services Status: All 3 services healthy
WARN: complaint service health check failed (attempt 1): Service unreachable
ERROR: ALERT: complaint has failed 5 consecutive health checks
```

**Circuit Breaker:**
```
INFO: Circuit breaker entering HALF_OPEN state for identity
WARN: Circuit breaker OPENED for appCrawler - 5 failures in 10000ms
INFO: Circuit breaker CLOSED for identity - service recovered
```

**Response Validation:**
```
ERROR: ML Response Schema Validation Failed for complaint/categorize
ERROR: ALERT: ML Response Schema Validation Failed
```

### Metrics to Monitor

1. **Service Availability:**
   - Health check success rate
   - Consecutive failures per service
   - Last successful health check timestamp

2. **Circuit Breaker:**
   - Circuit state (CLOSED/OPEN/HALF_OPEN)
   - Failure count
   - Time until next retry attempt

3. **Response Validation:**
   - Schema validation failure rate
   - Services with most validation errors

4. **Retries:**
   - Number of retry attempts per request
   - Success rate after retries

## Configuration

### Environment Variables

**Gateway:**
```bash
# ML Service URLs
ML_COMPLAINT_URL=http://localhost:5000
ML_IDENTITY_URL=http://localhost:5002
ML_APP_CRAWLER_URL=http://localhost:5001

# API Keys (MUST be changed in production)
ML_COMPLAINT_API_KEY=dev-api-key-complaint-service
ML_IDENTITY_API_KEY=dev-api-key-identity-verifier
ML_APP_CRAWLER_API_KEY=dev-api-key-app-crawler
```

**ML Services:**
```bash
# Each ML service reads its own API key
X_API_KEY=your-secure-api-key-here
```

### Production Recommendations

1. **API Keys:**
   - Generate strong random keys (minimum 32 characters)
   - Use different keys for each service
   - Rotate keys periodically
   - Store in secrets management (Azure Key Vault, AWS Secrets Manager)

2. **Health Checks:**
   - Adjust check interval based on criticality (30s default)
   - Set up alerts for consecutive failures (5+ failures)
   - Monitor health check response times

3. **Circuit Breaker:**
   - Tune thresholds based on service SLAs
   - Increase timeout in high-latency environments
   - Monitor circuit state changes

4. **Retry:**
   - Reduce max retries for user-facing operations (avoid long waits)
   - Increase for background jobs
   - Adjust delays based on service recovery patterns

5. **Response Validation:**
   - Set up alerts for validation failures
   - Review and fix schema mismatches quickly
   - Monitor for new validation errors after deployments

## Testing

### Manual Testing

**1. Test Health Checks:**
```bash
# Start gateway - should perform readiness probe
npm start

# Watch logs for health status
# Look for: "ML Services Status: All 3 services healthy"
```

**2. Test Graceful Degradation:**
```bash
# Stop one ML service
# Make request to that service through gateway
# Should receive SERVICE_UNAVAILABLE error
```

**3. Test Circuit Breaker:**
```bash
# Stop an ML service
# Make 5+ requests
# Circuit should open
# Requests should fail immediately
# Restart service
# Wait 60 seconds
# Requests should succeed (circuit closed)
```

**4. Test Response Validation:**
```bash
# Modify ML service to return invalid schema
# Make request
# Check logs for validation error
# Verify safe default is returned
```

**5. Test App Verification:**
```bash
# Upload APK file
POST /api/v1/apps/verify-file
# Should see combined local + ML analysis

# Verify package
GET /api/v1/apps/verify-package?packageName=com.example.app
# Should see combined verdict
```

### Integration Tests

See `api-gateway/tests/integration/` for test suites covering:
- Health check functionality
- Circuit breaker behavior
- Retry logic
- Response validation
- App verification flow

## Troubleshooting

### Service Marked as Unavailable

**Symptom:** Gateway returns `SERVICE_UNAVAILABLE` errors

**Diagnosis:**
1. Check service is running: `curl http://localhost:5000/health`
2. Check logs for health check failures
3. Verify network connectivity
4. Check API key configuration

**Resolution:**
- Fix service startup issues
- Update service URL in environment variables
- Restart gateway to re-run readiness probe

### Circuit Breaker Stuck Open

**Symptom:** Requests fail immediately even after service recovery

**Diagnosis:**
1. Check circuit state: `mlService.getCircuitBreakerStatus()`
2. Check if timeout period has elapsed
3. Check service health

**Resolution:**
- Wait for timeout period (60s default)
- Fix underlying service issues
- Restart gateway to reset circuit breakers

### Response Validation Failures

**Symptom:** Logs show schema validation errors

**Diagnosis:**
1. Check ML service response format
2. Compare against expected schema
3. Check for missing required fields

**Resolution:**
- Fix ML service to return correct schema
- Update schema if requirements changed
- Add missing fields to response

### High Retry Rates

**Symptom:** Many retry attempts in logs

**Diagnosis:**
1. Check network stability
2. Check ML service performance
3. Check for intermittent failures

**Resolution:**
- Fix network issues
- Scale up ML services
- Adjust retry thresholds if needed

## Next Steps

After implementing Priority 2 features, consider:

1. **Metrics Dashboard:** Set up Grafana/CloudWatch for real-time monitoring
2. **Alerting:** Configure PagerDuty/Slack alerts for critical failures
3. **Load Testing:** Test circuit breaker and retry under high load
4. **Performance Tuning:** Adjust thresholds based on production metrics
5. **Documentation:** Document runbooks for common failure scenarios

## Summary

All Priority 2 requirements have been successfully implemented:

✅ **Health polling and graceful degradation** - Services monitored continuously, graceful errors returned when unavailable

✅ **API key validation** - All ML services require valid API keys, return 401 on missing/invalid keys

✅ **Standardized response schema** - All services use consistent schema, validated at gateway before DB writes

✅ **App-crawler integration** - Complete integration with combined local + ML verification and audit trails

✅ **Retry and circuit breaker** - Automatic retry with exponential backoff, circuit breaker prevents cascading failures

The system is now production-ready with robust error handling, monitoring, and fault tolerance.
