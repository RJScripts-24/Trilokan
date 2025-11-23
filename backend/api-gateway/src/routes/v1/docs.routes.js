const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const router = express.Router();

// Load OpenAPI specification
const swaggerDocument = YAML.load(path.join(__dirname, '../../../openapi.yaml'));

// Swagger UI options
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Trilokan API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

/**
 * @route   GET /v1/docs
 * @desc    Swagger UI for API documentation
 * @access  Public
 */
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

/**
 * @route   GET /v1/docs/json
 * @desc    Get OpenAPI specification in JSON format
 * @access  Public
 */
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

module.exports = router;
