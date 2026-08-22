const { firestoreDb } = require('../config/firebase');
const logger = require('../utils/logger');

class WorkerService {
  /**
   * Helper to normalize worker document ID
   */
  static getDocId(userIdOrWorkerId) {
    if (!userIdOrWorkerId) return null;
    return userIdOrWorkerId.startsWith('worker_')
      ? userIdOrWorkerId
      : `worker_${userIdOrWorkerId}`;
  }

  /**
   * Calculate skill level from score or input
   */
  static determineSkillLevel(score = 0, providedLevel) {
    if (providedLevel) return providedLevel;
    if (score >= 85) return 'Expert';
    if (score >= 70) return 'Advanced';
    if (score >= 50) return 'Intermediate';
    return 'Beginner';
  }

  /**
   * Create a new Worker profile in Firestore
   */
  static async createWorkerProfile(authUser, data) {
    const targetUserId = authUser.role === 'ADMIN' && data.userId ? data.userId : authUser.uid;
    const workerId = targetUserId.startsWith('worker_') ? targetUserId : `worker_${targetUserId}`;

    // Validation: Required fields
    if (!data.name || data.name.trim() === '') {
      const error = new Error('Worker name is required');
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

    // Check if worker profile already exists
    const existing = await firestoreDb.getDoc('workers', workerId);
    if (existing) {
      const error = new Error('Worker profile already exists for this user. Use PUT /api/workers/:id to update.');
      error.statusCode = 409;
      error.existingWorkerId = workerId;
      throw error;
    }

    const now = new Date().toISOString();
    const skillScore = typeof data.skillScore === 'number' ? data.skillScore : 0;
    const skillLevel = this.determineSkillLevel(skillScore, data.skillLevel);

    const workerProfile = {
      workerId,
      userId: targetUserId,
      name: data.name.trim(),
      location: data.location.trim(),
      occupation: data.occupation.trim(),
      experience: data.experience !== undefined ? data.experience : 0,
      languages: Array.isArray(data.languages) ? data.languages : (data.languages ? [data.languages] : ['English']),
      availability: data.availability || 'Available',
      about: data.about || '',
      skills: Array.isArray(data.skills) ? data.skills : (data.skills ? [data.skills] : []),
      workHistory: Array.isArray(data.workHistory) ? data.workHistory : (data.workHistory ? [data.workHistory] : []),
      skillScore,
      skillLevel,
      createdAt: now,
      updatedAt: now
    };

    logger.info(`Creating worker profile for userId: ${targetUserId} with workerId: ${workerId}`);
    await firestoreDb.setDoc('workers', workerId, workerProfile);

    return workerProfile;
  }

  /**
   * Get worker profile by ID
   * Access rules:
   * - Worker can access their own profile
   * - Admin and Employer can access worker profiles
   */
  static async getWorkerById(workerIdParam, authUser) {
    if (!workerIdParam) {
      const error = new Error('Worker ID is required');
      error.statusCode = 400;
      throw error;
    }

    const primaryDocId = this.getDocId(workerIdParam);
    let worker = await firestoreDb.getDoc('workers', primaryDocId);

    // Fallback: try raw param if custom doc ID was used
    if (!worker && primaryDocId !== workerIdParam) {
      worker = await firestoreDb.getDoc('workers', workerIdParam);
    }

    if (!worker) {
      // If user is requesting their own profile, auto-initialize starter worker document
      if (authUser && (authUser.uid === workerIdParam || primaryDocId.includes(authUser.uid) || (authUser.email && authUser.email.toLowerCase().includes('worker')))) {
        const now = new Date().toISOString();
        worker = {
          workerId: primaryDocId,
          userId: authUser.uid,
          name: authUser.name || authUser.displayName || 'Demo Worker',
          email: authUser.email || 'worker.demo@hackathon.local',
          location: authUser.location || 'Austin, TX',
          occupation: 'Electrician',
          experience: 5,
          languages: ['English', 'Spanish'],
          availability: 'Immediate',
          about: 'Certified industrial and commercial electrician with expertise in 480V diagnostics, safety protocols, and panel maintenance.',
          skills: ['480V Diagnostics', 'LOTO Protocols', 'Panel Wiring', 'Transformer Maintenance'],
          skillScore: 88,
          skillLevel: 'Advanced',
          createdAt: now,
          updatedAt: now
        };
        await firestoreDb.setDoc('workers', primaryDocId, worker);
        return worker;
      }

      const error = new Error(`Worker profile not found for identifier: ${workerIdParam}`);
      error.statusCode = 404;
      throw error;
    }

    // Access control check
    const isOwner = worker.userId === authUser.uid;
    const isAdmin = (authUser.role || '').toUpperCase() === 'ADMIN';
    const isEmployer = (authUser.role || '').toUpperCase() === 'EMPLOYER';

    if (!isOwner && !isAdmin && !isEmployer) {
      const error = new Error('Access denied. You can only view your own worker profile.');
      error.statusCode = 403;
      throw error;
    }

    return worker;
  }

  /**
   * Update worker profile
   * Access rules:
   * - Worker can modify only their own profile
   * - Admin can modify all worker profiles
   */
  static async updateWorkerProfile(workerIdParam, authUser, updateData) {
    if (!workerIdParam) {
      const error = new Error('Worker ID is required');
      error.statusCode = 400;
      throw error;
    }

    const primaryDocId = this.getDocId(workerIdParam);
    let existing = await firestoreDb.getDoc('workers', primaryDocId);

    if (!existing && primaryDocId !== workerIdParam) {
      existing = await firestoreDb.getDoc('workers', workerIdParam);
    }

    if (!existing) {
      const error = new Error(`Worker profile not found for identifier: ${workerIdParam}`);
      error.statusCode = 404;
      throw error;
    }

    const docKey = existing.workerId || primaryDocId;
    const isOwner = existing.userId === authUser.uid;
    const isAdmin = (authUser.role || '').toUpperCase() === 'ADMIN';

    // Strict authorization: Only owner or Admin can update
    if (!isOwner && !isAdmin) {
      const error = new Error('Access denied. Workers can modify only their own profile.');
      error.statusCode = 403;
      throw error;
    }

    const now = new Date().toISOString();

    // Prepare updated fields, guarding immutable properties
    const updatedProfile = {
      ...existing,
      name: updateData.name !== undefined ? updateData.name.trim() : existing.name,
      location: updateData.location !== undefined ? updateData.location.trim() : existing.location,
      occupation: updateData.occupation !== undefined ? updateData.occupation.trim() : existing.occupation,
      experience: updateData.experience !== undefined ? updateData.experience : existing.experience,
      languages: updateData.languages !== undefined
        ? (Array.isArray(updateData.languages) ? updateData.languages : [updateData.languages])
        : existing.languages,
      availability: updateData.availability !== undefined ? updateData.availability : existing.availability,
      about: updateData.about !== undefined ? updateData.about : existing.about,
      skills: updateData.skills !== undefined
        ? (Array.isArray(updateData.skills) ? updateData.skills : [updateData.skills])
        : existing.skills,
      workHistory: updateData.workHistory !== undefined
        ? (Array.isArray(updateData.workHistory) ? updateData.workHistory : [updateData.workHistory])
        : (existing.workHistory || []),
      skillScore: updateData.skillScore !== undefined ? updateData.skillScore : existing.skillScore,
      skillLevel: updateData.skillLevel !== undefined
        ? updateData.skillLevel
        : (updateData.skillScore !== undefined ? this.determineSkillLevel(updateData.skillScore) : existing.skillLevel),
      updatedAt: now
    };

    // Ensure immutable identity fields are preserved
    updatedProfile.workerId = existing.workerId;
    updatedProfile.userId = existing.userId;
    updatedProfile.createdAt = existing.createdAt;

    logger.info(`Updating worker profile: ${docKey}`);
    await firestoreDb.setDoc('workers', docKey, updatedProfile);

    return updatedProfile;
  }

  /**
   * List all workers with optional filtering (Admins, Employers, or Directory)
   */
  static async listWorkers(authUser, query = {}) {
    const allWorkers = await firestoreDb.getAllDocs('workers');
    let results = allWorkers;

    // Optional filters
    if (query.occupation) {
      const search = query.occupation.toLowerCase();
      results = results.filter((w) => (w.occupation || '').toLowerCase().includes(search));
    }
    if (query.location) {
      const search = query.location.toLowerCase();
      results = results.filter((w) => (w.location || '').toLowerCase().includes(search));
    }
    if (query.skill) {
      const skillSearch = query.skill.toLowerCase();
      results = results.filter((w) =>
        Array.isArray(w.skills) && w.skills.some((s) => s.toLowerCase().includes(skillSearch))
      );
    }

    return results;
  }

  /**
   * Get comprehensive Skill Passport combining:
   * - Worker profile
   * - AI assessment
   * - Verified Skills
   * - Work history
   * Does NOT invent information; returns data stored in Firestore or assessment records.
   */
  static async getSkillPassport(workerIdParam, authUser) {
    if (!workerIdParam) {
      const error = new Error('Worker ID is required');
      error.statusCode = 400;
      throw error;
    }

    // 1. Fetch Worker Profile
    const primaryDocId = this.getDocId(workerIdParam);
    let worker = await firestoreDb.getDoc('workers', primaryDocId);

    if (!worker && primaryDocId !== workerIdParam) {
      worker = await firestoreDb.getDoc('workers', workerIdParam);
    }

    if (!worker) {
      const error = new Error(`Worker profile not found for identifier: ${workerIdParam}`);
      error.statusCode = 404;
      throw error;
    }

    // Access control check
    const isOwner = !authUser || (authUser && (worker.userId === authUser.uid || worker.workerId === authUser.uid));
    const isAdmin = authUser && (authUser.role || '').toUpperCase() === 'ADMIN';
    const isEmployer = authUser && (authUser.role || '').toUpperCase() === 'EMPLOYER';

    if (authUser && !isOwner && !isAdmin && !isEmployer) {
      const error = new Error('Access denied. You can only view your own skill passport.');
      error.statusCode = 403;
      throw error;
    }

    const workerId = worker.workerId || primaryDocId;

    // 2. Fetch AI Assessment data from Firestore
    let latestAssessment = await firestoreDb.getDoc('assessments', `latest_${workerId}`);
    if (!latestAssessment) {
      const allAssessments = await firestoreDb.getAllDocs('assessments');
      const workerAssessments = allAssessments.filter((a) => a.workerId === workerId || a.userId === worker.userId);
      if (workerAssessments.length > 0) {
        latestAssessment = workerAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      }
    }

    // 3. Fetch Work History from profile or Firestore collection
    let workHistory = Array.isArray(worker.workHistory) ? worker.workHistory : [];
    if (workHistory.length === 0) {
      const allWorkHistory = await firestoreDb.getAllDocs('work_history');
      const matchedHistory = allWorkHistory.filter((w) => w.workerId === workerId || w.userId === worker.userId);
      if (matchedHistory.length > 0) {
        workHistory = matchedHistory;
      }
    }

    // 4. Extract verified skills
    const workerSkills = Array.isArray(worker.skills) ? worker.skills : [];
    const assessmentSkills = latestAssessment && Array.isArray(latestAssessment.skills) ? latestAssessment.skills : [];
    const combinedSkills = Array.from(new Set([...workerSkills, ...assessmentSkills]));

    // 5. Build structured Skill Passport payload without inventing data
    return {
      worker: {
        workerId: worker.workerId,
        userId: worker.userId,
        name: worker.name,
        location: worker.location,
        languages: worker.languages || [],
        availability: worker.availability || '',
        about: worker.about || '',
        createdAt: worker.createdAt
      },
      experience: worker.experience !== undefined ? worker.experience : 0,
      occupation: worker.occupation,
      skillScore: worker.skillScore !== undefined ? worker.skillScore : (latestAssessment ? latestAssessment.score : 0),
      skillLevel: worker.skillLevel || (latestAssessment ? latestAssessment.level : 'Beginner'),
      skills: combinedSkills,
      strengths: latestAssessment && Array.isArray(latestAssessment.strengths) ? latestAssessment.strengths : [],
      assessmentSummary: latestAssessment?.summary || '',
      workHistory
    };
  }
}

module.exports = WorkerService;
