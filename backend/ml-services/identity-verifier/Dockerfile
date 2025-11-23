# Dockerfile for Identity Verifier Service
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (including dlib dependencies)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    curl \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p temp_uploads models logs demo_output

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=5002
ENV X_API_KEY=dev-api-key-identity-verifier

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5002/health || exit 1

# Run the application
CMD ["python", "app.py"]
