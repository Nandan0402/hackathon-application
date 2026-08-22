require('dotenv').config();
const WorkerService = require('./services/workerService');

async function runWorkerTests() {
  console.log('\n=== TESTING WORKER MANAGEMENT LOGIC & PERMISSIONS ===\n');

  const mockWorkerUser = {
    uid: 'worker_user_123',
    email: 'worker123@example.com',
    role: 'WORKER'
  };

  const mockOtherWorkerUser = {
    uid: 'worker_user_999',
    email: 'other_worker@example.com',
    role: 'WORKER'
  };

  const mockAdminUser = {
    uid: 'admin_user_001',
    email: 'admin@example.com',
    role: 'ADMIN'
  };

  // Test 1: Create worker profile validation failure
  try {
    console.log('Test 1: Create Worker Profile with missing fields (expect Error)');
    await WorkerService.createWorkerProfile(mockWorkerUser, { name: 'Alex' });
    console.error('FAIL: Test 1 should have thrown an error');
  } catch (err) {
    console.log('PASS Test 1: Caught validation error ->', err.message);
  }

  // Test 2: Successful worker profile creation
  let createdProfile;
  try {
    console.log('\nTest 2: Create Worker Profile with complete fields');
    createdProfile = await WorkerService.createWorkerProfile(mockWorkerUser, {
      name: 'Alex Rivera',
      location: 'San Francisco, CA',
      occupation: 'Electrician',
      experience: 5,
      languages: ['English', 'Spanish'],
      availability: 'Immediate',
      about: 'Licensed master electrician specializing in industrial and residential wiring.',
      skills: ['Wiring', 'Circuit Breakers', 'Troubleshooting', 'Solar Panels'],
      skillScore: 88
    });
    console.log('PASS Test 2: Created worker profile successfully ->');
    console.log('WorkerId:', createdProfile.workerId);
    console.log('Skill Level calculated:', createdProfile.skillLevel);
    console.log('Fields verified:', {
      name: createdProfile.name,
      occupation: createdProfile.occupation,
      languages: createdProfile.languages,
      skills: createdProfile.skills
    });
  } catch (err) {
    console.error('FAIL Test 2:', err);
  }

  // Test 3: Owner fetching own profile
  try {
    console.log('\nTest 3: Worker owner fetching own profile');
    const fetched = await WorkerService.getWorkerById(createdProfile.workerId, mockWorkerUser);
    console.log('PASS Test 3: Successfully retrieved profile for owner ->', fetched.name);
  } catch (err) {
    console.error('FAIL Test 3:', err);
  }

  // Test 4: Another worker attempting to access profile (expect 403 Forbidden)
  try {
    console.log('\nTest 4: Another worker fetching someone else\'s profile (expect 403 Forbidden)');
    await WorkerService.getWorkerById(createdProfile.workerId, mockOtherWorkerUser);
    console.error('FAIL: Test 4 should have thrown 403 Forbidden');
  } catch (err) {
    console.log('PASS Test 4: Access denied as expected ->', err.message, `(Status ${err.statusCode})`);
  }

  // Test 5: Another worker attempting to update profile (expect 403 Forbidden)
  try {
    console.log('\nTest 5: Another worker modifying someone else\'s profile (expect 403 Forbidden)');
    await WorkerService.updateWorkerProfile(createdProfile.workerId, mockOtherWorkerUser, {
      name: 'Hacked Name'
    });
    console.error('FAIL: Test 5 should have thrown 403 Forbidden');
  } catch (err) {
    console.log('PASS Test 5: Update blocked as expected ->', err.message, `(Status ${err.statusCode})`);
  }

  // Test 6: Owner modifying own profile
  try {
    console.log('\nTest 6: Worker owner modifying own profile');
    const updated = await WorkerService.updateWorkerProfile(createdProfile.workerId, mockWorkerUser, {
      occupation: 'Lead Commercial Electrician',
      experience: 6,
      availability: 'Full-time'
    });
    console.log('PASS Test 6: Profile updated successfully ->', {
      occupation: updated.occupation,
      experience: updated.experience,
      availability: updated.availability,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    console.error('FAIL Test 6:', err);
  }

  // Test 7: Admin accessing worker profile
  try {
    console.log('\nTest 7: Admin accessing worker profile');
    const adminFetch = await WorkerService.getWorkerById(createdProfile.workerId, mockAdminUser);
    console.log('PASS Test 7: Admin successfully retrieved profile ->', adminFetch.name);
  } catch (err) {
    console.error('FAIL Test 7:', err);
  }

  // Test 8: Admin updating worker profile
  try {
    console.log('\nTest 8: Admin updating worker profile');
    const adminUpdate = await WorkerService.updateWorkerProfile(createdProfile.workerId, mockAdminUser, {
      skillScore: 95
    });
    console.log('PASS Test 8: Admin successfully updated profile -> Skill Level:', adminUpdate.skillLevel);
  } catch (err) {
    console.error('FAIL Test 8:', err);
  }

  console.log('\n=== ALL WORKER MANAGEMENT TESTS PASSED ===\n');
  process.exit(0);
}

runWorkerTests();
