# Priority 3 - Quick Reference Guide

## 🚀 One-Liner Commands

```bash
# Start everything
docker-compose -f docker-compose.dev.yml up

# Run tests
npm test

# Run migrations
docker-compose -f docker-compose.dev.yml exec api-gateway npm run db:migrate

# View logs with correlation
docker-compose -f docker-compose.dev.yml logs -f api-gateway | grep "550e8400"
```

---

## 📊 Key Endpoints

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `GET /health` | Service health + ML status | `curl http://localhost:3000/health` |
| `GET /metrics` | Prometheus metrics | `curl http://localhost:3000/metrics` |
| `GET /` | Basic ping | `curl http://localhost:3000/` |

---

## 🔍 Correlation ID Usage

### Client Provides ID
```bash
curl -H "x-request-id: my-trace-123" \
  http://localhost:3000/api/v1/grievances
```

### Auto-Generated ID
```bash
curl http://localhost:3000/api/v1/grievances
# Response headers include: x-request-id: <uuid>
```

### Database Query
```sql
-- Find all logs for a specific request
SELECT * FROM grievance_logs 
WHERE correlation_id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## 🧪 Testing Commands

```bash
# All tests
npm test

# Integration only
npm test -- --testPathPattern=integration

# Unit only
npm test -- --testPathPattern=unit

# Watch mode
npm run test:watch

# Coverage
npm run coverage

# Lint
npm run lint

# Lint + fix
npm run lint:fix
```

---

## 📈 Monitoring Access

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **API Metrics**: http://localhost:3000/metrics
- **Health Check**: http://localhost:3000/health

---

## 🔔 Common Prometheus Queries

```promql
# HTTP Error Rate (last 5 min)
rate(trilokan_gateway_http_requests_total{status_code=~"5.."}[5m])

# ML Service Latency p95
histogram_quantile(0.95, rate(trilokan_gateway_ml_request_duration_seconds_bucket[5m]))

# Active Requests
trilokan_gateway_active_requests

# Circuit Breaker State (0=closed, 1=open, 2=half-open)
trilokan_gateway_circuit_breaker_state

# Authentication Failures
rate(trilokan_gateway_auth_attempts_total{status="failed"}[5m])
```

---

## 🐛 Troubleshooting

### Ports in Use
```powershell
# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Service Won't Start
```bash
# View logs
docker-compose -f docker-compose.dev.yml logs <service>

# Rebuild
docker-compose -f docker-compose.dev.yml up --build <service>

# Clean slate
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### No Correlation IDs in Logs
```bash
# Check middleware order in app.js
# correlationMiddleware must be FIRST

# Verify logger format
# Check src/config/logger.js for structuredFormat
```

### Metrics Not Appearing
```bash
# Check /metrics endpoint
curl http://localhost:3000/metrics

# Verify Prometheus targets
# http://localhost:9090/targets

# Check metricsMiddleware in app.js
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/middleware/correlation.middleware.js` | Correlation ID logic |
| `src/utils/metrics.js` | Prometheus metrics |
| `src/services/ml.service.js` | ML service calls with tracing |
| `tests/integration/ml.integration.test.js` | Integration tests |
| `.github/workflows/ci.yml` | CI pipeline |
| `docker-compose.dev.yml` | Dev environment |
| `monitoring/prometheus.yml` | Prometheus config |
| `monitoring/alerts/rules.yml` | Alert definitions |

---

## 🔄 Typical Development Workflow

1. **Start services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Make code changes**
   - API Gateway hot-reloads automatically

3. **View logs with correlation**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f api-gateway
   ```

4. **Test changes**
   ```bash
   docker-compose -f docker-compose.dev.yml exec api-gateway npm test
   ```

5. **Check metrics**
   - Open http://localhost:9090 (Prometheus)
   - Open http://localhost:3001 (Grafana)

6. **Commit and push**
   - CI automatically runs tests

---

## 🎯 Quick Health Check

```bash
# All services healthy?
curl http://localhost:3000/health | jq

# Should return:
{
  "status": "healthy",
  "timestamp": "2025-11-23T...",
  "uptime": 123.45,
  "services": {
    "database": "connected",
    "mlServices": {
      "complaint": { "available": true, ... },
      "identity": { "available": true, ... },
      "appCrawler": { "available": true, ... }
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

## 📚 Related Documentation

- Full Implementation: `PRIORITY3_IMPLEMENTATION.md`
- Dev Setup: `DEV_SETUP.md`
- Testing Guide: `TESTING_GUIDE.md`
- API Docs: `api-gateway/README.md`

---

## ⚡ Performance Tips

1. **Use correlation IDs** - Always include `x-request-id` for tracing
2. **Monitor circuit breakers** - Check `/health` regularly
3. **Watch metrics** - Keep Grafana open during development
4. **Check logs** - Use correlation IDs to trace issues
5. **Run tests** - Before every commit

---

**Need Help?** Check the troubleshooting section or review logs with correlation IDs.
