const http = require('http');
const app = require('./server');

async function testBackend() {
  console.log('\n--- STARTING BACKEND TESTS ---\n');

  // Test 1: GET /api/health
  try {
    const healthRes = await fetch('http://localhost:5000/api/health');
    const healthData = await healthRes.json();
    console.log('Test 1: GET /api/health');
    console.log('Status:', healthRes.status);
    console.log('Response:', JSON.stringify(healthData, null, 2));
  } catch (err) {
    console.error('Test 1 failed:', err.message);
  }

  // Test 2: Reject ADMIN registration
  try {
    console.log('\nTest 2: Reject ADMIN on public register');
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin_test@example.com',
        password: 'Password123!',
        name: 'Super Admin',
        role: 'ADMIN'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status, '(Expected 403)');
    console.log('Response:', data);
  } catch (err) {
    console.error('Test 2 failed:', err.message);
  }

  // Test 3: Unauthorized profile access
  try {
    console.log('\nTest 3: Reject unauthenticated GET /api/auth/profile');
    const res = await fetch('http://localhost:5000/api/auth/profile');
    const data = await res.json();
    console.log('Status:', res.status, '(Expected 401)');
    console.log('Response:', data);
  } catch (err) {
    console.error('Test 3 failed:', err.message);
  }

  console.log('\n--- TESTS COMPLETE ---\n');
  process.exit(0);
}

// Give server time to listen then run tests
setTimeout(testBackend, 1500);
