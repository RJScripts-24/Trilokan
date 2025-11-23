# Trilokan Development Environment Setup

This guide helps you set up the complete Trilokan Digital Trust Platform development environment using Docker Compose.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Git
- At least 8GB RAM available for Docker
- Ports available: 3000, 3001, 5000, 5001, 5002, 5432, 9090

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration (optional for development)
# The defaults work out of the box for local development
```

### 2. Start Development Environment

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Or run in detached mode (background)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f api-gateway
```

### 3. Initialize Database

```bash
# Run migrations
docker-compose -f docker-compose.dev.yml exec api-gateway npm run db:migrate

# Seed initial data
docker-compose -f docker-compose.dev.yml exec api-gateway npm run db:seed
```

### 4. Verify Services

Open your browser and check:

- **API Gateway**: http://localhost:3000
- **API Health**: http://localhost:3000/health
- **Complaint ML Service**: http://localhost:5000/health
- **App Crawler Service**: http://localhost:5001/health
- **Identity Verifier**: http://localhost:5002/health
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### 5. Stop Services

```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.dev.yml down -v
```

## Service Architecture

```
┌─────────────────┐
│   API Gateway   │ :3000
│   (Node.js)     │
└────────┬────────┘
         │
    ┌────┴─────────────────────────┐
    │                              │
┌───▼────────┐  ┌────────────┐  ┌─▼──────────────┐
│ Complaint  │  │ App        │  │ Identity       │
│ ML Service │  │ Crawler    │  │ Verifier       │
│ :5000      │  │ :5001      │  │ :5002          │
└────────────┘  └────────────┘  └────────────────┘
                                        
┌──────────────┐  ┌────────────┐  ┌──────────────┐
│  PostgreSQL  │  │ Prometheus │  │   Grafana    │
│  :5432       │  │ :9090      │  │   :3001      │
└──────────────┘  └────────────┘  └──────────────┘
```

## Environment Variables

### Essential Configuration

Edit `.env` file:

```env
# Database
DB_NAME=trilokan_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# ML Service API Keys
ML_COMPLAINT_API_KEY=dev-api-key-complaint-service
ML_IDENTITY_API_KEY=dev-api-key-identity-verifier
ML_APP_CRAWLER_API_KEY=dev-api-key-app-crawler
```

### Optional Configuration

```env
# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Feature Flags
ENABLE_ML_SERVICES=true
ENABLE_EMAIL_NOTIFICATIONS=false
```

## Development Workflow

### Hot Reload

The development setup includes hot-reload for the API Gateway:

- Changes to JavaScript files automatically restart the server
- No need to rebuild Docker containers for code changes
- Changes to `package.json` require container restart

### Running Tests

```bash
# Unit tests
docker-compose -f docker-compose.dev.yml exec api-gateway npm run test

# Integration tests
docker-compose -f docker-compose.dev.yml exec api-gateway npm run test -- --testPathPattern=integration

# Coverage report
docker-compose -f docker-compose.dev.yml exec api-gateway npm run coverage
```

### Database Operations

```bash
# Create new migration
docker-compose -f docker-compose.dev.yml exec api-gateway npx sequelize-cli migration:generate --name migration-name

# Run migrations
docker-compose -f docker-compose.dev.yml exec api-gateway npm run db:migrate

# Undo last migration
docker-compose -f docker-compose.dev.yml exec api-gateway npm run db:migrate:undo

# Seed database
docker-compose -f docker-compose.dev.yml exec api-gateway npm run db:seed
```

### Accessing Containers

```bash
# Shell into API Gateway
docker-compose -f docker-compose.dev.yml exec api-gateway sh

# Shell into PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d trilokan_db

# Shell into ML service
docker-compose -f docker-compose.dev.yml exec complaint-ml sh
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port (Windows PowerShell)
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs <service-name>

# Rebuild container
docker-compose -f docker-compose.dev.yml up --build <service-name>

# Clean slate
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### Database Connection Issues

```bash
# Ensure PostgreSQL is healthy
docker-compose -f docker-compose.dev.yml ps

# Check PostgreSQL logs
docker-compose -f docker-compose.dev.yml logs postgres

# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres
docker-compose -f docker-compose.dev.yml exec api-gateway npm run db:migrate
```

### ML Services Not Responding

```bash
# Check ML service health
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:5002/health

# View ML service logs
docker-compose -f docker-compose.dev.yml logs complaint-ml
docker-compose -f docker-compose.dev.yml logs app-crawler
docker-compose -f docker-compose.dev.yml logs identity-verifier

# Restart ML service
docker-compose -f docker-compose.dev.yml restart complaint-ml
```

## Monitoring

### Prometheus Metrics

Access Prometheus at http://localhost:9090

Useful queries:
```promql
# HTTP request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# ML service response time
histogram_quantile(0.95, rate(ml_request_duration_seconds_bucket[5m]))
```

### Grafana Dashboards

1. Access Grafana at http://localhost:3001
2. Login: `admin` / `admin`
3. Pre-configured dashboards available for:
   - API Gateway metrics
   - ML Services health
   - Database performance
   - Request/Response latency

## CI/CD Integration

### Running CI Checks Locally

```bash
# Lint
docker-compose -f docker-compose.dev.yml exec api-gateway npm run lint

# Fix linting issues
docker-compose -f docker-compose.dev.yml exec api-gateway npm run lint:fix

# Run all tests
docker-compose -f docker-compose.dev.yml exec api-gateway npm test

# Generate coverage
docker-compose -f docker-compose.dev.yml exec api-gateway npm run coverage
```

### GitHub Actions

The CI pipeline automatically runs on push/PR:
- Linting
- Unit tests
- Integration tests
- Security scans
- Docker builds

## Best Practices

1. **Never commit `.env`** - Use `.env.example` as template
2. **Change default secrets** - Especially `JWT_SECRET` and API keys
3. **Use correlation IDs** - All requests include `x-request-id` header
4. **Check logs** - Use correlation IDs to trace requests across services
5. **Run tests** - Before committing, run full test suite
6. **Monitor metrics** - Keep Grafana open during development

## Additional Resources

- [API Documentation](./api-gateway/README.md)
- [ML Services Documentation](./ml-services/README.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)

## Support

For issues or questions:
1. Check existing issues on GitHub
2. Review logs: `docker-compose -f docker-compose.dev.yml logs`
3. Create new issue with logs and environment details
