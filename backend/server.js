require('dotenv').config();

const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const ApiResponse = require('./utils/apiResponse');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// Middleware Configuration
// ==========================================

// CORS Configuration
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((origin) => origin.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(requestLogger);

// ==========================================
// Route Handlers
// ==========================================

// Welcome / Root Route
app.get('/', (req, res) => {
  return ApiResponse.success(res, 'AI Hiring Platform API is running', {
    healthEndpoint: '/api/health',
    documentation: 'Refer to backend route specifications'
  });
});

// API v1 Routes
app.use('/api', apiRoutes);

// 404 Catch-All Route
app.use((req, res) => {
  return ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
});

// Global Error Handler
app.use(errorHandler);

// ==========================================
// Server Initialization
// ==========================================

const server = app.listen(PORT, () => {
  logger.info(`Server successfully started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check available at http://localhost:${PORT}/api/health`);
});

// Graceful Shutdown
const handleShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force close if ongoing requests hang
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = app;
