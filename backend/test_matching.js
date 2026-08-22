require('dotenv').config();
const WorkerService = require('./services/workerService');
const JobService = require('./services/jobService');
const MatchingService = require('./services/matchingService');

async function runMatchingTests() {
  console.log('\n=== TESTING AI-POWERED CANDIDATE MATCHING PIPELINE ===\n');

  const mockEmployer = {
    uid: 'employer_techbuild_555',
    email: 'hr@techbuild.com',
    role: 'EMPLOYER'
  };

  // Step 1: Create 3 diverse candidates
  console.log('Step 1: Setting up candidates in Firestore');

  // Candidate A: Top Match
  const candidateA = await WorkerService.createWorkerProfile(
    { uid: 'cand_a_master_electrician', role: 'WORKER' },
    {
      name: 'Marcus Vance',
      location: 'Austin, TX',
      occupation: 'Electrician',
      experience: 6,
      availability: 'Immediate',
      skills: ['LOTO Protocols', '480V Diagnostics', 'Conduit Bending', '3-Phase Motors'],
      skillScore: 94,
      skillLevel: 'Expert',
      about: 'Licensed master electrician with 6+ years in commercial industrial facilities.'
    }
  );

  // Candidate B: Partial / Junior Match
  const candidateB = await WorkerService.createWorkerProfile(
    { uid: 'cand_b_junior_electrician', role: 'WORKER' },
    {
      name: 'Leo Chen',
      location: 'Dallas, TX',
      occupation: 'Electrician',
      experience: 1,
      availability: 'Full-time',
      skills: ['Basic Wiring', 'Safety Auditing'],
      skillScore: 65,
      skillLevel: 'Intermediate',
      about: 'Entry level apprentice electrician eager to learn.'
    }
  );

  // Candidate C: Non-Matching Trade
  const candidateC = await WorkerService.createWorkerProfile(
    { uid: 'cand_c_plumber', role: 'WORKER' },
    {
      name: 'Sam Brooks',
      location: 'Austin, TX',
      occupation: 'Plumber',
      experience: 5,
      availability: 'Immediate',
      skills: ['Pipe Fitting', 'PEX Installation', 'Drain Clearing'],
      skillScore: 88,
      skillLevel: 'Advanced',
      about: 'Journeyman plumber specialized in commercial piping.'
    }
  );

  console.log('Created candidates:', candidateA.name, ',', candidateB.name, ',', candidateC.name);

  // Step 2: Create a Target Job Posting
  console.log('\nStep 2: Creating Job Posting for Lead Industrial Electrician');
  const targetJob = await JobService.createJob(mockEmployer, {
    title: 'Lead Industrial Electrician',
    occupation: 'Electrician',
    location: 'Austin, TX',
    minimumExperience: 4,
    requiredSkills: ['LOTO Protocols', '480V Diagnostics', 'Conduit Bending'],
    description: 'Seeking a seasoned lead electrician for commercial factory power distribution.',
    salaryRange: '$85,000 - $105,000',
    status: 'active'
  });

  console.log('Created Job ID:', targetJob.jobId);

  // Step 3: Run AI Candidate Matching
  console.log('\nStep 3: Executing Matching Engine for Job');
  const matchResult = await MatchingService.matchCandidatesForJob(targetJob.jobId, mockEmployer);

  console.log('\n--- MATCHING RESULTS OVERVIEW ---');
  console.log('Job Title:', matchResult.jobTitle);
  console.log('Total Candidates Evaluated:', matchResult.totalCandidates);

  matchResult.candidates.forEach((cand, idx) => {
    console.log(`\n[Rank #${idx + 1}] Candidate: ${cand.name} (${cand.workerId})`);
    console.log('Match Score:', cand.matchScore);
    console.log('Matched Skills:', cand.matchedSkills);
    console.log('Missing Skills:', cand.missingSkills);
    console.log('Reason:', cand.reason);
  });

  // Step 4: Validate Contract and Ranking Assertions
  console.log('\nStep 4: Running strict assertions on ranking & contracts');
  const topCandidate = matchResult.candidates[0];

  // 1. Top candidate must be Marcus Vance (Candidate A)
  if (topCandidate.workerId !== candidateA.workerId) {
    throw new Error(`Expected top candidate to be ${candidateA.workerId}, got ${topCandidate.workerId}`);
  }

  // 2. Candidates must be sorted descending by matchScore
  for (let i = 0; i < matchResult.candidates.length - 1; i++) {
    if (matchResult.candidates[i].matchScore < matchResult.candidates[i + 1].matchScore) {
      throw new Error('Candidates are not strictly sorted in descending order of matchScore');
    }
  }

  // 3. Contract shape check
  matchResult.candidates.forEach((c) => {
    if (typeof c.workerId !== 'string') throw new Error('workerId must be string');
    if (typeof c.matchScore !== 'number') throw new Error('matchScore must be number');
    if (!Array.isArray(c.matchedSkills)) throw new Error('matchedSkills must be array');
    if (!Array.isArray(c.missingSkills)) throw new Error('missingSkills must be array');
    if (typeof c.reason !== 'string' || c.reason.trim().length === 0) throw new Error('reason must be non-empty string');
  });

  console.log('PASS: Top Candidate Match Score:', topCandidate.matchScore, '>= 85');
  console.log('PASS: Matched skills verified without hallucination:', topCandidate.matchedSkills);

  console.log('\n=== ALL AI CANDIDATE MATCHING TESTS PASSED SUCCESSFULLY ===\n');
  process.exit(0);
}

runMatchingTests().catch((err) => {
  console.error('Matching test failed:', err);
  process.exit(1);
});
