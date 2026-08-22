require('dotenv').config();
const AdminService = require('./services/adminService');
const WorkerService = require('./services/workerService');
const JobService = require('./services/jobService');
const ApplicationService = require('./services/applicationService');
const { requireAdmin } = require('./middleware/authMiddleware');

async function runAdminTests() {
  console.log('\n=== TESTING ADMIN APIS & ROLE-BASED ACCESS CONTROL ===\n');

  const mockWorker = {
    uid: 'worker_regular_123',
    email: 'worker@platform.com',
    role: 'WORKER'
  };

  const mockEmployer = {
    uid: 'employer_regular_456',
    email: 'employer@platform.com',
    role: 'EMPLOYER'
  };

  const mockAdmin = {
    uid: 'admin_super_999',
    email: 'superadmin@platform.com',
    role: 'ADMIN'
  };

  // Step 1: Verify Middleware Role-Based Access Control
  console.log('Step 1: Testing Role-Based Authorization Middleware');

  const testAuthMiddleware = (user) => {
    return new Promise((resolve, reject) => {
      const req = { user };
      const res = {
        status: (code) => ({
          json: (data) => reject({ statusCode: code, data })
        })
      };
      const next = () => resolve('Authorized');
      requireAdmin(req, res, next);
    });
  };

  // Test Worker Access to Admin route
  try {
    await testAuthMiddleware(mockWorker);
    throw new Error('FAIL: Worker should have been rejected from Admin routes');
  } catch (err) {
    console.log('PASS: Worker blocked from Admin routes -> Status:', err.statusCode, err.data?.message);
    if (err.statusCode !== 403) throw new Error('Expected status code 403');
  }

  // Test Employer Access to Admin route
  try {
    await testAuthMiddleware(mockEmployer);
    throw new Error('FAIL: Employer should have been rejected from Admin routes');
  } catch (err) {
    console.log('PASS: Employer blocked from Admin routes -> Status:', err.statusCode, err.data?.message);
    if (err.statusCode !== 403) throw new Error('Expected status code 403');
  }

  // Test Admin Access to Admin route
  const adminAuthResult = await testAuthMiddleware(mockAdmin);
  console.log('PASS: Admin authorized successfully ->', adminAuthResult);

  // Step 2: Populate some test data to verify real calculations
  console.log('\nStep 2: Populating test data for Analytics verification');

  // Create Worker
  await WorkerService.createWorkerProfile(mockWorker, {
    name: 'Admin Test Worker',
    location: 'Austin, TX',
    occupation: 'Electrician',
    experience: 4,
    skills: ['LOTO', 'Panel Wiring'],
    skillScore: 85
  });

  // Create Active Job
  const job1 = await JobService.createJob(mockEmployer, {
    title: 'Commercial Electrician',
    occupation: 'Electrician',
    location: 'Austin, TX',
    minimumExperience: 3,
    requiredSkills: ['LOTO'],
    description: 'Commercial facility wiring.',
    salaryRange: '$80,000',
    status: 'active'
  });

  // Create Draft Job
  await JobService.createJob(mockEmployer, {
    title: 'Industrial Electrician (Draft)',
    occupation: 'Electrician',
    location: 'Austin, TX',
    minimumExperience: 5,
    requiredSkills: ['480V Diagnostics'],
    description: 'Draft industrial job.',
    salaryRange: '$90,000',
    status: 'draft'
  });

  // Submit Application
  const app = await ApplicationService.createApplication(mockWorker, {
    jobId: job1.jobId,
    notes: 'Ready for interview'
  });

  // Step 3: Test GET /api/admin/analytics
  console.log('\nStep 3: Fetching Platform Analytics via AdminService');
  const analytics = await AdminService.getAnalytics();

  console.log('\n--- ANALYTICS DASHBOARD PAYLOAD ---');
  console.log('Total Workers:', analytics.totalWorkers);
  console.log('Total Employers:', analytics.totalEmployers);
  console.log('Total Jobs:', analytics.totalJobs);
  console.log('Active Jobs:', analytics.activeJobs);
  console.log('Total Applications:', analytics.totalApplications);
  console.log('Total Hires:', analytics.totalHires);
  console.log('Insights Breakdown:', analytics.insights);

  // Assertions
  if (typeof analytics.totalWorkers !== 'number' || analytics.totalWorkers < 1) throw new Error('totalWorkers assertion failed');
  if (typeof analytics.totalEmployers !== 'number' || analytics.totalEmployers < 1) throw new Error('totalEmployers assertion failed');
  if (typeof analytics.totalJobs !== 'number' || analytics.totalJobs < 2) throw new Error('totalJobs assertion failed');
  if (typeof analytics.activeJobs !== 'number' || analytics.activeJobs < 1) throw new Error('activeJobs assertion failed');
  if (typeof analytics.totalApplications !== 'number' || analytics.totalApplications < 1) throw new Error('totalApplications assertion failed');
  if (typeof analytics.totalHires !== 'number') throw new Error('totalHires assertion failed');

  // Step 4: Test GET /api/admin/users
  console.log('\nStep 4: Fetching Users via AdminService');
  const users = await AdminService.getUsers();
  console.log(`PASS: Retrieved ${users.length} user(s)`);

  // Step 5: Test GET /api/admin/jobs
  console.log('\nStep 5: Fetching All Jobs via AdminService');
  const allJobs = await AdminService.getJobs();
  console.log(`PASS: Retrieved ${allJobs.length} job(s) across all statuses`);

  // Step 6: Test GET /api/admin/applications
  console.log('\nStep 6: Fetching All Applications via AdminService');
  const allApps = await AdminService.getApplications();
  console.log(`PASS: Retrieved ${allApps.length} application(s)`);

  console.log('\n=== ALL ADMIN API & ANALYTICS TESTS PASSED SUCCESSFULLY ===\n');
  process.exit(0);
}

runAdminTests().catch((err) => {
  console.error('Admin test failed:', err);
  process.exit(1);
});
