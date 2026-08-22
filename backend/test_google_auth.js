require('dotenv').config();
const AuthService = require('./services/authService');

async function testGoogleAuth() {
  console.log('\n=== TESTING GOOGLE AUTH BACKEND INTEGRATION ===\n');

  // Test 1: First-time Google sign-in as Worker
  console.log('Test 1: First-time Google sign-in (Role: WORKER)');
  const workerResult = await AuthService.googleAuth({
    uid: 'google_user_worker_001',
    email: 'alex.rivera.google@example.com',
    name: 'Alex Rivera (Google)',
    photoURL: 'https://lh3.googleusercontent.com/a/default-user',
    role: 'WORKER'
  });

  console.log('PASS Test 1: Worker authenticated successfully ->');
  console.log('UID:', workerResult.user.uid);
  console.log('Email:', workerResult.user.email);
  console.log('Role:', workerResult.user.role);
  console.log('Provider:', workerResult.user.provider);

  if (workerResult.user.role !== 'WORKER') throw new Error('Expected role WORKER');
  if (!workerResult.token) throw new Error('Expected token in response');

  // Test 2: First-time Google sign-in as Employer
  console.log('\nTest 2: First-time Google sign-in (Role: EMPLOYER)');
  const employerResult = await AuthService.googleAuth({
    uid: 'google_user_employer_002',
    email: 'hiring.lead.google@example.com',
    name: 'Sarah Connor (Google)',
    photoURL: 'https://lh3.googleusercontent.com/a/default-employer',
    role: 'EMPLOYER'
  });

  console.log('PASS Test 2: Employer authenticated successfully ->');
  console.log('UID:', employerResult.user.uid);
  console.log('Email:', employerResult.user.email);
  console.log('Role:', employerResult.user.role);

  if (employerResult.user.role !== 'EMPLOYER') throw new Error('Expected role EMPLOYER');

  // Test 3: Returning Google user sync
  console.log('\nTest 3: Returning Google user updates profile');
  const syncResult = await AuthService.googleAuth({
    uid: 'google_user_worker_001',
    email: 'alex.rivera.google@example.com',
    name: 'Alex Rivera Updated',
    photoURL: 'https://lh3.googleusercontent.com/a/new-photo',
    role: 'WORKER'
  });

  console.log('PASS Test 3: Returning user synced -> Name:', syncResult.user.name);
  if (syncResult.user.name !== 'Alex Rivera Updated') throw new Error('Expected updated name');

  console.log('\n=== ALL GOOGLE AUTH BACKEND TESTS PASSED ===\n');
  process.exit(0);
}

testGoogleAuth().catch((err) => {
  console.error('Google Auth test failed:', err);
  process.exit(1);
});
