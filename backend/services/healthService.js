const os = require('os');
const { isFirebaseConfigured } = require('../config/firebase');
const { isGeminiConfigured } = require('../config/gemini');

class HealthService {
  /**
   * Retrieves overall system health and integration status
   */
  static getHealthStatus() {
    const uptimeSeconds = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy',
      server: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(uptimeSeconds),
        uptimeFormatted: this.formatUptime(uptimeSeconds),
        platform: process.platform,
        hostname: os.hostname(),
        memoryUsage: {
          rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
          heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2)
        }
      },
      services: {
        firebase: {
          configured: isFirebaseConfigured(),
          mode: require('../config/firebase').getAuthMode(),
          status: isFirebaseConfigured() ? 'connected' : 'pending_configuration'
        },
        gemini: {
          configured: isGeminiConfigured(),
          status: isGeminiConfigured() ? 'ready' : 'pending_configuration'
        }
      }
    };
  }

  static formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
  }
}

module.exports = HealthService;
