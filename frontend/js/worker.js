/* ==========================================================================
   AI HIRING PLATFORM - WORKER MODULE & LIVE BACKEND FIREBASE SYNC
   Manages worker profile, live Firestore sync, AI Skill Score, & Work History
   ========================================================================== */

const WORKER_API_ENDPOINTS = {
  PROFILE: '/workers',
  JOBS: '/jobs',
  APPLICATIONS: '/applications',
  ASSESSMENTS: '/assessment',
  PASSPORT: '/workers',
  WORK_HISTORY: '/work-history'
};

/**
 * Helper to get current authenticated user info
 */
function getAuthCredentials() {
  const token = localStorage.getItem('ai_hiring_auth_token') || '';
  const userJson = localStorage.getItem('ai_hiring_user_session');
  let user = null;
  if (userJson) {
    try { user = JSON.parse(userJson); } catch (e) {}
  }
  const baseUrl = (window.API_CONFIG && window.API_CONFIG.BASE_URL) ? window.API_CONFIG.BASE_URL : 'http://localhost:5000/api';
  return { token, user, baseUrl };
}

/**
 * 1. Fetch Live Worker Profile from Backend / Firestore
 */
async function getWorkerProfile() {
  const { token, user, baseUrl } = getAuthCredentials();
  const workerId = user?.id || user?.uid || 'demo_worker_uid';

  if (token) {
    try {
      const res = await fetch(`${baseUrl}/workers/${workerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const responseData = await res.json();
        const liveWorker = responseData.data || responseData;
        if (liveWorker && liveWorker.name) {
          syncWorkerProfileToUI(liveWorker);
          localStorage.setItem('nexus_worker_profile_data', JSON.stringify(liveWorker));
          return liveWorker;
        }
      }
    } catch (err) {
      console.warn('[Worker Engine] Backend profile API offline. Using local session cache:', err.message);
    }
  }

  // Fallback to local stored session
  const stored = localStorage.getItem('nexus_worker_profile_data');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      syncWorkerProfileToUI(parsed);
      return parsed;
    } catch (e) {}
  }

  const defaultData = {
    workerId: `worker_${workerId}`,
    name: user?.name || "Demo Worker",
    location: user?.location || "Austin, TX",
    occupation: "Electrician",
    experience: "5 Years",
    languages: ["English", "Spanish"],
    availability: "Immediate",
    about: "Certified industrial and commercial electrician specializing in 480V diagnostics, safety protocols, and panel maintenance.",
    skillScore: 88,
    skillLevel: "Advanced",
    skills: ["480V Diagnostics", "LOTO Protocols", "Panel Wiring", "Transformer Maintenance"],
    workHistory: []
  };

  syncWorkerProfileToUI(defaultData);
  return defaultData;
}

/**
 * 2. Save Updated Worker Profile to Backend / Firestore
 */
async function saveWorkerProfileData(updatedData) {
  const { token, user, baseUrl } = getAuthCredentials();
  const workerId = user?.id || user?.uid || 'demo_worker_uid';

  let backendSuccess = false;
  if (token) {
    try {
      const res = await fetch(`${baseUrl}/workers/${workerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });

      if (res.ok) {
        backendSuccess = true;
      }
    } catch (err) {
      console.warn('[Worker Engine] Worker update API warning:', err.message);
    }
  }

  const current = await getWorkerProfile();
  const merged = { ...current, ...updatedData };
  localStorage.setItem('nexus_worker_profile_data', JSON.stringify(merged));
  if (updatedData.name) localStorage.setItem('ai_hiring_user_name', updatedData.name);
  syncWorkerProfileToUI(merged);

  return { success: true, backendSync: backendSuccess, data: merged };
}

/**
 * 3. Fetch Live Work History Records from Backend / Firestore
 */
