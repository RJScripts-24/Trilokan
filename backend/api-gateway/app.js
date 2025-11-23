const express = require('express');
const { correlationMiddleware, requestLoggerMiddleware } = require('./src/middleware/correlation.middleware');
const { metricsMiddleware, metricsHandler, healthCheckHandler } = require('./src/utils/metrics');
const app = express();

// Correlation ID middleware (must be first to capture all requests)
app.use(correlationMiddleware);

// Metrics middleware (tracks all requests)
app.use(metricsMiddleware);

// Request logging middleware (after correlation, before routes)
app.use(requestLoggerMiddleware);

// Middleware (body parser, CORS, etc.)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics endpoint for Prometheus scraping
app.get('/metrics', metricsHandler);

// Enhanced health check endpoint
app.get('/health', healthCheckHandler);

// Example: Mount your API routes
// You can adjust this to your actual route structure
try {
  app.use('/api', require('./src/routes'));
} catch (e) {
  // If routes/index.js does not exist, skip for now
}

// Health check route (legacy, kept for backward compatibility)
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API Gateway is running.', requestId: req.requestId });
});

module.exports = app;
