# Trilokan Backend Services

Multi-service architecture for digital trust and cyber fraud detection system.

## Service Architecture

### Port Assignments

All services run on unique ports to avoid conflicts:

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Main entry point for all client requests |
| Complaint ML Service | 5000 | NLP, categorization, transcription, deepfake detection |
| App Crawler Service | 5001 | APK verification and app safety analysis |
| Identity Verifier Service | 5002 | Multi-modal identity verification (face, voice, document) |
| PostgreSQL Database | 5432 | Primary data store |

## Quick Start

### Prerequisites

- Node.js >= 14.0.0
- Python >= 3.8
- PostgreSQL >= 13
- Docker & Docker Compose (optional)

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Manual Setup

#### 1. Setup API Gateway

```bash
cd api-gateway
npm install
cp ../.env.example .env
# Edit .env with your configuration
npm run db:migrate
npm run db:seed
npm start
```

#### 2. Setup Complaint ML Service

```bash
cd ml-services/complaint
pip install -r requirements.txt
cp .env.example .env
# Edit .env (default PORT=5000)
python app.py
```

#### 3. Setup App Crawler Service

```bash
cd ml-services/app-crawler
pip install -r requirements.txt
cp .env.example .env
# Edit .env (default PORT=5001)
python app_api.py
```

#### 4. Setup Identity Verifier Service

```bash
cd ml-services/identity-verifier
pip install -r requirements.txt
cp .env.example .env
# Edit .env (default PORT=5002)
python app.py
```

## Service Endpoints

### API Gateway (Port 3000)

- `GET /health` - Health check
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/grievances` - Submit grievance
- `POST /api/v1/identity/verify` - Identity verification
- `POST /api/v1/apps/verify` - App safety check

### Complaint ML Service (Port 5000)

- `GET /health` - Health check
- `POST /api/v1/categorize` - Categorize complaint text
- `POST /transcribe` - Audio transcription
- `POST /detect/deepfake` - Deepfake detection

**Authentication**: Requires `x-api-key` header

### App Crawler Service (Port 5001)

- `GET /health` - Health check
- `POST /app/verify` - Verify app safety (APK/package)

**Authentication**: Requires `x-api-key` header

### Identity Verifier Service (Port 5002)

- `GET /health` - Health check
- `POST /verify` - Multi-modal identity verification
- `POST /verify/identity` - Phase 2 verification (advanced)

**Authentication**: Requires `x-api-key` header

## Environment Variables

Each service has its own `.env` file. Copy from `.env.example` and customize:

### API Gateway

```env
PORT=3000
ML_COMPLAINT_URL=http://localhost:5000
ML_APP_CRAWLER_URL=http://localhost:5001
ML_IDENTITY_URL=http://localhost:5002
```

### ML Services

```env
PORT=<service-port>
X_API_KEY=<your-api-key>
```

## Development

### Running Individual Services

```bash
# API Gateway
cd api-gateway
npm run dev

# Complaint ML
cd ml-services/complaint
python app.py

# App Crawler
cd ml-services/app-crawler
python app_api.py

# Identity Verifier
cd ml-services/identity-verifier
python app.py
```

### Health Checks

Verify all services are running:

```bash
curl http://localhost:3000/health
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:5002/health
```

## Testing

### API Gateway

```bash
cd api-gateway
npm test
npm run coverage
```

### ML Services

```bash
# Each service has its own tests
cd ml-services/<service-name>
pytest tests/
```

## Security

- All ML services require `x-api-key` header for authentication
- Configure unique API keys for each environment
- Never commit `.env` files to version control
- Use HTTPS in production

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Windows
netstat -ano | findstr :<PORT>
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :<PORT>
kill -9 <PID>
```

Or change the port in the service's `.env` file.

### Service Connection Issues

1. Verify all services are running (check health endpoints)
2. Check API keys match between gateway and ML services
3. Review logs for detailed error messages

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Verify database credentials in `.env`
3. Run migrations: `npm run db:migrate`

## License

MIT
