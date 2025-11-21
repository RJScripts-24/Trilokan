const axios = require('axios');
const httpStatus = require('http-status');
const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

/**
 * Axios instance configured for the ML Microservice
 */
const mlClient = axios.create({
  baseURL: config.ml.url, // e.g., http://localhost:5000 or https://ml-api.yourdomain.com
  timeout: 5000, // Fail fast if ML service is down
  headers: {
    'x-api-key': config.ml.apiKey, // Secure internal communication
  },
});

/**
 * Predict the category of a grievance based on its description
 * Used to auto-assign tickets to the right department (e.g., IT vs HR)
 * * @param {string} text - The description of the grievance
 * @returns {Promise<string>} - e.g., 'hardware', 'sanitation', 'harassment'
 */
const predictCategory = async (text) => {
  try {
    if (!config.ml.enabled) {
      return 'uncategorized'; // Fallback if ML is disabled
    }

    const response = await mlClient.post('/predict/category', { text });
    return response.data.category;
  } catch (error) {
    logger.error(`ML Service Error (Category): ${error.message}`);
    // Fail gracefully: don't crash the app, just return a default
    return 'uncategorized';
  }
};

/**
 * Analyze the sentiment of the text
 * Used to prioritize urgent/angry tickets
 * * @param {string} text 
 * @returns {Promise<Object>} - { score: 0.9, label: 'negative' }
 */
const analyzeSentiment = async (text) => {
  try {
    if (!config.ml.enabled) {
      return { score: 0, label: 'neutral' };
    }

    const response = await mlClient.post('/predict/sentiment', { text });
    return {
      score: response.data.score, // 0 to 1
      label: response.data.label, // 'positive', 'negative', 'neutral'
    };
  } catch (error) {
    logger.error(`ML Service Error (Sentiment): ${error.message}`);
    return { score: 0, label: 'neutral' };
  }
};

/**
 * Detect Toxicity / Spam
 * Used to filter out abusive language before saving to DB
 * * @param {string} text 
 * @returns {Promise<boolean>} - true if toxic
 */
const detectToxicity = async (text) => {
  try {
    if (!config.ml.enabled) return false;

    const response = await mlClient.post('/predict/toxicity', { text });
    return response.data.isToxic; // boolean
  } catch (error) {
    logger.error(`ML Service Error (Toxicity): ${error.message}`);
    return false; // Default to allowing content if ML fails
  }
};

/**
 * Find similar existing grievances
 * Used to detect duplicate issues (e.g., 50 people reporting the same broken elevator)
 * * @param {string} text 
 * @returns {Promise<Array>} - Array of similar grievance IDs
 */
const findSimilarGrievances = async (text) => {
  try {
    if (!config.ml.enabled) return [];

    const response = await mlClient.post('/search/similar', { text });
    return response.data.similarIds || [];
  } catch (error) {
    logger.error(`ML Service Error (Similarity): ${error.message}`);
    return [];
  }
};

module.exports = {
  predictCategory,
  analyzeSentiment,
  detectToxicity,
  findSimilarGrievances,
};