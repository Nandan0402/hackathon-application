const WorkerService = require('../services/workerService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class WorkerController {
  /**
   * POST /api/workers
   * Create a new worker profile. Requires authentication.
   */
  static async createWorker(req, res, next) {
    try {
      const profile = await WorkerService.createWorkerProfile(req.user, req.body);
      return ApiResponse.success(res, 'Worker profile created successfully', profile, 201);
    } catch (error) {
      logger.error(`Create worker error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/workers/:id
   * Get worker profile by workerId or userId.
   * Access: Worker (own profile), Admin (all), Employer (all).
   */
  static async getWorkerById(req, res, next) {
    try {
      const { id } = req.params;
      const profile = await WorkerService.getWorkerById(id, req.user);
      return ApiResponse.success(res, 'Worker profile retrieved successfully', profile, 200);
    } catch (error) {
      logger.error(`Get worker by ID error: ${error.message}`);
      next(error);
    }
  }

  /**
   * PUT /api/workers/:id
   * Update worker profile by workerId or userId.
   * Access: Worker (own profile only), Admin (all profiles).
   */
  static async updateWorker(req, res, next) {
    try {
      const { id } = req.params;
      const updatedProfile = await WorkerService.updateWorkerProfile(id, req.user, req.body);
      return ApiResponse.success(res, 'Worker profile updated successfully', updatedProfile, 200);
    } catch (error) {
      logger.error(`Update worker error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/workers
   * List / Search workers.
   */
  static async listWorkers(req, res, next) {
    try {
      const workers = await WorkerService.listWorkers(req.user, req.query);
      return ApiResponse.success(res, 'Workers retrieved successfully', {
        count: workers.length,
        workers
      }, 200);
    } catch (error) {
      logger.error(`List workers error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/workers/:id/skill-passport
   * Combine worker profile, AI assessment, skills, and work history into one structured response
   */
  static async getSkillPassport(req, res, next) {
    try {
      const { id } = req.params;
      const passport = await WorkerService.getSkillPassport(id, req.user);
      return ApiResponse.success(res, 'Skill passport retrieved successfully', passport, 200);
    } catch (error) {
      logger.error(`Get skill passport error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = WorkerController;