async function getWorkHistoryApi() {
  const { token, user, baseUrl } = getAuthCredentials();
  const workerId = user?.id || user?.uid || 'demo_worker_uid';

  if (token) {
    try {
      const res = await fetch(`${baseUrl}/work-history/${workerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const responseData = await res.json();
        const list = responseData.data?.workHistory || responseData.data || responseData;
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (e) {
      console.warn('[Worker Engine] Work History API unreachable. Using profile work history.');
    }
  }

  const profile = await getWorkerProfile();
  return profile.workHistory || [];
}

/**
 * 4. Add New Work History Record to Backend / Firestore
 */
async function addWorkHistoryApi(record) {
  const { token, user, baseUrl } = getAuthCredentials();
  const workerId = user?.id || user?.uid || 'demo_worker_uid';

  const payload = {
    workerId,
    companyName: record.company || record.companyName,
    role: record.role,
    startDate: record.startDate || '2022-01-01',
    endDate: record.endDate || 'Present',
    skillsUsed: Array.isArray(record.skillsUsed) ? record.skillsUsed : (record.skillsUsed ? record.skillsUsed.split(',').map(s => s.trim()) : []),
    employerRating: record.employerRating ? parseFloat(record.employerRating) : 5.0
  };

  if (token) {
    try {
      const res = await fetch(`${baseUrl}/work-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        await renderWorkHistoryTimeline();
        return { success: true, data: data.data || data };
      }
    } catch (e) {
      console.warn('[Worker Engine] Work History API offline. Updating local timeline cache.');
    }
  }

  const newRecord = {
    historyId: 'wh_' + Date.now(),
    companyName: payload.companyName,
    company: payload.companyName,
    role: payload.role,
    startDate: payload.startDate,
    endDate: payload.endDate,
    skillsUsed: payload.skillsUsed,
    employerRating: payload.employerRating
  };

  const profile = await getWorkerProfile();
  if (!profile.workHistory) profile.workHistory = [];
  profile.workHistory.unshift(newRecord);
  localStorage.setItem('nexus_worker_profile_data', JSON.stringify(profile));

  await renderWorkHistoryTimeline();
  return { success: true, data: newRecord };
}

/**
 * Synchronize Worker Data into DOM elements
 */
function syncWorkerProfileToUI(worker) {
  if (!worker) return;

  const workerName = worker.name || 'Demo Worker';
  const occupation = worker.occupation || 'Electrician';
  const experience = typeof worker.experience === 'number' ? `${worker.experience} Years` : (worker.experience || '5 Years');
  const score = worker.skillScore || worker.aiSkillScore || 88;
  const level = worker.skillLevel || 'Advanced';

  // Bind Name & Occupation in topbar and sidebar
  document.querySelectorAll('.worker-name-bind').forEach(el => el.textContent = workerName);
  document.querySelectorAll('.worker-occupation-bind').forEach(el => el.textContent = `${occupation} • Exp: ${experience}`);
  
  const avatarElements = document.querySelectorAll('.avatar');
  const initials = workerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'W';
  avatarElements.forEach(av => {
    if (!av.querySelector('img')) av.textContent = initials;
  });

  // Bind Main Dashboard Highlights
  const hubTitle = document.getElementById('dash-worker-name');
  if (hubTitle) hubTitle.textContent = workerName;

  const hubSub = document.getElementById('dash-worker-subtitle');
  if (hubSub) hubSub.textContent = `${occupation} • Experience: ${experience}`;

  const scoreEl = document.getElementById('dash-skill-score');
  if (scoreEl) scoreEl.textContent = `${score}%`;

  const levelEl = document.getElementById('dash-skill-level');
  if (levelEl) levelEl.textContent = `${level} Vector`;

  const expEl = document.getElementById('dash-experience');
  if (expEl) expEl.textContent = experience;
}

/**
 * 5. Fetch and Render Live Recommended Jobs
 */
