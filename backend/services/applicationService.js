const { firestoreDb } = require('../config/firebase');
const MatchingService = require('./matchingService');
const logger = require('../utils/logger');

const VALID_STATUSES = ['APPLIED', 'SHORTLISTED', 'REJECTED', 'HIRED'];

class ApplicationService {
  /**
   * Helper to normalize worker ID
   */
  static normalizeWorkerId(workerId) {
    if (!workerId) return null;
    return workerId.startsWith('worker_') ? workerId : `worker_${workerId}`;
  }

  /**
   * 1. Submit a new job application
   */
  static async createApplication(authUser, data) {
    const { jobId, workerId: customWorkerId, notes } = data;

    if (!jobId) {
      const error = new Error('Job ID is required to submit an application');
      error.statusCode = 400;
      throw error;
    }

    // 1. Fetch Job
    const job = await firestoreDb.getDoc('jobs', jobId);
    if (!job) {
      const error = new Error(`Job not found for ID: ${jobId}`);
      error.statusCode = 404;
      throw error;
    }

    if ((job.status || 'active').toLowerCase() !== 'active') {
      const error = new Error('Cannot apply to a job that is not active.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Identify Worker
    const userRole = (authUser.role || '').toUpperCase();
    const rawUserId = userRole === 'ADMIN' && customWorkerId ? customWorkerId : authUser.uid;
    const targetWorkerId = this.normalizeWorkerId(rawUserId);

    let worker = await firestoreDb.getDoc('workers', targetWorkerId);
    if (!worker) {
      worker = await firestoreDb.getDoc('workers', rawUserId);
    }
    if (!worker) {
      const allWorkers = await firestoreDb.getAllDocs('workers');
      worker = allWorkers.find((w) => w.userId === rawUserId || w.workerId === targetWorkerId || w.workerId === rawUserId);
    }

    if (!worker) {
      const error = new Error('Worker profile must be created before applying for jobs.');
      error.statusCode = 400;
      throw error;
    }

    const resolvedWorkerId = worker.workerId || targetWorkerId;

    // 3. Check for existing application
    const allApplications = await firestoreDb.getAllDocs('applications');
    const existing = allApplications.find(
      (a) => a.jobId === jobId && (a.workerId === resolvedWorkerId || a.workerId === targetWorkerId)
    );

    if (existing) {
      const error = new Error('You have already applied for this job.');
      error.statusCode = 409;
      error.applicationId = existing.applicationId;
      throw error;
    }

    // 4. Calculate Match Score automatically
    let calculatedMatchScore = 75;
    try {
      const latestAssessment = await firestoreDb.getDoc('assessments', `latest_${resolvedWorkerId}`);
      const matchCalc = MatchingService.calculateDeterministicMatch(job, worker, latestAssessment);
      calculatedMatchScore = matchCalc.matchScore;
    } catch (err) {
      logger.warn(`Could not compute live match score: ${err.message}`);
    }

    const now = new Date().toISOString();
    const applicationId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const application = {
      applicationId,
      jobId,
      workerId: resolvedWorkerId,
      employerId: job.employerId,
      matchScore: calculatedMatchScore,
      status: 'APPLIED',
      notes: notes || '',
      createdAt: now,
      updatedAt: now
    };

    logger.info(`Creating application ${applicationId} for worker ${resolvedWorkerId} on job ${jobId}`);
    await firestoreDb.setDoc('applications', applicationId, application);

    return {
      ...application,
      job: {
        title: job.title,
        occupation: job.occupation,
        location: job.location,
        salaryRange: job.salaryRange
      },
      worker: {
        name: worker.name,
        occupation: worker.occupation,
        experience: worker.experience
      }
    };
  }

  /**
   * 2. Get single application by ID
   */
  static async getApplicationById(applicationId, authUser) {
    if (!applicationId) {
      const error = new Error('Application ID is required');
      error.statusCode = 400;
      throw error;
    }

    const application = await firestoreDb.getDoc('applications', applicationId);
    if (!application) {
      const error = new Error(`Application not found for ID: ${applicationId}`);
      error.statusCode = 404;
      throw error;
    }

    // Access control
    const userRole = (authUser.role || '').toUpperCase();
    const isWorkerOwner = application.workerId === authUser.uid || application.workerId === `worker_${authUser.uid}`;
    const isEmployerOwner = application.employerId === authUser.uid;
    const isAdmin = userRole === 'ADMIN';

    if (!isWorkerOwner && !isEmployerOwner && !isAdmin) {
      const error = new Error('Access denied. You are not authorized to view this application.');
      error.statusCode = 403;
      throw error;
    }

    // Attach enriched job and worker info
    const job = await firestoreDb.getDoc('jobs', application.jobId);
    const worker = await firestoreDb.getDoc('workers', application.workerId);

    return {
      ...application,
      job: job || null,
      worker: worker || null
    };
  }

  /**
   * 3. List applications with filters (Worker / Employer / Job)
   */
  static async listApplications(authUser, query = {}) {
    const userRole = (authUser.role || '').toUpperCase();
    let applications = await firestoreDb.getAllDocs('applications');

    // Role-based visibility
    if (userRole === 'WORKER') {
      const workerId = `worker_${authUser.uid}`;
      applications = applications.filter((a) => a.workerId === workerId || a.workerId === authUser.uid);
    } else if (userRole === 'EMPLOYER') {
      if (query.myApplications === 'true' || !query.jobId) {
        applications = applications.filter((a) => a.employerId === authUser.uid);
      }
    }

    // Query filters
    if (query.jobId) {
      applications = applications.filter((a) => a.jobId === query.jobId);
    }
    if (query.workerId) {
      const targetWorker = this.normalizeWorkerId(query.workerId);
      applications = applications.filter((a) => a.workerId === targetWorker || a.workerId === query.workerId);
    }
    if (query.status) {
      applications = applications.filter((a) => a.status === query.status.toUpperCase());
    }

    return applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * 4. Update application status (APPLIED, SHORTLISTED, REJECTED, HIRED)
   */
  static async updateApplicationStatus(applicationId, authUser, updateData) {
    if (!applicationId) {
      const error = new Error('Application ID is required');
      error.statusCode = 400;
      throw error;
    }

    const application = await firestoreDb.getDoc('applications', applicationId);
    if (!application) {
      const error = new Error(`Application not found for ID: ${applicationId}`);
      error.statusCode = 404;
      throw error;
    }

    const userRole = (authUser.role || '').toUpperCase();
    const isEmployerOwner = application.employerId === authUser.uid;
    const isAdmin = userRole === 'ADMIN';

    if (!isEmployerOwner && !isAdmin) {
      const error = new Error('Access denied. Only the employer or admin can update application status.');
      error.statusCode = 403;
      throw error;
    }

    const newStatus = (updateData.status || '').toUpperCase();
    if (!VALID_STATUSES.includes(newStatus)) {
      const error = new Error(`Invalid status. Allowed statuses: ${VALID_STATUSES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // If changing to HIRED, trigger full hiring flow
    if (newStatus === 'HIRED') {
      return this.executeHiringFlow({
        applicationId,
        authUser,
        notes: updateData.notes,
        startDate: updateData.startDate,
        salary: updateData.salary
      });
    }

    const now = new Date().toISOString();
    const updated = {
      ...application,
      status: newStatus,
      notes: updateData.notes !== undefined ? updateData.notes : (application.notes || ''),
      updatedAt: now
    };

    logger.info(`Updated application ${applicationId} status to ${newStatus}`);
    await firestoreDb.setDoc('applications', applicationId, updated);

    return updated;
  }

  /**
   * 5. Complete Hiring Workflow Transaction:
   * Shortlist -> Interview -> Hire:
   *   Application = HIRED
   *   Worker = EMPLOYED
   *   Job = FILLED
   *   Create Work History Record
   */
  static async executeHiringFlow({ applicationId, jobId, workerId, authUser, notes, startDate, salary }) {
    let application = null;

    if (applicationId) {
      application = await firestoreDb.getDoc('applications', applicationId);
    } else if (jobId && workerId) {
      const allApps = await firestoreDb.getAllDocs('applications');
      const normWorker = this.normalizeWorkerId(workerId);
      application = allApps.find((a) => a.jobId === jobId && (a.workerId === normWorker || a.workerId === workerId));
    }

    if (!application && applicationId) {
      const error = new Error(`Application not found for ID: ${applicationId}`);
      error.statusCode = 404;
      throw error;
    }

    const targetJobId = application ? application.jobId : jobId;
    const targetWorkerId = application ? application.workerId : this.normalizeWorkerId(workerId);

    // 1. Fetch Job
    const job = await firestoreDb.getDoc('jobs', targetJobId);
    if (!job) {
      const error = new Error(`Job not found for ID: ${targetJobId}`);
      error.statusCode = 404;
      throw error;
    }

    // Authorization: Must be the employer who posted the job or Admin
    const userRole = (authUser.role || '').toUpperCase();
    const isEmployerOwner = job.employerId === authUser.uid;
    const isAdmin = userRole === 'ADMIN';

    if (!isEmployerOwner && !isAdmin) {
      const error = new Error('Access denied. Only the hiring employer or admin can execute hiring.');
      error.statusCode = 403;
      throw error;
    }

    // 2. Fetch Worker
    let worker = await firestoreDb.getDoc('workers', targetWorkerId);
    if (!worker) {
      worker = await firestoreDb.getDoc('workers', targetWorkerId.replace('worker_', ''));
    }
    if (!worker) {
      const allWorkers = await firestoreDb.getAllDocs('workers');
      worker = allWorkers.find((w) => w.userId === targetWorkerId || w.workerId === targetWorkerId || `worker_${w.userId}` === targetWorkerId);
    }

    if (!worker) {
      const error = new Error(`Worker not found for ID: ${targetWorkerId}`);
      error.statusCode = 404;
      throw error;
    }

    const resolvedWorkerDocKey = worker.workerId || targetWorkerId;
    const now = new Date().toISOString();
    const formattedStartDate = startDate || now.split('T')[0];

    // Step A: Application = HIRED
    let updatedApp = application;
    if (application) {
      updatedApp = {
        ...application,
        status: 'HIRED',
        notes: notes || application.notes || 'Candidate successfully hired',
        updatedAt: now
      };
      await firestoreDb.setDoc('applications', application.applicationId, updatedApp);
      logger.info(`[Hiring Flow] Application ${application.applicationId} set to HIRED`);
    }

    // Step B: Worker = EMPLOYED
    const updatedWorker = {
      ...worker,
      availability: 'Employed',
      employmentStatus: 'EMPLOYED',
      currentEmployerId: job.employerId,
      currentJobId: job.jobId,
      updatedAt: now
    };

    // Step C: Job = FILLED
    const updatedJob = {
      ...job,
      status: 'filled',
      hiredWorkerId: resolvedWorkerDocKey,
      filledAt: now,
      updatedAt: now
    };
    await firestoreDb.setDoc('jobs', job.jobId, updatedJob);
    logger.info(`[Hiring Flow] Job ${job.jobId} set to FILLED`);

    // Step D: Create Work History Record
    const historyId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const companyName = job.companyName || job.title || 'Hiring Employer';
    const newWorkHistoryEntry = {
      historyId,
      workHistoryId: historyId,
      workerId: resolvedWorkerDocKey,
      employerId: job.employerId,
      companyName,
      company: companyName,
      jobId: job.jobId,
      role: job.title,
      occupation: job.occupation,
      location: job.location,
      startDate: formattedStartDate,
      endDate: 'Present',
      skillsUsed: Array.isArray(job.requiredSkills) ? job.requiredSkills : [],
      employerRating: null,
      salary: salary || job.salaryRange,
      status: 'active_employment',
      createdAt: now
    };

    // Persist to 'workHistory' and 'work_history' collections
    await firestoreDb.setDoc('workHistory', historyId, newWorkHistoryEntry);
    await firestoreDb.setDoc('work_history', historyId, newWorkHistoryEntry);

    // Append to worker's internal workHistory array
    const existingWorkHistory = Array.isArray(worker.workHistory) ? worker.workHistory : [];
    updatedWorker.workHistory = [newWorkHistoryEntry, ...existingWorkHistory];

    await firestoreDb.setDoc('workers', resolvedWorkerDocKey, updatedWorker);
    logger.info(`[Hiring Flow] Worker ${resolvedWorkerDocKey} set to EMPLOYED with new Work History ${historyId}`);

    return {
      hiringComplete: true,
      applicationId: updatedApp ? updatedApp.applicationId : null,
      applicationStatus: 'HIRED',
      workerStatus: 'EMPLOYED',
      jobStatus: 'FILLED',
      workHistory: newWorkHistoryEntry,
      job: {
        jobId: updatedJob.jobId,
        title: updatedJob.title,
        status: updatedJob.status
      },
      worker: {
        workerId: updatedWorker.workerId,
        name: updatedWorker.name,
        employmentStatus: updatedWorker.employmentStatus,
        availability: updatedWorker.availability
      },
      hiredAt: now
    };
  }
}

module.exports = ApplicationService;
