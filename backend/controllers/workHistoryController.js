const WorkHistoryService = require('../services/workHistoryService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class WorkHistoryController {
  /**
   * POST /api/work-history
   * Create a new work history entry
   */
  static async createWorkHistory(req, res, next) {
    try {
      const record = await WorkHistoryService.createWorkHistory(req.user, req.body);
      return ApiResponse.success(res, 'Work history record created successfully', record, 201);
    } catch (error) {
      logger.error(`Create work history error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/work-history/:workerId
   * Get all work history records for a worker
   */
  static async getWorkHistory(req, res, next) {
    try {
      const { workerId } = req.params;
      const history = await WorkHistoryService.getWorkHistoryByWorkerId(workerId, req.user);
      return ApiResponse.success(res, 'Work history records retrieved successfully', {
        count: history.length,
        workHistory: history
      }, 200);
    } catch (error) {
      logger.error(`Get work history error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = WorkHistoryController;
