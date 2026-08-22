const { firestoreDb } = require('../config/firebase');
const { getGeminiClient, isGeminiConfigured } = require('../config/gemini');
const logger = require('../utils/logger');

class MatchingService {
  /**
   * Helper to clean markdown JSON wrappers from Gemini
   */
  static cleanJson(text) {
    if (!text) return '{}';
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return cleaned.trim();
  }

  /**
   * Deterministic matching calculation without hallucination
   */
  static calculateDeterministicMatch(job, worker, assessment = null) {
    // 1. Combine worker skills and AI verified skills from assessment
    const workerSkills = Array.isArray(worker.skills) ? worker.skills : [];
    const assessmentSkills = assessment && Array.isArray(assessment.skills) ? assessment.skills : [];
    const allWorkerSkills = Array.from(new Set([...workerSkills, ...assessmentSkills]));

    const requiredSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];

    // 2. Identify matched and missing skills
    const matchedSkills = [];
    const missingSkills = [];

    requiredSkills.forEach((reqSkill) => {
      const normalizedReq = reqSkill.toLowerCase().trim();
      const hasSkill = allWorkerSkills.some((ws) => {
        const normalizedWs = ws.toLowerCase().trim();
        return normalizedWs.includes(normalizedReq) || normalizedReq.includes(normalizedWs);
      });

      if (hasSkill) {
        matchedSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    });

    // 3. Multi-Factor Scoring (0 to 100)
    let score = 0;

    // Factor A: Skill Match Ratio (40% max)
    const skillRatio = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) : 1;
    score += skillRatio * 40;

    // Factor B: Skill Score from assessment / profile (20% max)
    const skillScore = typeof worker.skillScore === 'number'
      ? worker.skillScore
      : (assessment?.score !== undefined ? assessment.score : 60);
    score += (skillScore / 100) * 20;

    // Factor C: Experience Compatibility (20% max)
    const minExp = typeof job.minimumExperience === 'number' ? job.minimumExperience : 0;
    const workerExp = typeof worker.experience === 'number' ? worker.experience : (parseInt(worker.experience, 10) || 0);

    if (workerExp >= minExp) {
      score += 20;
    } else if (minExp > 0) {
      score += (workerExp / minExp) * 15;
    } else {
      score += 20;
    }

    // Factor D: Occupation & Location Compatibility (10% max)
    const occMatch = (worker.occupation || '').toLowerCase().includes((job.occupation || '').toLowerCase()) ||
                     (job.occupation || '').toLowerCase().includes((worker.occupation || '').toLowerCase());
    if (occMatch) score += 6;

    const locMatch = (worker.location || '').toLowerCase().includes((job.location || '').toLowerCase()) ||
                     (job.location || '').toLowerCase().includes((worker.location || '').toLowerCase());
    if (locMatch) score += 4;

    // Factor E: Availability (10% max)
    const avail = (worker.availability || '').toLowerCase();
    if (avail.includes('immediate') || avail.includes('available')) {
      score += 10;
    } else if (avail.includes('full-time') || avail.includes('part-time')) {
      score += 8;
    } else {
      score += 5;
    }

    const finalMatchScore = Math.min(100, Math.max(0, Math.round(score)));

    // Generate accurate, non-hallucinated reason
    let reason = '';
    if (finalMatchScore >= 85) {
      reason = `Exceptional fit with ${matchedSkills.length}/${requiredSkills.length} required skills, ${workerExp} yrs experience (min ${minExp} required), and a verified skill score of ${skillScore}.`;
    } else if (finalMatchScore >= 70) {
      reason = `Solid candidate matching ${matchedSkills.length} key skills with ${workerExp} years experience.`;
    } else if (finalMatchScore >= 50) {
      reason = `Moderate match. Candidate possesses foundational skills but lacks ${missingSkills.length} required qualification(s).`;
    } else {
      reason = `Low match due to skill and experience gaps for ${job.title}.`;
    }

