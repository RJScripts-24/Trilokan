const express = require('express');
const v1Routes = require('./v1'); // Imports the router from routes/v1/index.js

const router = express.Router();

/**
 * -----------------------------------------
 * API Versioning
 * -----------------------------------------
 * Mounts the v1 routes under '/v1'.
 * Example: localhost:3000/v1/users
 */
router.use('/v1', v1Routes);

/**
 * -----------------------------------------
 * Future Versions
 * -----------------------------------------
 * When you are ready for version 2, you can import it here:
 * const v2Routes = require('./v2');
 * router.use('/v2', v2Routes);
 */

/**
 * @route   GET /
 * @desc    Simple root message to verify the API is reachable
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'API Service is running',
    version: '1.0.0',
    docs: '/v1/docs' // Optional: Link to your Swagger/OpenAPI docs
  });
});

module.exports = router;