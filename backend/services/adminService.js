const { firestoreDb } = require('../config/firebase');
const logger = require('../utils/logger');

class AdminService {
  /**
   * 1. Get Platform Analytics
   * Metrics:
   * - Total Workers
   * - Total Employers
   * - Total Jobs
   * - Total Applications
   * - Total Hires
   * - Active Jobs
   */
  static async getAnalytics() {
    logger.info('Aggregating platform analytics for admin');

    // Query all core collections in parallel
    const [users, workers, jobs, applications, assessments] = await Promise.all([
      firestoreDb.getAllDocs('users'),
      firestoreDb.getAllDocs('workers'),
      firestoreDb.getAllDocs('jobs'),
      firestoreDb.getAllDocs('applications'),
      firestoreDb.getAllDocs('assessments')
    ]);

    // Total Workers: count from users collection with role WORKER plus any worker profiles
    const workerUserIds = new Set();
    users.filter((u) => (u.role || '').toUpperCase() === 'WORKER').forEach((u) => workerUserIds.add(u.uid || u.id));
    workers.forEach((w) => workerUserIds.add(w.userId || w.workerId || w.id));
    const totalWorkers = Math.max(workerUserIds.size, workers.length);

    // Total Employers: count from users collection with role EMPLOYER
    const employerUserIds = new Set();
    users.filter((u) => (u.role || '').toUpperCase() === 'EMPLOYER').forEach((u) => employerUserIds.add(u.uid || u.id));
    jobs.forEach((j) => { if (j.employerId) employerUserIds.add(j.employerId); });
    const totalEmployers = employerUserIds.size;

    // Total Jobs & Active Jobs
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => (j.status || 'active').toLowerCase() === 'active').length;

    // Total Applications & Total Hires
    const totalApplications = applications.length;
    const totalHires = applications.filter((a) => (a.status || '').toUpperCase() === 'HIRED').length +
      jobs.filter((j) => (j.status || '').toLowerCase() === 'filled' && !applications.some((a) => a.jobId === j.jobId && a.status === 'HIRED')).length;

    // Additional Analytical Metrics
    const assessedScores = workers.filter((w) => typeof w.skillScore === 'number' && w.skillScore > 0).map((w) => w.skillScore);
    const averageSkillScore = assessedScores.length > 0
      ? Math.round(assessedScores.reduce((a, b) => a + b, 0) / assessedScores.length)
      : 0;

    const matchScores = applications.filter((a) => typeof a.matchScore === 'number').map((a) => a.matchScore);
    const averageMatchScore = matchScores.length > 0
      ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
      : 0;

    return {
      totalWorkers,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      totalHires,
      insights: {
        totalAssessments: assessments.length,
        averageSkillScore,
        averageMatchScore,
        jobsByStatus: {
          active: activeJobs,
          filled: jobs.filter((j) => (j.status || '').toLowerCase() === 'filled').length,
          draft: jobs.filter((j) => (j.status || '').toLowerCase() === 'draft').length,
          closed: jobs.filter((j) => (j.status || '').toLowerCase() === 'closed').length
        },
        applicationsByStatus: {
          applied: applications.filter((a) => a.status === 'APPLIED').length,
          shortlisted: applications.filter((a) => a.status === 'SHORTLISTED').length,
          rejected: applications.filter((a) => a.status === 'REJECTED').length,
          hired: applications.filter((a) => a.status === 'HIRED').length
        }
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 2. Get All Users (Admin view)
   */
  static async getUsers(query = {}) {
    let users = await firestoreDb.getAllDocs('users');

    if (query.role) {
      const filterRole = query.role.toUpperCase();
      users = users.filter((u) => (u.role || '').toUpperCase() === filterRole);
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      users = users.filter(
        (u) =>
          (u.email || '').toLowerCase().includes(search) ||
          (u.name || '').toLowerCase().includes(search) ||
          (u.uid || '').toLowerCase().includes(search)
      );
    }

    return users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  /**
   * 3. Get All Jobs (Admin view across all employers & statuses)
   */
  static async getJobs(query = {}) {
    let jobs = await firestoreDb.getAllDocs('jobs');

    if (query.status) {
      const searchStatus = query.status.toLowerCase();
      jobs = jobs.filter((j) => (j.status || '').toLowerCase() === searchStatus);
    }
    if (query.occupation) {
      const searchOcc = query.occupation.toLowerCase();
      jobs = jobs.filter((j) => (j.occupation || '').toLowerCase().includes(searchOcc));
    }
    if (query.employerId) {
      jobs = jobs.filter((j) => j.employerId === query.employerId);
    }

    return jobs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  /**
   * 4. Get All Applications (Admin view across all jobs & candidates)
   */
  static async getApplications(query = {}) {
    let applications = await firestoreDb.getAllDocs('applications');

    if (query.status) {
      const searchStatus = query.status.toUpperCase();
      applications = applications.filter((a) => (a.status || '').toUpperCase() === searchStatus);
    }
    if (query.jobId) {
      applications = applications.filter((a) => a.jobId === query.jobId);
    }
    if (query.workerId) {
      applications = applications.filter((a) => a.workerId === query.workerId);
    }
    if (query.employerId) {
      applications = applications.filter((a) => a.employerId === query.employerId);
    }

    return applications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }
}

module.exports = AdminService;
