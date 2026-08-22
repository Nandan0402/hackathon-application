const AdminService = require('../services/adminService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class AdminController {
  /**
   * GET /api/admin/analytics
   * Returns high-level platform metrics: Total Workers, Total Employers, Total Jobs, Total Applications, Total Hires, Active Jobs
   */
  static async getAnalytics(req, res, next) {
    try {
      const analytics = await AdminService.getAnalytics();
      return ApiResponse.success(res, 'Admin analytics retrieved successfully', analytics, 200);
    } catch (error) {
      logger.error(`Admin analytics error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/admin/users
   * Lists all users with optional role filtering
   */
  static async getUsers(req, res, next) {
    try {
      const users = await AdminService.getUsers(req.query);
      return ApiResponse.success(res, 'Users retrieved successfully', {
        count: users.length,
        users
      }, 200);
    } catch (error) {
      logger.error(`Admin get users error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/admin/jobs
   * Lists all jobs across all employers
   */
  static async getJobs(req, res, next) {
    try {
      const jobs = await AdminService.getJobs(req.query);
      return ApiResponse.success(res, 'Jobs retrieved successfully', {
        count: jobs.length,
        jobs
      }, 200);
    } catch (error) {
      logger.error(`Admin get jobs error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/admin/applications
   * Lists all applications across all jobs
   */
  static async getApplications(req, res, next) {
    try {
      const applications = await AdminService.getApplications(req.query);
      return ApiResponse.success(res, 'Applications retrieved successfully', {
        count: applications.length,
        applications
      }, 200);
    } catch (error) {
      logger.error(`Admin get applications error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = AdminController;
