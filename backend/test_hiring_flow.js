require('dotenv').config();
const WorkerService = require('./services/workerService');
const JobService = require('./services/jobService');
const ApplicationService = require('./services/applicationService');

async function runHiringWorkflowTests() {
  console.log('\n=== TESTING COMPLETE APPLICATION & HIRING WORKFLOW ===\n');

  const mockEmployer = {
    uid: 'employer_metro_power_888',
    email: 'hiring@metropower.com',
    role: 'EMPLOYER'
  };

  const mockWorker = {
    uid: 'worker_lucas_gray_999',
    email: 'lucas.electrician@example.com',
    role: 'WORKER'
  };

  // Step 1: Create Worker Profile
  console.log('Step 1: Setting up Worker profile');
  const workerProfile = await WorkerService.createWorkerProfile(mockWorker, {
    name: 'Lucas Gray',
    location: 'Houston, TX',
    occupation: 'Electrician',
    experience: 5,
    skills: ['480V Diagnostics', 'LOTO Protocols', 'Transformer Maintenance'],
    skillScore: 90,
    skillLevel: 'Advanced',
    availability: 'Immediate'
  });
  console.log('Worker Created:', workerProfile.name, '(', workerProfile.workerId, ')');

  // Step 2: Create Job Posting
  console.log('\nStep 2: Employer creates Job Posting');
  const jobPosting = await JobService.createJob(mockEmployer, {
    title: 'High Voltage Field Electrician',
    occupation: 'Electrician',
    location: 'Houston, TX',
    minimumExperience: 3,
    requiredSkills: ['480V Diagnostics', 'LOTO Protocols'],
    description: 'Lead high voltage transformer repairs and maintenance.',
    salaryRange: '$90,000 / year',
    status: 'active'
  });
  console.log('Job Created:', jobPosting.title, '(', jobPosting.jobId, ') Status:', jobPosting.status);

  // Step 3: Worker submits application
  console.log('\nStep 3: Worker submits application for the Job');
  const application = await ApplicationService.createApplication(mockWorker, {
    jobId: jobPosting.jobId,
    notes: 'I have 5 years of field experience handling 480V transformers.'
  });

  console.log('PASS Step 3: Application created -> ID:', application.applicationId);
  console.log('Application Fields:', {
    applicationId: application.applicationId,
    jobId: application.jobId,
    workerId: application.workerId,
    employerId: application.employerId,
    matchScore: application.matchScore,
    status: application.status
  });

  if (application.status !== 'APPLIED') throw new Error('Expected initial status APPLIED');
  if (typeof application.matchScore !== 'number') throw new Error('Expected numeric matchScore');

  // Step 4: Employer shortlists application
  console.log('\nStep 4: Employer updates status to SHORTLISTED');
  const shortlistedApp = await ApplicationService.updateApplicationStatus(
    application.applicationId,
    mockEmployer,
    { status: 'SHORTLISTED', notes: 'Top candidate. Schedule technical interview.' }
  );
  console.log('PASS Step 4: Application updated -> Status:', shortlistedApp.status, 'Notes:', shortlistedApp.notes);
  if (shortlistedApp.status !== 'SHORTLISTED') throw new Error('Expected SHORTLISTED status');

  // Step 5: Execute Hiring Flow (POST /api/hire)
  console.log('\nStep 5: Executing Complete Hiring Flow (POST /api/hire)');
  const hireResult = await ApplicationService.executeHiringFlow({
    applicationId: application.applicationId,
    authUser: mockEmployer,
    startDate: '2026-09-01',
    salary: '$92,000 / year',
    notes: 'Interview passed with excellence. Hired as Lead High Voltage Specialist.'
  });

  console.log('\n--- HIRING TRANSACTION COMPLETED ---');
  console.log('Application Status:', hireResult.applicationStatus, '(Expected HIRED)');
  console.log('Worker Status:', hireResult.workerStatus, '(Expected EMPLOYED)');
  console.log('Job Status:', hireResult.jobStatus, '(Expected FILLED)');
  console.log('Created Work History:', hireResult.workHistory);

  // Step 6: Verify Database Records Integrity
  console.log('\nStep 6: Verifying database state post-hiring');

  // Check Job is filled
  const updatedJob = await JobService.getJobById(jobPosting.jobId, mockEmployer);
  console.log('Verified Job Status in DB:', updatedJob.status);
  if (updatedJob.status !== 'filled') throw new Error('Job status was not updated to filled');

  // Check Worker is employed and work history exists
  const updatedWorker = await WorkerService.getWorkerById(workerProfile.workerId, mockWorker);
  console.log('Verified Worker Employment Status in DB:', updatedWorker.employmentStatus);
  console.log('Verified Worker Availability:', updatedWorker.availability);
  console.log('Verified Worker Work History entries count:', updatedWorker.workHistory.length);
  if (updatedWorker.employmentStatus !== 'EMPLOYED') throw new Error('Worker was not updated to EMPLOYED');
  if (updatedWorker.workHistory.length === 0) throw new Error('Work history was not created for worker');

  // Check Skill Passport integrates newly added employment history
  console.log('\nStep 7: Verifying Skill Passport reflects the new employment history');
  const passport = await WorkerService.getSkillPassport(workerProfile.workerId, mockWorker);
  console.log('Skill Passport Work History Count:', passport.workHistory.length);
  console.log('Skill Passport Latest Role:', passport.workHistory[0].role);

  console.log('\n=== ALL APPLICATION & HIRING WORKFLOW TESTS PASSED SUCCESSFULLY ===\n');
  process.exit(0);
}

runHiringWorkflowTests().catch((err) => {
  console.error('Hiring workflow test failed:', err);
  process.exit(1);
});
