#!/bin/bash

# Trilokan Backend - Quick Start Script
# This script helps set up the development environment quickly

set -e

echo "=========================================="
echo "Trilokan Backend Quick Start"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
echo -e "${YELLOW}Checking environment configuration...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating root .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
else
    echo -e "${GREEN}✓ .env exists${NC}"
fi

# Check ML services .env files
for service in complaint app-crawler identity-verifier; do
    if [ ! -f "ml-services/$service/.env" ]; then
        echo -e "${YELLOW}Creating ml-services/$service/.env...${NC}"
        cp "ml-services/$service/.env.example" "ml-services/$service/.env"
        echo -e "${GREEN}✓ Created ml-services/$service/.env${NC}"
    else
        echo -e "${GREEN}✓ ml-services/$service/.env exists${NC}"
    fi
done

echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"

# Install API Gateway dependencies
echo -e "${YELLOW}Installing API Gateway dependencies...${NC}"
cd api-gateway
npm install
cd ..
echo -e "${GREEN}✓ API Gateway dependencies installed${NC}"

# Install Python dependencies for ML services
for service in complaint app-crawler identity-verifier; do
    echo -e "${YELLOW}Installing ml-services/$service dependencies...${NC}"
    cd "ml-services/$service"
    pip install -r requirements.txt
    cd ../..
    echo -e "${GREEN}✓ ml-services/$service dependencies installed${NC}"
done

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review and update .env files with your configuration"
echo "2. Start PostgreSQL (if not using Docker)"
echo "3. Run database migrations:"
echo "   cd api-gateway && npm run db:migrate && npm run db:seed"
echo ""
echo "To start all services:"
echo "  Option A (Docker): docker-compose up -d"
echo "  Option B (Manual): Run each service in a separate terminal:"
echo "    - Terminal 1: cd ml-services/complaint && python app.py"
echo "    - Terminal 2: cd ml-services/app-crawler && python app_api.py"
echo "    - Terminal 3: cd ml-services/identity-verifier && python app.py"
echo "    - Terminal 4: cd api-gateway && npm start"
echo ""
echo "Health check URLs:"
echo "  - API Gateway:      http://localhost:3000/health"
echo "  - Complaint ML:     http://localhost:5000/health"
echo "  - App Crawler:      http://localhost:5001/health"
echo "  - Identity Verifier: http://localhost:5002/health"
echo ""
