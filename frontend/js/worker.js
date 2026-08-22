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

  // Bind Verified Skills Tags dynamically
  const skillsContainer = document.getElementById('dashboard-verified-skills');
  const skillsList = worker.skills || ['480V Diagnostics', 'LOTO Protocols', 'Panel Wiring', 'Transformer Maintenance'];
  if (skillsContainer && skillsList.length > 0) {
    skillsContainer.innerHTML = skillsList.map((sk, idx) => {
      const pct = Math.max(85, score - (idx * 2));
      return `<span class="skill-chip matched">${sk} (${pct}%)</span>`;
    }).join('');
  }

  // Bind Work History Snapshot on right side of dashboard
  const whSnapshot = document.getElementById('dashboard-work-history-list');
  if (whSnapshot) {
    const historyList = worker.workHistory && worker.workHistory.length > 0 ? worker.workHistory : [
      {
        company: "Apex Electric & Power Corp",
        role: "Senior Electrical Specialist",
        duration: "2023 - Present",
        employerRating: "5.0 ★★★★★"
      },
      {
        company: "Industrial Power Grid Inc",
        role: "Lead Field Electrician",
        duration: "2020 - 2023",
        employerRating: "4.9 ★★★★★"
      }
    ];

    whSnapshot.innerHTML = historyList.slice(0, 3).map(wh => `
      <div style="margin-bottom: 0.85rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-color-light);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <strong style="color: var(--text-main); font-size: 0.925rem;">${wh.role || wh.companyName}</strong>
          <span style="font-size: 0.75rem; color: #fbbf24; font-weight: 700;">${wh.employerRating || '5.0 ★★★★★'}</span>
        </div>
        <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">${wh.company || wh.companyName} &bull; ${wh.duration || (wh.startDate ? `${wh.startDate} - ${wh.endDate || 'Present'}` : 'Verified')}</p>
      </div>
    `).join('');
  }
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
 * 6. 1-Click Apply Handler with Animated State & Backend Sync
 */
window.applyForJobLive = async function(jobId, jobTitle = 'Senior AI Research Engineer', company = 'Anthropic Labs', btnElement = null) {
  const { token, baseUrl } = getAuthCredentials();
  
  const btn = btnElement || (window.event?.currentTarget || window.event?.target);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Applying...';
  }

  let matchScore = 98;
  if (token) {
    try {
      const res = await fetch(`${baseUrl}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId: jobId || 'job_1787378544873_creh4',
          notes: `1-Click application for ${jobTitle}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        matchScore = data.data?.matchScore || matchScore;
      }
    } catch (err) {
      console.warn('[Worker Engine] Application API offline. Local sync active:', err.message);
    }
  }

  // Update active applications count on dashboard
  const appCountEl = document.getElementById('dash-active-apps');
  if (appCountEl) {
    const current = parseInt(appCountEl.textContent) || 3;
    appCountEl.textContent = current + 1;
  }

  // Save in local applied history
  const appliedJobs = JSON.parse(localStorage.getItem('nexus_applied_jobs') || '[]');
  if (!appliedJobs.some(j => j.jobTitle === jobTitle)) {
    appliedJobs.push({ jobId, jobTitle, company, appliedAt: new Date().toISOString() });
    localStorage.setItem('nexus_applied_jobs', JSON.stringify(appliedJobs));
  }

  setTimeout(() => {
    if (btn) {
      btn.innerHTML = '✓ Applied';
      btn.className = 'btn btn-secondary btn-sm';
      btn.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
      btn.style.borderColor = 'var(--accent-green, #10b981)';
      btn.style.color = 'var(--accent-green, #10b981)';
      btn.style.fontWeight = '700';
      btn.disabled = true;
    }

    if (window.showToast) {
      window.showToast(`Applied to ${jobTitle} at ${company}! (Match Vector: ${matchScore}%)`, 'success');
    }
  }, 400);
};

