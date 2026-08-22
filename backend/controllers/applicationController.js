const ApplicationService = require('../services/applicationService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class ApplicationController {
  /**
   * POST /api/applications
   * Submit a new job application
   */
  static async createApplication(req, res, next) {
    try {
      const application = await ApplicationService.createApplication(req.user, req.body);
      return ApiResponse.success(res, 'Job application submitted successfully', application, 201);
    } catch (error) {
      logger.error(`Create application error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/applications
   * List applications with role filters
   */
  static async listApplications(req, res, next) {
    try {
      const applications = await ApplicationService.listApplications(req.user, req.query);
      return ApiResponse.success(res, 'Applications retrieved successfully', {
        count: applications.length,
        applications
      }, 200);
    } catch (error) {
      logger.error(`List applications error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/applications/:id
   * Get single application details
   */
  static async getApplicationById(req, res, next) {
    try {
      const { id } = req.params;
      const application = await ApplicationService.getApplicationById(id, req.user);
      return ApiResponse.success(res, 'Application details retrieved successfully', application, 200);
    } catch (error) {
      logger.error(`Get application error: ${error.message}`);
      next(error);
    }
  }

  /**
   * PUT /api/applications/:id
   * Update application status (APPLIED, SHORTLISTED, REJECTED, HIRED)
   */
  static async updateApplication(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ApplicationService.updateApplicationStatus(id, req.user, req.body);
      return ApiResponse.success(res, 'Application updated successfully', result, 200);
    } catch (error) {
      logger.error(`Update application error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/hire
   * Execute full hiring flow:
   * Application = HIRED
   * Worker = EMPLOYED
   * Job = FILLED
   * Create Work History
   */
  static async hireCandidate(req, res, next) {
    try {
      const { applicationId, jobId, workerId, notes, startDate, salary } = req.body || {};

      if (!applicationId && (!jobId || !workerId)) {
        return ApiResponse.error(res, 'Either applicationId or (jobId and workerId) must be provided', 400);
      }

      const result = await ApplicationService.executeHiringFlow({
        applicationId,
        jobId,
        workerId,
        authUser: req.user,
        notes,
        startDate,
        salary
      });

      return ApiResponse.success(res, 'Candidate successfully hired and employment finalized', result, 200);
    } catch (error) {
      logger.error(`Hiring execution error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = ApplicationController;
