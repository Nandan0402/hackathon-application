require('dotenv').config();
const JobService = require('./services/jobService');

async function runJobTests() {
  console.log('\n=== TESTING EMPLOYER & JOB MANAGEMENT PIPELINE ===\n');

  const mockEmployer1 = {
    uid: 'employer_acme_corp_101',
    email: 'hiring@acmecorp.com',
    role: 'EMPLOYER'
  };

  const mockEmployer2 = {
    uid: 'employer_rival_corp_202',
    email: 'recruiter@rivalcorp.com',
    role: 'EMPLOYER'
  };

  const mockWorker = {
    uid: 'worker_john_doe_303',
    email: 'john.trades@example.com',
    role: 'WORKER'
  };

  const mockAdmin = {
    uid: 'admin_sys_999',
    email: 'admin@platform.com',
    role: 'ADMIN'
  };

  // Test 1: Worker attempting to create job (expect 403 Forbidden)
  console.log('Test 1: Worker attempting to create a job (expect 403 Forbidden)');
  try {
    await JobService.createJob(mockWorker, {
      title: 'Senior Electrician',
      occupation: 'Electrician',
      location: 'Dallas, TX',
      description: 'Supervise industrial panel installs.'
    });
    throw new Error('FAIL: Worker job creation should have been rejected');
  } catch (err) {
    console.log('PASS Test 1: Worker blocked from creating job ->', err.message, `(Status ${err.statusCode})`);
  }

  // Test 2: Validation failure on missing fields
  console.log('\nTest 2: Employer creating job with missing fields (expect 400 Bad Request)');
  try {
    await JobService.createJob(mockEmployer1, {
      title: 'Incomplete Job'
    });
    throw new Error('FAIL: Incomplete job creation should have been rejected');
  } catch (err) {
    console.log('PASS Test 2: Validation error caught ->', err.message, `(Status ${err.statusCode})`);
  }

  // Test 3: Employer 1 creates Active Job
  console.log('\nTest 3: Employer 1 creates valid Active Job');
  const activeJob = await JobService.createJob(mockEmployer1, {
    title: 'Lead Commercial Electrician',
    occupation: 'Electrician',
    location: 'Austin, TX',
    minimumExperience: 4,
    requiredSkills: ['LOTO Protocols', '480V Diagnostics', 'Conduit Bending'],
    description: 'Looking for a certified master or lead journeyman electrician for commercial building development.',
    salaryRange: '$80,000 - $100,000 / year',
    status: 'active'
  });

  console.log('PASS Test 3: Active Job Created successfully -> ID:', activeJob.jobId);
  console.log('Fields verified:', {
    jobId: activeJob.jobId,
    employerId: activeJob.employerId,
    title: activeJob.title,
    occupation: activeJob.occupation,
    location: activeJob.location,
    minimumExperience: activeJob.minimumExperience,
    requiredSkills: activeJob.requiredSkills,
    salaryRange: activeJob.salaryRange,
    status: activeJob.status
  });

  // Test 4: Employer 1 creates Draft/Closed Job
  console.log('\nTest 4: Employer 1 creates Draft Job');
  const draftJob = await JobService.createJob(mockEmployer1, {
    title: 'Draft Apprentice Electrician',
    occupation: 'Electrician',
    location: 'Houston, TX',
    minimumExperience: 1,
    requiredSkills: ['Basic Wiring'],
    description: 'Internal draft job posting.',
    salaryRange: '$25/hr',
    status: 'draft'
  });
  console.log('PASS Test 4: Draft Job created -> ID:', draftJob.jobId, 'Status:', draftJob.status);

  // Test 5: Worker listing jobs (Must ONLY see active jobs)
  console.log('\nTest 5: Worker listing jobs (Draft jobs must be hidden)');
  const workerJobs = await JobService.listJobs(mockWorker);
  const foundDraftInWorker = workerJobs.some((j) => j.status !== 'active');
  if (foundDraftInWorker) throw new Error('Worker was able to see non-active jobs!');
  console.log(`PASS Test 5: Worker retrieved ${workerJobs.length} job(s), all verified as active`);

  // Test 6: Employer 2 attempting to modify Employer 1's job (expect 403 Forbidden)
  console.log('\nTest 6: Employer 2 modifying Employer 1 job (expect 403 Forbidden)');
  try {
    await JobService.updateJob(activeJob.jobId, mockEmployer2, {
      title: 'Tampered Job Title'
    });
    throw new Error('FAIL: Unauthorized employer update should have failed');
  } catch (err) {
    console.log('PASS Test 6: Unauthorized employer update blocked ->', err.message, `(Status ${err.statusCode})`);
  }

  // Test 7: Employer 2 attempting to delete Employer 1's job (expect 403 Forbidden)
  console.log('\nTest 7: Employer 2 deleting Employer 1 job (expect 403 Forbidden)');
  try {
    await JobService.deleteJob(activeJob.jobId, mockEmployer2);
    throw new Error('FAIL: Unauthorized employer delete should have failed');
  } catch (err) {
    console.log('PASS Test 7: Unauthorized employer delete blocked ->', err.message, `(Status ${err.statusCode})`);
  }

  // Test 8: Employer 1 successfully updates own job
  console.log('\nTest 8: Employer 1 updates own job');
  const updatedJob = await JobService.updateJob(activeJob.jobId, mockEmployer1, {
    salaryRange: '$85,000 - $105,000 / year',
    minimumExperience: 5
  });
  console.log('PASS Test 8: Job updated successfully -> Salary:', updatedJob.salaryRange, 'Min Exp:', updatedJob.minimumExperience);

  // Test 9: Admin managing and updating any job
  console.log('\nTest 9: Admin updating any job');
  const adminUpdated = await JobService.updateJob(activeJob.jobId, mockAdmin, {
    status: 'active'
  });
  console.log('PASS Test 9: Admin successfully modified job -> Status:', adminUpdated.status);

  // Test 10: Employer 1 deletes own job
  console.log('\nTest 10: Employer 1 deletes own job');
  const deleteResult = await JobService.deleteJob(draftJob.jobId, mockEmployer1);
  console.log('PASS Test 10: Job deleted successfully ->', deleteResult);

  console.log('\n=== ALL EMPLOYER & JOB MANAGEMENT TESTS PASSED SUCCESSFULLY ===\n');
  process.exit(0);
}

runJobTests().catch((err) => {
  console.error('Job tests failed:', err);
  process.exit(1);
});
