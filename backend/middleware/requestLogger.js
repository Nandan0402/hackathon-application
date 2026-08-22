const logger = require('../utils/logger');

/**
 * Middleware to log incoming HTTP requests and response latency.
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms [IP: ${ip || req.connection.remoteAddress}]`);
  });

  next();
};

module.exports = requestLogger;
