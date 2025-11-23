// This script checks if the ML service is reachable from the backend.
const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

(async () => {
  try {
    const res = await axios.get(ML_URL + '/');
    console.log('ML service is reachable:', res.status, res.data);
  } catch (err) {
    console.error('ML service is NOT reachable:', err.message);
  }
})();
