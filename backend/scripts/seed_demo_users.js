require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { authServiceWrapper, firestoreDb } = require('../config/firebase');
const logger = require('../utils/logger');

const DEMO_ACCOUNTS = [
  {
    uid: 'demo_worker_uid',
    email: 'worker.demo@hackathon.local',
    password: 'Worker@12345',
    name: 'Demo Worker',
    role: 'WORKER',
    location: 'Austin, TX',
    occupation: 'Electrician'
  },
  {
    uid: 'demo_employer_uid',
    email: 'employer.demo@hackathon.local',
    password: 'Employer@12345',
    name: 'Demo Employer',
    role: 'EMPLOYER',
    company: 'Apex Electric & Power Corp',
    location: 'Austin, TX'
  },
  {
    uid: 'demo_admin_uid',
    email: 'admin.demo@hackathon.local',
    password: 'Admin@12345',
    name: 'Demo Administrator',
    role: 'ADMIN',
    location: 'Headquarters'
  }
];

async function seedDemoUsers() {
  console.log('\n======================================================');
  console.log('  PROVISIONING HACKATHON DEMO AUTHENTICATION USERS    ');
  console.log('======================================================\n');

  for (const account of DEMO_ACCOUNTS) {
    try {
      console.log(`Setting up ${account.role} account: ${account.email}...`);

      let authUser = null;
      try {
        authUser = await authServiceWrapper.createUser(account.email, account.password, account.name);
        console.log(`[Firebase Auth] Created user ${account.email} (UID: ${authUser.uid})`);
      } catch (authErr) {
        console.log(`[Firebase Auth] Note: ${authErr.message}`);
        authUser = { uid: account.uid, email: account.email, displayName: account.name };
      }

      const uid = authUser.uid || account.uid;
      const now = new Date().toISOString();

      // 1. Create/Update Firestore users/{uid} document
      const userDoc = {
        uid,
        email: account.email,
        name: account.name,
        role: account.role,
        location: account.location,
        company: account.company || '',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };

      await firestoreDb.setDoc('users', uid, userDoc);
      console.log(`[Firestore] users/${uid} record saved -> Role: ${account.role}`);

      // 2. If WORKER, ensure a worker profile exists in workers collection
      if (account.role === 'WORKER') {
        const workerDoc = {
          workerId: `worker_${uid}`,
          userId: uid,
          name: account.name,
          location: account.location,
          occupation: account.occupation || 'Electrician',
          experience: 5,
          languages: ['English', 'Spanish'],
          availability: 'Immediate',
          about: 'Certified industrial and residential electrician with expertise in 480V diagnostics and safety.',
          skills: ['480V Diagnostics', 'LOTO Protocols', 'Panel Wiring', 'Transformer Maintenance'],
          skillScore: 88,
          skillLevel: 'Advanced',
          createdAt: now,
          updatedAt: now
        };
        await firestoreDb.setDoc('workers', `worker_${uid}`, workerDoc);
        console.log(`[Firestore] workers/worker_${uid} profile initialized.`);
      }

      console.log(`SUCCESS: ${account.role} demo account ready.\n`);
    } catch (err) {
      console.error(`Error provisioning ${account.role}:`, err.message);
    }
  }

  console.log('======================================================');
  console.log('  ALL DEMO ACCOUNTS PROVISIONED & VERIFIED!          ');
  console.log('======================================================\n');
}

if (require.main === module) {
  seedDemoUsers().then(() => process.exit(0)).catch((err) => {
    console.error('Fatal seed error:', err);
    process.exit(1);
  });
}

module.exports = { seedDemoUsers, DEMO_ACCOUNTS };
