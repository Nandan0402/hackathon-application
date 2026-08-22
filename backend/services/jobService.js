const { firestoreDb } = require('../config/firebase');
const logger = require('../utils/logger');

class JobService {
  /**
   * Create a new Job posting
   * Rule: Only EMPLOYER or ADMIN can create jobs.
   */
  static async createJob(authUser, data) {
    const userRole = (authUser.role || '').toUpperCase();
    if (userRole !== 'EMPLOYER' && userRole !== 'ADMIN') {
      const error = new Error('Access denied. Only employers can create jobs.');
      error.statusCode = 403;
      throw error;
    }

    // Input Validation
    if (!data.title || data.title.trim() === '') {
      const error = new Error('Job title is required');
      error.statusCode = 400;
      throw error;
    }

    if (!data.occupation || data.occupation.trim() === '') {
      const error = new Error('Occupation is required');
      error.statusCode = 400;
      throw error;
    }

    if (!data.location || data.location.trim() === '') {
      const error = new Error('Location is required');
      error.statusCode = 400;
      throw error;
    }

    if (!data.description || data.description.trim() === '') {
      const error = new Error('Job description is required');
      error.statusCode = 400;
      throw error;
    }

    const now = new Date().toISOString();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const employerId = userRole === 'ADMIN' && data.employerId ? data.employerId : authUser.uid;

    const job = {
      jobId,
      employerId,
      title: data.title.trim(),
      occupation: data.occupation.trim(),
      location: data.location.trim(),
      minimumExperience: typeof data.minimumExperience === 'number' ? data.minimumExperience : (parseInt(data.minimumExperience, 10) || 0),
      requiredSkills: Array.isArray(data.requiredSkills)
        ? data.requiredSkills
        : (data.requiredSkills ? [data.requiredSkills] : []),
      description: data.description.trim(),
      salaryRange: data.salaryRange || 'Competitive',
      status: data.status || 'active', // 'active' | 'closed' | 'draft'
      createdAt: now,
      updatedAt: now
    };

    logger.info(`Creating job posting ${jobId} by employer ${employerId}`);
    await firestoreDb.setDoc('jobs', jobId, job);

    return job;
  }

  /**
   * List jobs with role-based filtering and search criteria
   * Rule: Workers can only view 'active' jobs.
   */
  static async listJobs(authUser, query = {}) {
    const userRole = (authUser.role || '').toUpperCase();
    const allJobs = await firestoreDb.getAllDocs('jobs');
    let results = allJobs;

    // Rule: Workers can ONLY view active jobs
    if (userRole === 'WORKER') {
      results = results.filter((j) => (j.status || 'active').toLowerCase() === 'active');
    } else if (query.status) {
      results = results.filter((j) => (j.status || '').toLowerCase() === query.status.toLowerCase());
    }

    // Employer filtering for own jobs
    if (query.myJobs === 'true' && userRole === 'EMPLOYER') {
      results = results.filter((j) => j.employerId === authUser.uid);
    } else if (query.employerId) {
      results = results.filter((j) => j.employerId === query.employerId);
    }

    // Filter by occupation
    if (query.occupation) {
      const search = query.occupation.toLowerCase();
      results = results.filter((j) => (j.occupation || '').toLowerCase().includes(search));
    }

    // Filter by location
    if (query.location) {
      const search = query.location.toLowerCase();
      results = results.filter((j) => (j.location || '').toLowerCase().includes(search));
    }

    // Filter by skill
    if (query.skill) {
      const skillSearch = query.skill.toLowerCase();
      results = results.filter((j) =>
        Array.isArray(j.requiredSkills) && j.requiredSkills.some((s) => s.toLowerCase().includes(skillSearch))
      );
    }

    return results;
  }

  /**
   * Get single job by ID
   * Rule: Workers can only view active jobs.
   */
  static async getJobById(jobId, authUser) {
    if (!jobId) {
      const error = new Error('Job ID is required');
      error.statusCode = 400;
      throw error;
    }

    const job = await firestoreDb.getDoc('jobs', jobId);
    if (!job) {
      const error = new Error(`Job not found for ID: ${jobId}`);
      error.statusCode = 404;
      throw error;
    }

    const userRole = (authUser.role || '').toUpperCase();
    const isOwner = job.employerId === authUser.uid;
    const isAdmin = userRole === 'ADMIN';

    // Workers or other users cannot view non-active jobs unless they own the posting or are admin
    if (job.status !== 'active' && !isOwner && !isAdmin) {
      const error = new Error('This job posting is no longer active.');
      error.statusCode = 403;
      throw error;
    }

    return job;
  }

  /**
   * Update Job posting
   * Rule: Employers can modify ONLY their own jobs. Admin can manage all jobs.
   */
  static async updateJob(jobId, authUser, updateData) {
    if (!jobId) {
      const error = new Error('Job ID is required');
      error.statusCode = 400;
      throw error;
    }

    const existing = await firestoreDb.getDoc('jobs', jobId);
    if (!existing) {
      const error = new Error(`Job not found for ID: ${jobId}`);
      error.statusCode = 404;
      throw error;
    }

    const userRole = (authUser.role || '').toUpperCase();
    const isOwner = existing.employerId === authUser.uid;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const error = new Error('Access denied. Employers can modify only their own jobs.');
      error.statusCode = 403;
      throw error;
    }

    const now = new Date().toISOString();

    const updatedJob = {
      ...existing,
      title: updateData.title !== undefined ? updateData.title.trim() : existing.title,
      occupation: updateData.occupation !== undefined ? updateData.occupation.trim() : existing.occupation,
      location: updateData.location !== undefined ? updateData.location.trim() : existing.location,
      minimumExperience: updateData.minimumExperience !== undefined
        ? (typeof updateData.minimumExperience === 'number' ? updateData.minimumExperience : parseInt(updateData.minimumExperience, 10) || 0)
        : existing.minimumExperience,
      requiredSkills: updateData.requiredSkills !== undefined
        ? (Array.isArray(updateData.requiredSkills) ? updateData.requiredSkills : [updateData.requiredSkills])
        : existing.requiredSkills,
      description: updateData.description !== undefined ? updateData.description.trim() : existing.description,
      salaryRange: updateData.salaryRange !== undefined ? updateData.salaryRange : existing.salaryRange,
      status: updateData.status !== undefined ? updateData.status : existing.status,
      updatedAt: now
    };

    // Keep immutable fields
    updatedJob.jobId = existing.jobId;
    updatedJob.employerId = existing.employerId;
    updatedJob.createdAt = existing.createdAt;

    logger.info(`Updating job posting ${jobId}`);
    await firestoreDb.setDoc('jobs', jobId, updatedJob);

    return updatedJob;
  }

  /**
   * Delete Job posting
   * Rule: Employers can delete ONLY their own jobs. Admin can delete any job.
   */
  static async deleteJob(jobId, authUser) {
    if (!jobId) {
      const error = new Error('Job ID is required');
      error.statusCode = 400;
      throw error;
    }

    const existing = await firestoreDb.getDoc('jobs', jobId);
    if (!existing) {
      const error = new Error(`Job not found for ID: ${jobId}`);
      error.statusCode = 404;
      throw error;
    }

    const userRole = (authUser.role || '').toUpperCase();
    const isOwner = existing.employerId === authUser.uid;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const error = new Error('Access denied. Employers can delete only their own jobs.');
      error.statusCode = 403;
      throw error;
    }

    logger.info(`Deleting job posting ${jobId}`);
    await firestoreDb.deleteDoc('jobs', jobId);

    return { jobId, message: 'Job posting deleted successfully' };
  }
}

module.exports = JobService;
