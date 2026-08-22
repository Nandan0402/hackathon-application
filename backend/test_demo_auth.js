require('dotenv').config();
const AuthService = require('./services/authService');

async function testDemoAuth() {
  console.log('\n=== TESTING DEMO CREDENTIALS AUTHENTICATION & ROLE ENFORCEMENT ===\n');

  // Test 1: Worker Demo Login
  console.log('Test 1: Worker demo credentials login');
  const workerRes = await AuthService.login({
    email: 'worker.demo@hackathon.local',
    password: 'Worker@12345'
  });
  console.log('PASS Test 1: Worker logged in -> Role:', workerRes.user.role, '| Name:', workerRes.user.name);
  if (workerRes.user.role !== 'WORKER') throw new Error('Expected role WORKER');
  if (!workerRes.token) throw new Error('Expected auth token');

  // Test 2: Employer Demo Login
  console.log('\nTest 2: Employer demo credentials login');
  const employerRes = await AuthService.login({
    email: 'employer.demo@hackathon.local',
    password: 'Employer@12345'
  });
  console.log('PASS Test 2: Employer logged in -> Role:', employerRes.user.role, '| Name:', employerRes.user.name);
  if (employerRes.user.role !== 'EMPLOYER') throw new Error('Expected role EMPLOYER');

  // Test 3: Admin Demo Login
  console.log('\nTest 3: Admin demo credentials login');
  const adminRes = await AuthService.login({
    email: 'admin.demo@hackathon.local',
    password: 'Admin@12345'
  });
  console.log('PASS Test 3: Admin logged in -> Role:', adminRes.user.role, '| Name:', adminRes.user.name);
  if (adminRes.user.role !== 'ADMIN') throw new Error('Expected role ADMIN');

  // Test 4: Incorrect password rejection
  console.log('\nTest 4: Incorrect password rejection');
  try {
    await AuthService.login({
      email: 'worker.demo@hackathon.local',
      password: 'WrongPassword!123'
    });
    throw new Error('FAIL: Should have rejected incorrect password');
  } catch (err) {
    console.log('PASS Test 4: Incorrect password correctly rejected ->', err.message);
  }

  console.log('\n=== ALL DEMO AUTH TESTS PASSED SUCCESSFULLY ===\n');
  process.exit(0);
}

testDemoAuth().catch((err) => {
  console.error('Demo auth test failed:', err);
  process.exit(1);
});
