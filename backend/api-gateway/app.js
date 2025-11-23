const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const { jwtStrategy } = require('./src/config/passport');
const { correlationMiddleware, requestLoggerMiddleware } = require('./src/middleware/correlation.middleware');
const { metricsMiddleware, metricsHandler, healthCheckHandler } = require('./src/utils/metrics');
const logger = require('./src/config/logger');
const app = express();

// Initialize Passport JWT Strategy
passport.use('jwt', jwtStrategy);

// Correlation ID middleware (must be first to capture all requests)
app.use(correlationMiddleware);

// Metrics middleware (tracks all requests)
app.use(metricsMiddleware);

// Request logging middleware (after correlation, before routes)
app.use(requestLoggerMiddleware);

// Security & CORS middleware
app.use(helmet());
app.use(cors());

// Middleware (body parser, CORS, etc.)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics endpoint for Prometheus scraping
app.get('/metrics', metricsHandler);

// Enhanced health check endpoint
app.get('/health', healthCheckHandler);

// Mount API routes
try {
  const apiRoutes = require('./src/routes');
  app.use('/api', apiRoutes);
  logger.info('API routes mounted successfully');
} catch (e) {
  logger.error('Failed to mount API routes:', e);
  console.error('Route mounting error:', e);
}

// Health check route (legacy, kept for backward compatibility)
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API Gateway is running.', requestId: req.requestId });
});

module.exports = app;
