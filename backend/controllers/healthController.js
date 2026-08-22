const HealthService = require('../services/healthService');
const ApiResponse = require('../utils/apiResponse');

class HealthController {
  /**
   * GET /api/health
   */
  static getHealth(req, res, next) {
    try {
      const healthData = HealthService.getHealthStatus();
      return ApiResponse.success(res, 'Backend service is healthy and operating normally', healthData, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = HealthController;
