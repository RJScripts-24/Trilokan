const express = require('express');
const authRoute = require('./auth.routes');
const userRoute = require('./user.routes');
const identityRoute = require('./identity.routes');
const appRoute = require('./app.routes');
const grievanceRoute = require('./grievance.routes');
const mlRoute = require('./ml.routes');
const docsRoute = require('./docs.routes');
const config = require('../../config/config');

const router = express.Router();

// Define all the main route paths here
const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute, 
    // Maps to: POST /api/v1/auth/login, /register, etc.
  },
  {
    path: '/users',
    route: userRoute, 
    // Maps to: GET /api/v1/users, PATCH /api/v1/users/:id
  },
  {
    path: '/identity',
    route: identityRoute, 
    // Maps to: POST /api/v1/identity/verify (The Deepfake Check)
  },
  {
    path: '/apps',
    route: appRoute, 
    // Maps to: POST /api/v1/apps/verify-file (The App Authenticator)
  },
  {
    path: '/grievances',
    route: grievanceRoute, 
    // Maps to: POST /api/v1/grievances (The Complaint System)
  },
  {
    path: '/ml',
    route: mlRoute,
    // Maps to: Legacy ML service endpoints (compatibility layer)
    // DEPRECATED: Use new endpoints instead
  },
  {
    path: '/docs',
    route: docsRoute,
    // Maps to: GET /api/v1/docs (OpenAPI/Swagger Documentation)
  },
];

// Register each route
defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;