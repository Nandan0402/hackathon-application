const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

let aiClient = null;
let isInitialized = false;

const initGemini = () => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      aiClient = new GoogleGenerativeAI(apiKey);
      isInitialized = true;
      logger.info('Google Gemini AI client initialized successfully');
    } else {
      logger.warn('GEMINI_API_KEY not found in .env. Gemini AI services will be inactive until configured.');
    }
  } catch (error) {
    logger.error('Failed to initialize Google Gemini AI client', error);
  }

  return { aiClient, isInitialized };
};

initGemini();

module.exports = {
  getGeminiClient: () => aiClient,
  isGeminiConfigured: () => isInitialized,
  reinitGemini: initGemini
};