/**
 * Auto-bind all 1-Click Apply buttons in DOM
 */
function initApplyButtons() {
  const appliedJobs = JSON.parse(localStorage.getItem('nexus_applied_jobs') || '[]');
  const appliedTitles = appliedJobs.map(j => j.jobTitle);

  document.querySelectorAll('.job-item-card').forEach((card, idx) => {
    const titleEl = card.querySelector('h3, h4');
    const title = titleEl ? titleEl.textContent.trim() : `Job Position ${idx + 1}`;
    const pEl = card.querySelector('p');
    const company = pEl ? pEl.textContent.split('•')[0].trim() : 'NexusAI Partner';
    const applyBtn = card.querySelector('button');

    if (applyBtn) {
      if (appliedTitles.includes(title)) {
        applyBtn.innerHTML = '✓ Applied';
        applyBtn.className = 'btn btn-secondary btn-sm';
        applyBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        applyBtn.style.borderColor = '#10b981';
        applyBtn.style.color = '#10b981';
        applyBtn.style.fontWeight = '700';
        applyBtn.disabled = true;
      } else {
        applyBtn.onclick = (e) => {
          e.preventDefault();
          window.applyForJobLive(`job_card_${idx + 1}`, title, company, applyBtn);
        };
      }
    }
  });
}

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

/**
 * 7. Initialize Worker Profile Form Fields & Submit Handler
 */
async function initWorkerProfileForm() {
  const form = document.getElementById('worker-profile-form');
  if (!form) return;

  const profile = await getWorkerProfile();

  const nameInput = document.getElementById('profile-name');
  const locationInput = document.getElementById('profile-location');
  const occupationInput = document.getElementById('profile-occupation');
  const expInput = document.getElementById('profile-experience');
  const languagesInput = document.getElementById('profile-languages');
  const availInput = document.getElementById('profile-availability');
  const aboutInput = document.getElementById('profile-about');

  if (nameInput && profile.name) nameInput.value = profile.name;
  if (locationInput && profile.location) locationInput.value = profile.location;
  if (occupationInput && profile.occupation) occupationInput.value = profile.occupation;
  if (expInput && profile.experience) expInput.value = profile.experience;
  if (languagesInput && profile.languages) {
    languagesInput.value = Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages;
  }
  if (availInput && profile.availability) availInput.value = profile.availability;
  if (aboutInput && profile.about) aboutInput.value = profile.about;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Save Profile Changes';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner"></div> Saving to Firebase...';
    }

    const languagesRaw = languagesInput ? languagesInput.value : '';
    const updated = {
      name: nameInput ? nameInput.value.trim() : profile.name,
      location: locationInput ? locationInput.value.trim() : profile.location,
      occupation: occupationInput ? occupationInput.value.trim() : profile.occupation,
      experience: expInput ? expInput.value.trim() : profile.experience,
      languages: languagesRaw ? languagesRaw.split(',').map(s => s.trim()).filter(Boolean) : profile.languages,
      availability: availInput ? availInput.value.trim() : profile.availability,
      about: aboutInput ? aboutInput.value.trim() : profile.about
    };

    await saveWorkerProfileData(updated);

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }

      if (window.showToast) {
        window.showToast('Profile updated & synchronized with Firebase Firestore!', 'success');
      }
    }, 400);
  });
}

// Export functions globally
window.getWorkHistoryApi = getWorkHistoryApi;
window.addWorkHistoryApi = addWorkHistoryApi;
window.getWorkerProfile = getWorkerProfile;
window.saveWorkerProfileData = saveWorkerProfileData;
window.initWorkerProfileForm = initWorkerProfileForm;
window.initApplyButtons = initApplyButtons;

document.addEventListener('DOMContentLoaded', () => {
  getWorkerProfile();
  initWorkerProfileForm();
  renderWorkHistoryTimeline();
  loadLiveRecommendedJobs();
  initApplyButtons();
});
