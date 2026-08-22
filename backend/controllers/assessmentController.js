const AssessmentService = require('../services/assessmentService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class AssessmentController {
  /**
   * POST /api/assessment/questions
   * Generate trade practical questions for the worker
   */
  static async getQuestions(req, res, next) {
    try {
      const { occupation, experienceYears, count } = req.body || {};
      const data = await AssessmentService.generateQuestions({
        occupation,
        experienceYears,
        count
      });

      return ApiResponse.success(res, 'Assessment questions generated successfully', data, 200);
    } catch (error) {
      logger.error(`Get assessment questions error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/assessment/submit
   * Evaluates worker answers using Gemini, saves score & skills, returns structured evaluation
   */
  static async submitAssessment(req, res, next) {
    try {
      const { workerId, occupation, answers } = req.body;
      const evaluationResult = await AssessmentService.submitAssessment(req.user, {
        workerId,
        occupation,
        answers
      });

      return ApiResponse.success(
        res,
        'Assessment evaluated and saved successfully',
        evaluationResult,
        200
      );
    } catch (error) {
      logger.error(`Submit assessment error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/assessment/:workerId
   * Retrieve the latest assessment result for a worker
   */
  static async getAssessment(req, res, next) {
    try {
      const { workerId } = req.params;
      const assessment = await AssessmentService.getAssessmentByWorkerId(workerId, req.user);

      return ApiResponse.success(res, 'Assessment result retrieved successfully', assessment, 200);
    } catch (error) {
      logger.error(`Get assessment error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = AssessmentController;
