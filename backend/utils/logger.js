/**
 * Simple structured console logger utility with timestamp and level tags.
 */
const logger = {
  info: (message, meta = {}) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, Object.keys(meta).length ? meta : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, Object.keys(meta).length ? meta : '');
  },
  error: (message, error = {}) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error);
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, Object.keys(meta).length ? meta : '');
    }
  }
};

module.exports = logger;
