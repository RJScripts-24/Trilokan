#!/bin/bash

# Install Python dependencies for all ML services
echo "Installing Complaint ML dependencies..."
cd ml-services/complaint && pip install -r requirements.txt &
COMPLAINT_PID=$!

echo "Installing App Crawler dependencies..."
cd ../app-crawler && pip install -r requirements.txt &
CRAWLER_PID=$!

echo "Installing Identity Verifier dependencies..."
cd ../identity-verifier && pip install -r requirements.txt &
IDENTITY_PID=$!

# Wait for all installations
wait $COMPLAINT_PID $CRAWLER_PID $IDENTITY_PID

# Install Node.js dependencies for API Gateway
echo "Installing API Gateway dependencies..."
cd ../../api-gateway && npm install

# Start all services
echo "Starting all services..."
cd ..

# Start ML services in background
cd ml-services/complaint && python app.py &
cd ../app-crawler && python app_api.py &
cd ../identity-verifier && python app.py &

# Start API Gateway (foreground)
cd ../../api-gateway && npm start
