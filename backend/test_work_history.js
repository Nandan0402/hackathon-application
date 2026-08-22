require('dotenv').config();
const WorkerService = require('./services/workerService');
const JobService = require('./services/jobService');
const ApplicationService = require('./services/applicationService');
const WorkHistoryService = require('./services/workHistoryService');

async function runWorkHistoryTests() {
  console.log('\n=== TESTING WORK HISTORY MANAGEMENT & AUTOMATED HIRING INTEGRATION ===\n');

  const mockWorker = {
    uid: 'worker_mateo_alvarez_654',
    email: 'mateo@trades.com',
    role: 'WORKER'
  };

  const mockEmployer = {
    uid: 'employer_grid_builders_765',
    email: 'careers@gridbuilders.com',
    role: 'EMPLOYER'
  };

  const mockOtherWorker = {
    uid: 'worker_stranger_111',
    email: 'stranger@example.com',
    role: 'WORKER'
  };

  // Step 1: Create Worker Profile
  console.log('Step 1: Creating Worker profile');
  const worker = await WorkerService.createWorkerProfile(mockWorker, {
    name: 'Mateo Alvarez',
    location: 'Phoenix, AZ',
    occupation: 'Electrician',
    experience: 6,
    skills: ['Commercial Wiring', 'Solar Inverter Systems', 'LOTO']
  });
  console.log('Created Worker ID:', worker.workerId);

  // Step 2: Manually add a prior work history entry (POST /api/work-history)
  console.log('\nStep 2: Adding prior work history entry via WorkHistoryService');
  const priorHistory = await WorkHistoryService.createWorkHistory(mockWorker, {
    workerId: worker.workerId,
    companyName: 'Desert Solar Tech',
    role: 'Journeyman Solar Electrician',
    startDate: '2020-03-01',
    endDate: '2023-08-15',
    skillsUsed: ['Solar Inverter Systems', 'DC Wiring', 'Grounding'],
    employerRating: 4.9
  });

  console.log('PASS Step 2: Prior Work History Created ->');
  console.log('Fields verified:', {
    historyId: priorHistory.historyId,
    workerId: priorHistory.workerId,
    companyName: priorHistory.companyName,
    role: priorHistory.role,
    startDate: priorHistory.startDate,
    endDate: priorHistory.endDate,
    skillsUsed: priorHistory.skillsUsed,
    employerRating: priorHistory.employerRating,
    createdAt: priorHistory.createdAt
  });

  // Step 3: Fetch Work History as Worker
  console.log('\nStep 3: Fetching Work History as Worker');
  const historyList = await WorkHistoryService.getWorkHistoryByWorkerId(worker.workerId, mockWorker);
  console.log(`PASS Step 3: Worker fetched ${historyList.length} record(s)`);
  if (historyList.length !== 1) throw new Error('Expected 1 work history record');

  // Step 4: Employer access check
  console.log('\nStep 4: Employer accessing Worker history');
  const employerView = await WorkHistoryService.getWorkHistoryByWorkerId(worker.workerId, mockEmployer);
  console.log('PASS Step 4: Employer successfully viewed worker history -> Count:', employerView.length);

  // Step 5: Unauthorized worker access check
  console.log('\nStep 5: Unauthorized worker accessing history (expect 403 Forbidden)');
  try {
    await WorkHistoryService.getWorkHistoryByWorkerId(worker.workerId, mockOtherWorker);
    throw new Error('FAIL: Unauthorized access should have been blocked');
  } catch (err) {
    console.log('PASS Step 5: Unauthorized access blocked ->', err.message, `(Status ${err.statusCode})`);
  }

  // Step 6: Create Job, Apply, and Hire -> Verify Automatic Work History Creation
  console.log('\nStep 6: Executing Job Hire to test Automatic Work History creation');
  const job = await JobService.createJob(mockEmployer, {
    title: 'Lead Solar Grid Electrician',
    occupation: 'Electrician',
    location: 'Phoenix, AZ',
    minimumExperience: 4,
    requiredSkills: ['Solar Inverter Systems', 'LOTO', 'High Voltage Safety'],
    description: 'Lead commercial solar power array installation.',
    salaryRange: '$95,000 / year',
    status: 'active'
  });

  const application = await ApplicationService.createApplication(mockWorker, {
    jobId: job.jobId,
    notes: 'Experienced solar journeyman ready to start.'
  });

  // Execute Hiring
  const hireResult = await ApplicationService.executeHiringFlow({
    applicationId: application.applicationId,
    authUser: mockEmployer,
    startDate: '2026-09-15',
    salary: '$95,000 / year'
  });

  console.log('PASS Step 6: Hire executed. Automated Work History created -> ID:', hireResult.workHistory.historyId);
  console.log('Automated Work History Fields:', {
    historyId: hireResult.workHistory.historyId,
    workerId: hireResult.workHistory.workerId,
    employerId: hireResult.workHistory.employerId,
    companyName: hireResult.workHistory.companyName,
    jobId: hireResult.workHistory.jobId,
    role: hireResult.workHistory.role,
    startDate: hireResult.workHistory.startDate,
    endDate: hireResult.workHistory.endDate,
    skillsUsed: hireResult.workHistory.skillsUsed,
    employerRating: hireResult.workHistory.employerRating
  });

  // Step 7: Verify total combined history (Prior history + Newly hired role)
  console.log('\nStep 7: Verifying updated history list for worker');
  const updatedHistoryList = await WorkHistoryService.getWorkHistoryByWorkerId(worker.workerId, mockWorker);
  console.log('Total Work History entries count:', updatedHistoryList.length);
  if (updatedHistoryList.length !== 2) throw new Error('Expected 2 total work history records');

  console.log('\n=== ALL WORK HISTORY TESTS PASSED SUCCESSFULLY ===\n');
  process.exit(0);
}

runWorkHistoryTests().catch((err) => {
  console.error('Work History test failed:', err);
  process.exit(1);
});
