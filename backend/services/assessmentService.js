const GeminiService = require('./geminiService');
const WorkerService = require('./workerService');
const { firestoreDb } = require('../config/firebase');
const logger = require('../utils/logger');

class AssessmentService {
  /**
   * 1. Generate practical trade assessment questions
   */
  static async generateQuestions({ occupation = 'Electrician', experienceYears = 3, count = 5 }) {
    const targetOccupation = occupation || 'Electrician';
    const questions = await GeminiService.generateQuestions(targetOccupation, experienceYears, count);

    return {
      occupation: targetOccupation,
      totalQuestions: questions.length,
      questions
    };
  }

  /**
   * 2. Submit answers, evaluate using Gemini, persist to Firestore, update worker profile
   */
  static async submitAssessment(authUser, { workerId, occupation = 'Electrician', answers = [] }) {
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      const error = new Error('Answers array is required and cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    const targetUserId = authUser.uid;
    const targetWorkerId = workerId || `worker_${targetUserId}`;
    const targetOccupation = occupation || 'Electrician';

    logger.info(`Evaluating assessment for workerId: ${targetWorkerId} in occupation: ${targetOccupation}`);

    // Step A: Evaluate via Gemini AI
    const evaluation = await GeminiService.evaluateAssessment({
      occupation: targetOccupation,
      answers
    });

    const now = new Date().toISOString();
    const assessmentRecord = {
      assessmentId: `assessment_${targetWorkerId}_${Date.now()}`,
      workerId: targetWorkerId,
      userId: targetUserId,
      occupation: targetOccupation,
      answers,
      score: evaluation.score,
      level: evaluation.level,
      skills: evaluation.skills,
      strengths: evaluation.strengths,
      areasToImprove: evaluation.areasToImprove,
      summary: evaluation.summary,
      createdAt: now
    };

    // Step B: Save assessment history in Firestore collection 'assessments'
    try {
      await firestoreDb.setDoc('assessments', assessmentRecord.assessmentId, assessmentRecord);
      // Also keep a fast pointer to latest assessment
      await firestoreDb.setDoc('assessments', `latest_${targetWorkerId}`, assessmentRecord);
      logger.info(`Saved assessment result to Firestore: ${assessmentRecord.assessmentId}`);
    } catch (err) {
      logger.error(`Failed to save assessment to Firestore: ${err.message}`);
    }

    // Step C: Update worker profile with the new score and skills
    try {
      const existingWorker = await firestoreDb.getDoc('workers', targetWorkerId);
      if (existingWorker) {
        // Merge verified skills
        const existingSkills = Array.isArray(existingWorker.skills) ? existingWorker.skills : [];
        const mergedSkills = Array.from(new Set([...existingSkills, ...evaluation.skills]));

        await firestoreDb.setDoc('workers', targetWorkerId, {
          ...existingWorker,
          skillScore: evaluation.score,
          skillLevel: evaluation.level,
          skills: mergedSkills,
          updatedAt: now
        });
        logger.info(`Updated worker ${targetWorkerId} profile with assessment results`);
      }
    } catch (err) {
      logger.warn(`Could not update worker profile during assessment: ${err.message}`);
    }

    // Return the required contract
    return {
      score: evaluation.score,
      level: evaluation.level,
      skills: evaluation.skills,
      strengths: evaluation.strengths,
      areasToImprove: evaluation.areasToImprove,
      summary: evaluation.summary
    };
  }

  /**
   * 3. Get latest assessment by workerId
   */
  static async getAssessmentByWorkerId(workerIdParam, authUser) {
    if (!workerIdParam) {
      const error = new Error('Worker ID is required');
      error.statusCode = 400;
      throw error;
    }

    const workerId = workerIdParam.startsWith('worker_') ? workerIdParam : `worker_${workerIdParam}`;

    // Access control check
    const isOwner = workerId === `worker_${authUser.uid}` || workerId === authUser.uid;
    const isAdmin = (authUser.role || '').toUpperCase() === 'ADMIN';
    const isEmployer = (authUser.role || '').toUpperCase() === 'EMPLOYER';

    if (!isOwner && !isAdmin && !isEmployer) {
      const error = new Error('Access denied. You can only view your own assessment.');
      error.statusCode = 403;
      throw error;
    }

    // Fetch latest assessment
    let assessment = await firestoreDb.getDoc('assessments', `latest_${workerId}`);

    if (!assessment) {
      // Fallback: search assessments collection
      const allAssessments = await firestoreDb.getAllDocs('assessments');
      const workerAssessments = allAssessments.filter((a) => a.workerId === workerId);
      if (workerAssessments.length > 0) {
        assessment = workerAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      }
    }

    if (!assessment) {
      const error = new Error(`No assessment records found for worker: ${workerIdParam}`);
      error.statusCode = 404;
      throw error;
    }

    return {
      score: assessment.score,
      level: assessment.level,
      skills: assessment.skills || [],
      strengths: assessment.strengths || [],
      areasToImprove: assessment.areasToImprove || [],
      summary: assessment.summary || '',
      evaluatedAt: assessment.createdAt
    };
  }
}

module.exports = AssessmentService;
