const JobService = require('../services/jobService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class JobController {
  /**
   * POST /api/jobs
   * Create a new job posting. Only EMPLOYER or ADMIN.
   */
  static async createJob(req, res, next) {
    try {
      const job = await JobService.createJob(req.user, req.body);
      return ApiResponse.success(res, 'Job created successfully', job, 201);
    } catch (error) {
      logger.error(`Create job error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/jobs
   * List jobs with filters. Workers see active jobs; Employers & Admins see full or filtered.
   */
  static async listJobs(req, res, next) {
    try {
      const jobs = await JobService.listJobs(req.user, req.query);
      return ApiResponse.success(res, 'Jobs retrieved successfully', {
        count: jobs.length,
        jobs
      }, 200);
    } catch (error) {
      logger.error(`List jobs error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/jobs/:id
   * Get single job details.
   */
  static async getJobById(req, res, next) {
    try {
      const { id } = req.params;
      const job = await JobService.getJobById(id, req.user);
      return ApiResponse.success(res, 'Job details retrieved successfully', job, 200);
    } catch (error) {
      logger.error(`Get job by ID error: ${error.message}`);
      next(error);
    }
  }

  /**
   * PUT /api/jobs/:id
   * Update job posting. Only job owner employer or admin.
   */
  static async updateJob(req, res, next) {
    try {
      const { id } = req.params;
      const updatedJob = await JobService.updateJob(id, req.user, req.body);
      return ApiResponse.success(res, 'Job updated successfully', updatedJob, 200);
    } catch (error) {
      logger.error(`Update job error: ${error.message}`);
      next(error);
    }
  }

  /**
   * DELETE /api/jobs/:id
   * Delete job posting. Only job owner employer or admin.
   */
  static async deleteJob(req, res, next) {
    try {
      const { id } = req.params;
      const result = await JobService.deleteJob(id, req.user);
      return ApiResponse.success(res, 'Job deleted successfully', result, 200);
    } catch (error) {
      logger.error(`Delete job error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = JobController;
