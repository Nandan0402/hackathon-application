require('dotenv').config();
const AssessmentService = require('./services/assessmentService');
const WorkerService = require('./services/workerService');

async function runAssessmentTests() {
  console.log('\n=== TESTING AI SKILL ASSESSMENT PIPELINE (GEMINI EVALUATOR) ===\n');

  const mockWorkerUser = {
    uid: 'electrician_user_456',
    email: 'sparky@example.com',
    role: 'WORKER'
  };

  // Step 0: Ensure worker profile exists
  console.log('Step 0: Initializing Worker Profile for Electrician');
  await WorkerService.createWorkerProfile(mockWorkerUser, {
    name: 'Carlos Mendez',
    location: 'Austin, TX',
    occupation: 'Electrician',
    experience: 4,
    skills: ['Basic Wiring', 'Safety Auditing']
  });

  // Step 1: Generate questions for Electrician
  console.log('\nStep 1: Generating practical questions for Electrician trade');
  const questionResult = await AssessmentService.generateQuestions({
    occupation: 'Electrician',
    experienceYears: 4,
    count: 3
  });

  console.log('Generated questions count:', questionResult.questions.length);
  console.log('Sample Question 1:', questionResult.questions[0].question);

  // Step 2: Submit answers for evaluation
  console.log('\nStep 2: Submitting candidate answers for Gemini AI evaluation');
  const sampleAnswers = [
    {
      questionId: 1,
      question: "What are the essential steps of Lockout/Tagout (LOTO) and zero-energy verification?",
      answer: "First notify all affected personnel, shut down equipment via normal controls, isolate all energy sources, apply standardized padlock and tag with my name/date, discharge any stored capacitor or pneumatic energy, and verify zero potential using a calibrated CAT III multimeter on phase-to-phase and phase-to-ground."
    },
    {
      questionId: 2,
      question: "How do you diagnose a branch circuit intermittently tripping the GFCI breaker?",
      answer: "I disconnect all downstream loads to isolate if the device is faulty. If it still trips, I use an insulation resistance tester (megohmmeter) to test line-to-ground and neutral-to-ground integrity, and verify there is no neutral-ground bootleg or moisture ingress in exterior junction boxes."
    },
    {
      questionId: 3,
      question: "How do you size a continuous 48A load using 75C THHN copper conductors per NEC?",
      answer: "NEC Section 215.2(A)(1) requires continuous loads to be sized at 125%. 48A x 1.25 = 60A minimum ampacity. According to NEC Table 310.16 at 75°C, a #6 AWG THHN copper wire is rated for 65A, which meets and exceeds the 60A requirement with a 60A breaker."
    }
  ];

  const evaluationResult = await AssessmentService.submitAssessment(mockWorkerUser, {
    workerId: `worker_${mockWorkerUser.uid}`,
    occupation: 'Electrician',
    answers: sampleAnswers
  });

  console.log('\n--- EVALUATION RESULT CONTRACT VERIFICATION ---');
  console.log('Score:', evaluationResult.score, `(Type: ${typeof evaluationResult.score})`);
  console.log('Level:', evaluationResult.level);
  console.log('Identified Skills:', evaluationResult.skills);
  console.log('Strengths:', evaluationResult.strengths);
  console.log('Areas for Improvement:', evaluationResult.areasToImprove);
  console.log('Summary:', evaluationResult.summary);

  // Assertions
  if (typeof evaluationResult.score !== 'number') throw new Error('Score must be a number');
  if (!['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(evaluationResult.level)) {
    throw new Error(`Unexpected level: ${evaluationResult.level}`);
  }
  if (!Array.isArray(evaluationResult.skills)) throw new Error('Skills must be an array');
  if (!Array.isArray(evaluationResult.strengths)) throw new Error('Strengths must be an array');
  if (!Array.isArray(evaluationResult.areasToImprove)) throw new Error('areasToImprove must be an array');
  if (typeof evaluationResult.summary !== 'string') throw new Error('Summary must be a string');

  // Step 3: Verify GET /api/assessment/:workerId
  console.log('\nStep 3: Fetching saved assessment via getAssessmentByWorkerId');
  const fetchedAssessment = await AssessmentService.getAssessmentByWorkerId(`worker_${mockWorkerUser.uid}`, mockWorkerUser);
  console.log('Retrieved Score:', fetchedAssessment.score);
  console.log('Retrieved Level:', fetchedAssessment.level);

  // Step 4: Verify worker profile updated in Firestore
  console.log('\nStep 4: Checking updated worker profile in Firestore');
  const updatedWorker = await WorkerService.getWorkerById(`worker_${mockWorkerUser.uid}`, mockWorkerUser);
  console.log('Worker Skill Score updated to:', updatedWorker.skillScore);
  console.log('Worker Skill Level updated to:', updatedWorker.skillLevel);
  console.log('Worker Merged Skills:', updatedWorker.skills);

  console.log('\n=== ALL AI SKILL ASSESSMENT TESTS PASSED SUCCESSFULLY ===\n');
  process.exit(0);
}

runAssessmentTests().catch((err) => {
  console.error('Assessment test failed:', err);
  process.exit(1);
});
