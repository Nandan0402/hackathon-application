require('dotenv').config();
const WorkerService = require('./services/workerService');
const AssessmentService = require('./services/assessmentService');

async function runSkillPassportTests() {
  console.log('\n=== TESTING SKILL PASSPORT API PIPELINE ===\n');

  const mockWorkerUser = {
    uid: 'electrician_passport_user_777',
    email: 'elena.electric@example.com',
    role: 'WORKER'
  };

  const mockOtherWorkerUser = {
    uid: 'stranger_user_888',
    email: 'stranger@example.com',
    role: 'WORKER'
  };

  const mockEmployerUser = {
    uid: 'employer_user_999',
    email: 'recruiter@buildcorp.com',
    role: 'EMPLOYER'
  };

  const sampleWorkHistory = [
    {
      company: 'Apex Electrical Systems',
      role: 'Senior Journeyman Electrician',
      duration: '2021 - Present',
      responsibilities: ['Industrial 480V installation', 'Crew safety supervision']
    },
    {
      company: 'Volt Technical Services',
      role: 'Apprentice Electrician',
      duration: '2018 - 2021',
      responsibilities: ['Residential rough-in wiring', 'Conduit bending']
    }
  ];

  // 1. Create worker profile with real work history and profile fields
  console.log('Step 1: Creating worker profile with work history');
  const createdWorker = await WorkerService.createWorkerProfile(mockWorkerUser, {
    name: 'Elena Rostova',
    location: 'Denver, CO',
    occupation: 'Electrician',
    experience: 7,
    languages: ['English', 'Russian'],
    availability: 'Full-time',
    about: 'Experienced industrial and commercial electrician certified in high voltage and safety compliance.',
    skills: ['Commercial Wiring', 'High Voltage Safety', 'Panel Upgrades'],
    workHistory: sampleWorkHistory
  });

  console.log('Created Worker ID:', createdWorker.workerId);

  // 2. Perform Assessment to generate verified score, level, strengths, and summary
  console.log('\nStep 2: Submitting practical assessment for AI evaluation');
  await AssessmentService.submitAssessment(mockWorkerUser, {
    workerId: createdWorker.workerId,
    occupation: 'Electrician',
    answers: [
      {
        questionId: 1,
        question: "Describe LOTO protocol for 480V panel maintenance.",
        answer: "Notify the facility supervisor, de-energize the upstream feeder breaker, attach OSHA-approved lockout hasp with personal tag, discharge capacitor banks, and verify zero voltage using calibrated CAT IV test probes phase-to-phase and phase-to-ground."
      },
      {
        questionId: 2,
        question: "Explain 3-phase motor rotation correction.",
        answer: "If rotation is reversed upon startup, isolate power per LOTO and swap any two of the three line conductor leads (e.g. T1 and T3) at the motor starter terminal block."
      }
    ]
  });

  // 3. Fetch Skill Passport as the worker owner
  console.log('\nStep 3: Fetching Skill Passport as Worker Owner');
  const passport = await WorkerService.getSkillPassport(createdWorker.workerId, mockWorkerUser);

  console.log('\n--- STRUCTURED SKILL PASSPORT RESPONSE ---');
  console.log('Worker Info:', passport.worker);
  console.log('Experience:', passport.experience);
  console.log('Occupation:', passport.occupation);
  console.log('Skill Score:', passport.skillScore);
  console.log('Skill Level:', passport.skillLevel);
  console.log('Skills:', passport.skills);
  console.log('Strengths:', passport.strengths);
  console.log('Assessment Summary:', passport.assessmentSummary);
  console.log('Work History Count:', passport.workHistory.length);
  console.log('Work History Sample:', passport.workHistory[0]);

  // Assertions
  if (!passport.worker || passport.worker.name !== 'Elena Rostova') {
    throw new Error('Worker info mismatch');
  }
  if (passport.experience !== 7) throw new Error('Experience mismatch');
  if (passport.occupation !== 'Electrician') throw new Error('Occupation mismatch');
  if (typeof passport.skillScore !== 'number') throw new Error('Skill score must be a number');
  if (!passport.skillLevel) throw new Error('Skill level missing');
  if (!Array.isArray(passport.skills) || passport.skills.length === 0) throw new Error('Skills missing');
  if (!Array.isArray(passport.strengths)) throw new Error('Strengths must be array');
  if (typeof passport.assessmentSummary !== 'string') throw new Error('Assessment summary must be string');
  if (!Array.isArray(passport.workHistory) || passport.workHistory.length !== 2) {
    throw new Error('Work history count mismatch');
  }

  // 4. Test Employer Access
  console.log('\nStep 4: Employer accessing Worker Skill Passport');
  const employerPassport = await WorkerService.getSkillPassport(createdWorker.workerId, mockEmployerUser);
  console.log('PASS Step 4: Employer successfully retrieved Skill Passport for:', employerPassport.worker.name);

  // 5. Test Unauthorized Worker Access
  console.log('\nStep 5: Unauthorized Worker accessing Skill Passport (expect 403 Forbidden)');
  try {
    await WorkerService.getSkillPassport(createdWorker.workerId, mockOtherWorkerUser);
    throw new Error('FAIL: Unauthorized access should have been blocked');
  } catch (err) {
    console.log('PASS Step 5: Unauthorized worker blocked as expected ->', err.message, `(Status ${err.statusCode})`);
  }

  console.log('\n=== ALL SKILL PASSPORT API TESTS PASSED SUCCESSFULLY ===\n');
  process.exit(0);
}

runSkillPassportTests().catch((err) => {
  console.error('Skill Passport test failed:', err);
  process.exit(1);
});
