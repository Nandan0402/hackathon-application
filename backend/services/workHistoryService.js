const { firestoreDb } = require('../config/firebase');
const logger = require('../utils/logger');

class WorkHistoryService {
  /**
   * Helper to normalize worker ID
   */
  static normalizeWorkerId(workerId) {
    if (!workerId) return null;
    return workerId.startsWith('worker_') ? workerId : `worker_${workerId}`;
  }

  /**
   * 1. Create a work history record
   * Schema: historyId, workerId, employerId, companyName, jobId, role, startDate, endDate, skillsUsed, employerRating, createdAt
   */
  static async createWorkHistory(authUser, data) {
    const userRole = (authUser.role || '').toUpperCase();
    const rawWorkerId = data.workerId || authUser.uid;
    const workerId = this.normalizeWorkerId(rawWorkerId);

    // Validation
    if (!data.companyName && !data.company) {
      const error = new Error('Company name is required');
      error.statusCode = 400;
      throw error;
    }

    if (!data.role) {
      const error = new Error('Job role/title is required');
      error.statusCode = 400;
      throw error;
    }

    if (!data.startDate) {
      const error = new Error('Start date is required');
      error.statusCode = 400;
      throw error;
    }

    // Access control: Worker can create their own history; Employer or Admin can create for worker
    const isOwner = workerId === this.normalizeWorkerId(authUser.uid);
    const isEmployer = userRole === 'EMPLOYER';
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isEmployer && !isAdmin) {
      const error = new Error('Access denied. You cannot create work history for another user.');
      error.statusCode = 403;
      throw error;
    }

    const now = new Date().toISOString();
    const historyId = data.historyId || `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const companyName = (data.companyName || data.company).trim();

    const record = {
      historyId,
      workerId,
      employerId: data.employerId || (isEmployer ? authUser.uid : null),
      companyName,
      jobId: data.jobId || null,
      role: data.role.trim(),
      startDate: data.startDate,
      endDate: data.endDate || 'Present',
      skillsUsed: Array.isArray(data.skillsUsed)
        ? data.skillsUsed
        : (Array.isArray(data.skills) ? data.skills : (data.skillsUsed ? [data.skillsUsed] : [])),
      employerRating: typeof data.employerRating === 'number' ? data.employerRating : (data.employerRating ? parseFloat(data.employerRating) : null),
      createdAt: now
    };

    logger.info(`Creating work history record ${historyId} for worker ${workerId}`);

    // Persist to both 'workHistory' and 'work_history' aliases in Firestore
    await firestoreDb.setDoc('workHistory', historyId, record);
    await firestoreDb.setDoc('work_history', historyId, record);

    // Sync into worker profile in Firestore
    try {
      let worker = await firestoreDb.getDoc('workers', workerId);
      if (!worker) {
        worker = await firestoreDb.getDoc('workers', workerId.replace('worker_', ''));
      }
      if (worker) {
        const existingHistory = Array.isArray(worker.workHistory) ? worker.workHistory : [];
        const mergedHistory = [record, ...existingHistory.filter((h) => (h.historyId || h.workHistoryId) !== historyId)];
        await firestoreDb.setDoc('workers', worker.workerId || workerId, {
          ...worker,
          workHistory: mergedHistory,
          updatedAt: now
        });
      }
    } catch (err) {
      logger.warn(`Could not sync work history into worker profile: ${err.message}`);
    }

    return record;
  }

  /**
   * 2. Get all work history records for a worker
   * Access: Worker (own history), Employer (candidate review), Admin (all)
   */
  static async getWorkHistoryByWorkerId(workerIdParam, authUser) {
    if (!workerIdParam) {
      const error = new Error('Worker ID is required');
      error.statusCode = 400;
      throw error;
    }

    const workerId = this.normalizeWorkerId(workerIdParam);
    const rawId = workerIdParam.replace('worker_', '');

    // Access control check
    const userRole = (authUser.role || '').toUpperCase();
    const isOwner = workerId === this.normalizeWorkerId(authUser.uid) || workerIdParam === authUser.uid;
    const isEmployer = userRole === 'EMPLOYER';
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isEmployer && !isAdmin) {
      const error = new Error('Access denied. You can only view your own work history.');
      error.statusCode = 403;
      throw error;
    }

    // 1. Fetch from workHistory collection
    const allHistory = await firestoreDb.getAllDocs('workHistory');
    let matched = allHistory.filter((h) =>
      h.workerId === workerId || h.workerId === rawId || h.workerId === workerIdParam
    );

    // 2. Fallback check on worker profile
    if (matched.length === 0) {
      const worker = await firestoreDb.getDoc('workers', workerId) || await firestoreDb.getDoc('workers', rawId);
      if (worker && Array.isArray(worker.workHistory)) {
        matched = worker.workHistory;
      }
    }

    // Sort descending by startDate / createdAt
    return matched.sort((a, b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt));
  }
}

module.exports = WorkHistoryService;
