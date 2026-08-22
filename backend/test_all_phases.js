const baseUrl = 'http://localhost:5000/api';

async function runAllPhaseTests() {
  console.log('\n==================================================');
  console.log('PHASE 17 — END-TO-END REST API VERIFICATION SUITE');
  console.log('==================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  async function testApi(name, fn) {
    try {
      await fn();
      console.log(`✓ PASS: ${name}`);
      passedCount++;
    } catch (e) {
      console.error(`✗ FAIL: ${name} -> ${e.message}`);
      failedCount++;
    }
  }

  // 1. GET /api/health
  await testApi('1. GET /api/health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Health check failed');
  });

  // 2. POST /api/auth/login (Demo Worker)
  let workerToken = '';
  let workerUid = '';
  await testApi('2. POST /api/auth/login (Worker)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'worker.demo@hackathon.local', password: 'Worker@12345' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');
    workerToken = data.data.token;
    workerUid = data.data.user.uid;
  });

  // 3. POST /api/auth/login (Demo Employer)
  let employerToken = '';
  await testApi('3. POST /api/auth/login (Employer)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employer.demo@hackathon.local', password: 'Employer@12345' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');
    employerToken = data.data.token;
  });

  // 4. POST /api/auth/login (Demo Admin)
  let adminToken = '';
  await testApi('4. POST /api/auth/login (Admin)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.demo@hackathon.local', password: 'Admin@12345' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');
    adminToken = data.data.token;
  });

  // 5. POST /api/workers (Create/Update Worker Profile)
  let createdWorkerId = 'demo_worker_uid';
  await testApi('5. POST /api/workers (Create/Update Worker Profile)', async () => {
    let res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      },
      body: JSON.stringify({
        name: 'Ravi Kumar',
        occupation: 'Electrician',
        experience: 8,
        location: 'San Francisco, CA',
        skills: ['Wiring', 'Troubleshooting', 'Maintenance', 'Safety'],
        skillScore: 87,
        skillLevel: 'Advanced'
      })
    });

    let data = await res.json();
    if (!res.ok) {
      // Profile exists, update instead
      res = await fetch(`${baseUrl}/workers/${createdWorkerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${workerToken}`
        },
        body: JSON.stringify({
          name: 'Ravi Kumar',
          occupation: 'Electrician',
          experience: 8,
          location: 'San Francisco, CA',
          skills: ['Wiring', 'Troubleshooting', 'Maintenance', 'Safety']
        })
      });
      data = await res.json();
    }

    if (!res.ok || !data.success) throw new Error(data.message || 'Worker profile creation/update failed');
    createdWorkerId = data.data.workerId || data.data.id || createdWorkerId;
  });

  // 6. GET /api/workers/:id
  await testApi('6. GET /api/workers/:id', async () => {
    const res = await fetch(`${baseUrl}/workers/${createdWorkerId}`, {
      headers: { 'Authorization': `Bearer ${workerToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Fetch worker failed');
  });

  // 7. POST /api/assessment/questions
  await testApi('7. POST /api/assessment/questions', async () => {
    const res = await fetch(`${baseUrl}/assessment/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      },
      body: JSON.stringify({ occupation: 'Electrician', experienceYears: 5 })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Generate questions failed');
  });

  // 8. POST /api/assessment/submit
  await testApi('8. POST /api/assessment/submit', async () => {
    const res = await fetch(`${baseUrl}/assessment/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      },
      body: JSON.stringify({
        occupation: 'Electrician',
        answers: [
          { questionId: 1, answer: 'Follow Lockout/Tagout (LOTO) protocols and verify zero energy with multimeter.' },
          { questionId: 2, answer: 'Use clamp meter to check current imbalance and ground fault isolation.' }
        ]
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Submit assessment failed');
  });

  // 9. POST /api/jobs (Create Job)
  let createdJobId = '';
  await testApi('9. POST /api/jobs (Create Job Requisition)', async () => {
    const res = await fetch(`${baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employerToken}`
      },
      body: JSON.stringify({
        title: 'Lead Commercial Electrician',
        occupation: 'Electrician',
        location: 'San Francisco, CA',
        minimumExperience: 5,
        requiredSkills: ['Wiring', 'Troubleshooting', 'Maintenance'],
        description: 'Overseeing commercial wiring and emergency troubleshooting.',
        salaryRange: '$90,000 - $120,000'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Create job failed');
    createdJobId = data.data.jobId || data.data.id;
  });

  // 10. GET /api/jobs
  await testApi('10. GET /api/jobs (List Jobs)', async () => {
    const res = await fetch(`${baseUrl}/jobs`, {
      headers: { 'Authorization': `Bearer ${employerToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'List jobs failed');
  });

  // 11. GET /api/jobs/:jobId/candidates (AI Candidate Matching)
  await testApi('11. GET /api/jobs/:jobId/candidates (AI Candidate Matching)', async () => {
    const res = await fetch(`${baseUrl}/jobs/${createdJobId}/candidates`, {
      headers: { 'Authorization': `Bearer ${employerToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Candidate matching failed');
  });

  // 12. POST /api/applications (Create Application)
  let createdAppId = '';
  await testApi('12. POST /api/applications (Submit Application)', async () => {
    const res = await fetch(`${baseUrl}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      },
      body: JSON.stringify({
        jobId: createdJobId,
        matchScore: 94,
        matchedSkills: ['Wiring', 'Maintenance'],
        missingSkills: ['SCADA']
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Submit application failed');
    createdAppId = data.data.applicationId || data.data.id;
  });

  // 13. POST /api/hire (Hire Candidate)
  await testApi('13. POST /api/hire (Confirm Candidate Hire)', async () => {
    const res = await fetch(`${baseUrl}/hire`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employerToken}`
      },
      body: JSON.stringify({
        jobId: createdJobId,
        workerId: createdWorkerId,
        applicationId: createdAppId
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Hire candidate failed');
  });

  // 14. GET /api/work-history/:workerId
  await testApi('14. GET /api/work-history/:workerId', async () => {
    const res = await fetch(`${baseUrl}/work-history/${createdWorkerId}`, {
      headers: { 'Authorization': `Bearer ${workerToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Fetch work history failed');
  });

  // 15. GET /api/admin/analytics
  await testApi('15. GET /api/admin/analytics', async () => {
    const res = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Admin analytics failed');
  });

  console.log('\n==================================================');
  console.log(`TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('==================================================\n');
}

runAllPhaseTests();
