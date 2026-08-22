const { spawnSync } = require('child_process');

console.log('\n======================================================');
console.log('  AI HIRING PLATFORM - COMPLETE BACKEND TEST SUITE   ');
console.log('======================================================\n');

const testSuites = [
  { name: '1. Health & Core Authentication', file: 'test_server.js' },
  { name: '2. Worker Management & RBAC', file: 'test_workers.js' },
  { name: '3. Gemini AI Skill Assessment', file: 'test_assessment.js' },
  { name: '4. Skill Passport Aggregation', file: 'test_skill_passport.js' },
  { name: '5. Employer & Job Management', file: 'test_jobs.js' },
  { name: '6. AI-Powered Candidate Matching', file: 'test_matching.js' },
  { name: '7. Application & Complete Hiring Workflow', file: 'test_hiring_flow.js' },
  { name: '8. Work History & Automated Hiring Sync', file: 'test_work_history.js' },
  { name: '9. Admin Analytics & Resource Management', file: 'test_admin.js' },
  { name: '10. Google Auth & Firebase Backend Sync', file: 'test_google_auth.js' }
];

let allPassed = true;

for (const suite of testSuites) {
  console.log(`\n>>> RUNNING: ${suite.name} (${suite.file})`);
  const result = spawnSync('node', [suite.file], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true
  });

  if (result.status !== 0) {
    console.error(`\nFAILED: ${suite.name}`);
    allPassed = false;
    break;
  }
}

if (allPassed) {
  console.log('\n======================================================');
  console.log('  ALL 9 BACKEND SUBSYSTEM TESTS PASSED SUCCESSFULLY!  ');
  console.log('======================================================\n');
  process.exit(0);
} else {
  console.error('\nOne or more test suites failed.');
  process.exit(1);
}
