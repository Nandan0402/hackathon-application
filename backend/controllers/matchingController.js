const MatchingService = require('../services/matchingService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class MatchingController {
  /**
   * POST /api/matching
   * Match candidates against a job payload or specified jobId
   */
  static async matchJob(req, res, next) {
    try {
      const { jobId, jobData, workerIds, limit } = req.body || {};
      const targetJob = jobId || jobData;

      if (!targetJob) {
        return ApiResponse.error(res, 'Either jobId or jobData must be provided in request body', 400);
      }

      const result = await MatchingService.matchCandidatesForJob(targetJob, req.user, {
        workerIds,
        limit
      });

      return ApiResponse.success(res, 'Candidates matched and ranked successfully', result, 200);
    } catch (error) {
      logger.error(`Matching error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/jobs/:jobId/candidates
   * Get ranked candidates for a specific job posting
   */
  static async getJobCandidates(req, res, next) {
    try {
      const { jobId } = req.params;
      const { limit } = req.query;

      const result = await MatchingService.matchCandidatesForJob(jobId, req.user, {
        limit
      });

      return ApiResponse.success(res, 'Candidate matches retrieved and ranked successfully', result, 200);
    } catch (error) {
      logger.error(`Get job candidates error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = MatchingController;
