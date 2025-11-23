# Trilokan Backend - Quick Start Script (Windows)
# This script helps set up the development environment quickly

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Trilokan Backend Quick Start" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env files exist
Write-Host "Checking environment configuration..." -ForegroundColor Yellow

if (-Not (Test-Path ".env")) {
    Write-Host "Creating root .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env" -ForegroundColor Green
} else {
    Write-Host "✓ .env exists" -ForegroundColor Green
}

# Check ML services .env files
$services = @("complaint", "app-crawler", "identity-verifier")
foreach ($service in $services) {
    $envPath = "ml-services\$service\.env"
    $examplePath = "ml-services\$service\.env.example"
    
    if (-Not (Test-Path $envPath)) {
        Write-Host "Creating $envPath..." -ForegroundColor Yellow
        Copy-Item $examplePath $envPath
        Write-Host "✓ Created $envPath" -ForegroundColor Green
    } else {
        Write-Host "✓ $envPath exists" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Install API Gateway dependencies
Write-Host "Installing API Gateway dependencies..." -ForegroundColor Yellow
Set-Location api-gateway
npm install
Set-Location ..
Write-Host "✓ API Gateway dependencies installed" -ForegroundColor Green

# Install Python dependencies for ML services
foreach ($service in $services) {
    Write-Host "Installing ml-services\$service dependencies..." -ForegroundColor Yellow
    Set-Location "ml-services\$service"
    pip install -r requirements.txt
    Set-Location ..\..
    Write-Host "✓ ml-services\$service dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review and update .env files with your configuration"
Write-Host "2. Start PostgreSQL (if not using Docker)"
Write-Host "3. Run database migrations:"
Write-Host "   cd api-gateway; npm run db:migrate; npm run db:seed"
Write-Host ""
Write-Host "To start all services:"
Write-Host "  Option A (Docker): docker-compose up -d"
Write-Host "  Option B (Manual): Run each service in a separate terminal:"
Write-Host "    - Terminal 1: cd ml-services\complaint; python app.py"
Write-Host "    - Terminal 2: cd ml-services\app-crawler; python app_api.py"
Write-Host "    - Terminal 3: cd ml-services\identity-verifier; python app.py"
Write-Host "    - Terminal 4: cd api-gateway; npm start"
Write-Host ""
Write-Host "Health check URLs:"
Write-Host "  - API Gateway:       http://localhost:3000/health"
Write-Host "  - Complaint ML:      http://localhost:5000/health"
Write-Host "  - App Crawler:       http://localhost:5001/health"
Write-Host "  - Identity Verifier: http://localhost:5002/health"
Write-Host ""