    return {
      matchScore: finalMatchScore,
      matchedSkills,
      missingSkills,
      reason
    };
  }

  /**
   * Enhance candidate matching analysis via Gemini AI (grounded strictly in real profile data)
   */
  static async analyzeWithGemini(job, worker, deterministicResult) {
    if (!isGeminiConfigured()) {
      return deterministicResult;
    }

    const candidateModels = [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash-latest',
      'gemini-pro'
    ];

    const prompt = `
You are an expert AI talent matching analyst for the AI Hiring Platform.
Evaluate the fit between this Job Posting and Worker Candidate.

CRITICAL INSTRUCTION: You must NOT invent any qualifications or skills. ONLY evaluate using the exact provided profile data.

JOB REQUIREMENTS:
- Title: ${job.title}
- Occupation: ${job.occupation}
- Location: ${job.location}
- Minimum Experience: ${job.minimumExperience} years
- Required Skills: ${JSON.stringify(job.requiredSkills || [])}
- Description: ${job.description}

CANDIDATE ACTUAL PROFILE:
- Worker ID: ${worker.workerId}
- Name: ${worker.name}
- Occupation: ${worker.occupation}
- Experience: ${worker.experience} years
- Location: ${worker.location}
- Availability: ${worker.availability || 'Not specified'}
- Actual Verified Skills: ${JSON.stringify(worker.skills || [])}
- Skill Score: ${worker.skillScore || 0}
- Skill Level: ${worker.skillLevel || 'Beginner'}
- About: ${worker.about || 'N/A'}

Preliminary Computed Match:
- Matched Skills: ${JSON.stringify(deterministicResult.matchedSkills)}
- Missing Skills: ${JSON.stringify(deterministicResult.missingSkills)}
- Baseline Match Score: ${deterministicResult.matchScore}

Tasks:
1. Provide an objective matchScore between 0 and 100 based on skills, AI verified score, experience, location, and availability.
2. Provide matchedSkills (MUST be a subset of the candidate's actual skills that match required skills).
3. Provide missingSkills (Required skills the candidate does not have).
4. Provide a concise, professional 1-2 sentence reason explaining the fit.

Respond ONLY with a valid JSON object matching this structure:
{
  "matchScore": 94,
  "matchedSkills": ["Skill 1", "Skill 2"],
  "missingSkills": ["Skill 3"],
  "reason": "Strong skill and experience match with verified high voltage competency."
}
`;

    for (const modelName of candidateModels) {
      try {
        const client = getGeminiClient();
        const model = client.getGenerativeModel({ model: modelName });
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const parsed = JSON.parse(this.cleanJson(text));

        if (parsed && typeof parsed.matchScore === 'number' && Array.isArray(parsed.matchedSkills)) {
          // Double verify no invented skills in matchedSkills
          const actualSkillsLower = (worker.skills || []).map((s) => s.toLowerCase());
          const safeMatchedSkills = parsed.matchedSkills.filter((s) =>
            actualSkillsLower.some((as) => as.includes(s.toLowerCase()) || s.toLowerCase().includes(as))
          );

          return {
            matchScore: Math.min(100, Math.max(0, Math.round(parsed.matchScore))),
            matchedSkills: safeMatchedSkills.length > 0 ? safeMatchedSkills : deterministicResult.matchedSkills,
            missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : deterministicResult.missingSkills,
            reason: parsed.reason || deterministicResult.reason
          };
        }
      } catch (err) {
        logger.debug(`Gemini matching analysis on model ${modelName} skipped: ${err.message}`);
      }
    }

    return deterministicResult;
  }

  /**
   * Main Match Engine: Matches candidates for a given job and returns sorted candidates list
   */
  static async matchCandidatesForJob(jobIdOrData, authUser, options = {}) {
    let job = null;

    if (typeof jobIdOrData === 'string') {
      job = await firestoreDb.getDoc('jobs', jobIdOrData);
      if (!job) {
        const error = new Error(`Job not found for ID: ${jobIdOrData}`);
        error.statusCode = 404;
        throw error;
      }
    } else if (typeof jobIdOrData === 'object' && jobIdOrData !== null) {
      job = jobIdOrData;
    } else {
      const error = new Error('Job ID or job data object is required');
      error.statusCode = 400;
      throw error;
    }

    // 1. Fetch all worker profiles from Firestore
    let allWorkers = await firestoreDb.getAllDocs('workers');

    // Optional workerIds filter
    if (Array.isArray(options.workerIds) && options.workerIds.length > 0) {
      allWorkers = allWorkers.filter((w) =>
        options.workerIds.includes(w.workerId) || options.workerIds.includes(w.userId)
      );
    }

    if (allWorkers.length === 0) {
      return {
        jobId: job.jobId || 'custom_job',
        jobTitle: job.title,
        totalCandidates: 0,
        candidates: []
      };
    }

    // 2. Fetch all assessments to augment worker skills
    const allAssessments = await firestoreDb.getAllDocs('assessments');

    // 3. Process candidate matches
    const candidateMatches = [];

    for (const worker of allWorkers) {
      // Find latest assessment for worker
      const workerAssessments = allAssessments.filter(
        (a) => a.workerId === worker.workerId || a.userId === worker.userId
      );
      const latestAssessment = workerAssessments.length > 0
        ? workerAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        : null;

      // Deterministic base analysis
      const deterministicMatch = this.calculateDeterministicMatch(job, worker, latestAssessment);

      // AI Analysis
      const finalMatch = await this.analyzeWithGemini(job, worker, deterministicMatch);

      candidateMatches.push({
        workerId: worker.workerId,
        name: worker.name,
        occupation: worker.occupation,
        experience: worker.experience,
        location: worker.location,
        availability: worker.availability,
        skillScore: worker.skillScore !== undefined ? worker.skillScore : (latestAssessment ? latestAssessment.score : 0),
        skillLevel: worker.skillLevel || (latestAssessment ? latestAssessment.level : 'Beginner'),
        matchScore: finalMatch.matchScore,
        matchedSkills: finalMatch.matchedSkills,
        missingSkills: finalMatch.missingSkills,
        reason: finalMatch.reason
      });
    }

    // 4. Sort candidates by highest match score (Descending)
    candidateMatches.sort((a, b) => b.matchScore - a.matchScore);

    const limit = options.limit ? parseInt(options.limit, 10) : candidateMatches.length;
    const rankedCandidates = candidateMatches.slice(0, limit);

    return {
      jobId: job.jobId || 'custom_query',
      jobTitle: job.title,
      occupation: job.occupation,
      totalCandidates: rankedCandidates.length,
      candidates: rankedCandidates
    };
  }
}

module.exports = MatchingService;