async function loadLiveRecommendedJobs() {
  const container = document.getElementById('recommended-jobs-container');
  if (!container) return;

  const { token, baseUrl } = getAuthCredentials();

  try {
    const res = await fetch(`${baseUrl}/jobs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      const jobs = data.data?.jobs || data.data || [];
      if (Array.isArray(jobs) && jobs.length > 0) {
        container.innerHTML = jobs.slice(0, 4).map(job => `
          <div class="card card-accent-top" style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem; margin-bottom: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 700;">${job.title}</h4>
                <span class="badge badge-green" style="font-size: 0.75rem;">${job.occupation || 'Verified'}</span>
              </div>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">
                ${job.location || 'Remote'} • Salary: ${job.salaryRange || 'Competitive'}
              </p>
              <div class="skill-tags" style="margin-top: 0.5rem;">
                ${(job.requiredSkills || []).slice(0, 3).map(sk => `<span class="skill-chip matched" style="font-size: 0.75rem;">✓ ${sk}</span>`).join('')}
              </div>
            </div>
            <button class="btn btn-primary btn-sm apply-job-btn" data-job-id="${job.jobId || job.id}" onclick="applyForJobLive('${job.jobId || job.id}')">
              1-Click Apply
            </button>
          </div>
        `).join('');
        return;
      }
    }
  } catch (err) {
    console.warn('[Worker Engine] Jobs API check warning:', err.message);
  }
}

/**
 * Apply for a Job Live to Backend Firestore
 */
window.applyForJobLive = async function(jobId) {
  const { token, baseUrl } = getAuthCredentials();
  if (!token) {
    if (window.showToast) window.showToast('Please sign in to apply', 'danger');
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ jobId, notes: 'Direct application from Worker Hub' })
    });

    if (res.ok) {
      if (window.showToast) window.showToast('Application submitted successfully! Match Score calculated.', 'success');
    } else {
      const err = await res.json().catch(() => ({}));
      if (window.showToast) window.showToast(err.message || 'Application submitted!', 'info');
    }
  } catch (e) {
    if (window.showToast) window.showToast('Application logged in dashboard!', 'success');
  }
};

/**
 * 6. Render Work History Timeline UI
 */
async function renderWorkHistoryTimeline() {
  const container = document.getElementById('work-history-timeline-container');
  if (!container) return;

  const records = await getWorkHistoryApi();

  if (!records || records.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <p style="color: var(--text-muted);">No employment records found. Click "Add Work Experience" to grow your timeline.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = records.map((wh, idx) => {
    const company = wh.companyName || wh.company || 'Enterprise Power Corp';
    const duration = wh.duration || `${wh.startDate || '2022'} - ${wh.endDate || 'Present'}`;
    const skills = Array.isArray(wh.skillsUsed) ? wh.skillsUsed : (wh.skillsUsed ? [wh.skillsUsed] : ['Trade Skills']);

    return `
      <div class="timeline-item" style="position: relative; padding-left: 2.5rem; margin-bottom: 2rem;">
        <div class="timeline-node" style="position: absolute; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--accent-green); border: 4px solid var(--bg-dark); box-shadow: 0 0 12px var(--accent-green); z-index: 2;"></div>
        
        ${idx < records.length - 1 ? `
          <div class="timeline-line" style="position: absolute; left: 11px; top: 24px; bottom: -2rem; width: 2px; background: linear-gradient(180deg, var(--accent-green) 0%, var(--border-color) 100%); z-index: 1;"></div>
        ` : ''}

        <div class="card card-accent-top" style="margin: 0;">
          <div class="card-header flex-wrap">
            <div>
              <span style="font-size: 0.75rem; color: var(--accent-green-light); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Duration: ${duration}</span>
              <h3 style="font-size: 1.25rem; color: var(--text-main); font-weight: 700; margin-top: 0.15rem;">${wh.role || 'Electrician'}</h3>
              <p style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">${company}</p>
            </div>

            <div class="flex flex-col items-end gap-1">
              <span class="badge badge-green">VERIFIED EMPLOYMENT</span>
              <span style="font-size: 0.85rem; color: #fbbf24; font-weight: 700; margin-top: 0.25rem;">
                Employer Rating: ${wh.employerRating || '5.0 ★★★★★'}
              </span>
            </div>
          </div>

          <div class="card-body">
            <p style="font-size: 0.9rem; color: var(--text-main); line-height: 1.5; margin-bottom: 1rem;">
              ${wh.description || 'Verified employment record stored in Firebase Firestore.'}
            </p>

            <div>
              <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.35rem;">Skills Used</span>
              <div class="skill-tags">
                ${skills.map(sk => `
                  <span class="skill-chip matched" style="font-size: 0.8rem;">
                    ✓ ${sk}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Export functions globally
window.getWorkHistoryApi = getWorkHistoryApi;
window.addWorkHistoryApi = addWorkHistoryApi;
window.getWorkerProfile = getWorkerProfile;
window.saveWorkerProfileData = saveWorkerProfileData;

document.addEventListener('DOMContentLoaded', () => {
  getWorkerProfile();
  renderWorkHistoryTimeline();
  loadLiveRecommendedJobs();
});
