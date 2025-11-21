const express = require('express');
const app = express();

// Middleware (body parser, CORS, etc.)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Example: Mount your API routes
// You can adjust this to your actual route structure
try {
  app.use('/api', require('./src/routes'));
} catch (e) {
  // If routes/index.js does not exist, skip for now
}

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API Gateway is running.' });
});

module.exports = app;
