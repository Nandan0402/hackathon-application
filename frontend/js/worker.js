/* ==========================================================================
   AI HIRING PLATFORM - WORKER MODULE & WORK HISTORY ENGINE
   Manages worker profile, skill scores, work history API calls, & timeline growth
   ========================================================================== */

const WORKER_API_ENDPOINTS = {
  PROFILE: '/worker/profile',
  DASHBOARD: '/worker/dashboard',
  JOBS: '/worker/jobs',
  APPLICATIONS: '/worker/applications',
  ASSESSMENTS: '/worker/assessments',
  PASSPORT: '/worker/passport',
  WORK_HISTORY: '/worker/work-history'
};

// Default initial data for worker
const DEFAULT_WORKER_DATA = {
  name: "Alex Rivera",
  location: "San Francisco, CA",
  occupation: "Senior AI & Machine Learning Engineer",
  experience: "5 Years",
  languages: ["English (Native)", "Spanish (Fluent)", "Python (Expert)"],
  availability: "Immediately (2 Weeks Notice)",
  about: "Passionate AI engineer specializing in PyTorch deep learning architectures, transformer fine-tuning, and CUDA inference acceleration. Proven track record scaling LLM serving pipelines in cloud environments.",
  aiSkillScore: 94,
  skillLevel: "Senior / Expert Vector",
  verifiedSkills: [
    { name: "PyTorch", level: "Expert", score: 96, verified: true },
    { name: "Distributed Training", level: "Advanced", score: 94, verified: true },
    { name: "Python / C++", level: "Expert", score: 98, verified: true },
    { name: "CUDA Acceleration", level: "Advanced", score: 90, verified: true },
    { name: "Kubernetes & MLOps", level: "Intermediate", score: 86, verified: true },
    { name: "Transformer LLMs", level: "Expert", score: 95, verified: true }
  ],
  workHistory: [
    {
      id: "wh_1",
      company: "NeuralFlow Systems",
      role: "Lead Machine Learning Engineer",
      duration: "2023 - Present (3 Years)",
      skillsUsed: ["PyTorch", "Kubernetes", "CUDA", "LLMs"],
      employerRating: "5.0 / 5.0 ★★★★★",
      description: "Architected distributed LLM inference cluster reducing latency by 42%. Managed 6 ML engineers.",
      verified: true
    },
    {
      id: "wh_2",
      company: "Commercial Power & Automation",
      role: "Senior Electrical & Systems Engineer",
      duration: "2020 - 2023 (3 Years)",
      skillsUsed: ["Wiring", "Troubleshooting", "Maintenance", "Safety"],
      employerRating: "4.9 / 5.0 ★★★★★",
      description: "Overseeing industrial commercial wiring, preventive maintenance, and system troubleshooting.",
      verified: true
    },
    {
      id: "wh_3",
      company: "DataScale Inc.",
      role: "AI Software Engineer",
      duration: "2018 - 2020 (2 Years)",
      skillsUsed: ["Python", "Apache Spark", "Ray", "Distributed Computing"],
      employerRating: "4.8 / 5.0 ★★★★☆",
      description: "Trained recommendation engine processing 10M+ daily events using PyTorch & Spark.",
      verified: true
    }
  ],
  applications: [
    {
      id: "app_101",
      jobTitle: "Senior AI Research Engineer",
      company: "Anthropic Labs",
      appliedDate: "Aug 18, 2026",
      matchScore: 98,
      status: "Interview Scheduled",
      stage: "Technical Interview (Aug 24)"
    },
    {
      id: "app_102",
      jobTitle: "Lead MLOps Architect",
      company: "DataScale Enterprise",
      appliedDate: "Aug 12, 2026",
      matchScore: 94,
      status: "Under Review",
      stage: "AI Resume Screening Passed"
    }
  ]
};

/**
 * Fetch Work History Records from API (or storage)
 */
async function getWorkHistoryApi() {
  const token = localStorage.getItem('ai_hiring_auth_token');
  const baseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';

  try {
    const res = await fetch(`${baseUrl}${WORKER_API_ENDPOINTS.WORK_HISTORY}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn('[Worker Engine] Work History API unreachable. Using persistent worker profile store.');
  }

  const profile = await getWorkerProfile();
  return profile.workHistory || DEFAULT_WORKER_DATA.workHistory;
}

/**
 * Add New Work History Record via API
 */
async function addWorkHistoryApi(record) {
  const token = localStorage.getItem('ai_hiring_auth_token');
  const baseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';

  try {
    const res = await fetch(`${baseUrl}${WORKER_API_ENDPOINTS.WORK_HISTORY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(record)
    });

    if (res.ok) {
      const created = await res.json();
      await updateLocalWorkHistory(created);
      return { success: true, data: created };
    }
  } catch (e) {
    console.warn('[Worker Engine] Work History API offline. Updating local timeline.');
  }

  const newRecord = {
    id: 'wh_' + Date.now(),
    company: record.company,
    role: record.role,
    duration: record.duration,
    skillsUsed: Array.isArray(record.skillsUsed) ? record.skillsUsed : record.skillsUsed.split(',').map(s => s.trim()),
    employerRating: record.employerRating || "5.0 / 5.0 ★★★★★",
    description: record.description || "Verified work experience entry.",
    verified: true
  };

  await updateLocalWorkHistory(newRecord);
  return { success: true, data: newRecord };
}

/**
 * Save new record into persistent local profile
 */
async function updateLocalWorkHistory(newRecord) {
  const profile = await getWorkerProfile();
  if (!profile.workHistory) profile.workHistory = [];
  profile.workHistory.unshift(newRecord);
  
  // Calculate total experience
  profile.experience = `${profile.workHistory.length * 2.5} Years`;

  localStorage.setItem('nexus_worker_profile_data', JSON.stringify(profile));
}

/**
 * Fetch worker profile data
 */
async function getWorkerProfile() {
  const stored = localStorage.getItem('nexus_worker_profile_data');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }

  localStorage.setItem('nexus_worker_profile_data', JSON.stringify(DEFAULT_WORKER_DATA));
  return DEFAULT_WORKER_DATA;
}

/**
 * Save updated worker profile data
 */
async function saveWorkerProfileData(updatedData) {
  const current = await getWorkerProfile();
  const merged = { ...current, ...updatedData };
  localStorage.setItem('nexus_worker_profile_data', JSON.stringify(merged));
  
  if (updatedData.name) localStorage.setItem('ai_hiring_user_name', updatedData.name);
  return { success: true, data: merged };
}

/**
 * Render Work History Timeline UI
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

  container.innerHTML = records.map((wh, idx) => `
    <div class="timeline-item" style="position: relative; padding-left: 2.5rem; margin-bottom: 2rem;">
      
      <!-- TIMELINE NODE CONNECTOR -->
      <div class="timeline-node" style="position: absolute; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--accent-green); border: 4px solid var(--bg-dark); box-shadow: 0 0 12px var(--accent-green); z-index: 2;"></div>
      
      ${idx < records.length - 1 ? `
        <div class="timeline-line" style="position: absolute; left: 11px; top: 24px; bottom: -2rem; width: 2px; background: linear-gradient(180deg, var(--accent-green) 0%, var(--border-color) 100%); z-index: 1;"></div>
      ` : ''}

      <div class="card card-accent-top" style="margin: 0;">
        <div class="card-header flex-wrap">
          <div>
            <span style="font-size: 0.75rem; color: var(--accent-green-light); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Duration: ${wh.duration}</span>
            <h3 style="font-size: 1.25rem; color: var(--text-main); font-weight: 700; margin-top: 0.15rem;">${wh.role}</h3>
            <p style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">${wh.company}</p>
          </div>

          <div class="flex flex-col items-end gap-1">
            <span class="badge badge-green">VERIFIED EMPLOYMENT</span>
            <span style="font-size: 0.85rem; color: #fbbf24; font-weight: 700; margin-top: 0.25rem;">
              Employer Rating: ${wh.employerRating || '5.0 / 5.0 ★★★★★'}
            </span>
          </div>
        </div>

        <div class="card-body">
          <p style="font-size: 0.9rem; color: var(--text-main); line-height: 1.5; margin-bottom: 1rem;">
            ${wh.description || 'Verified work experience record.'}
          </p>

          <div>
            <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.35rem;">Skills Used</span>
            <div class="skill-tags">
              ${(Array.isArray(wh.skillsUsed) ? wh.skillsUsed : [wh.skillsUsed]).map(sk => `
                <span class="skill-chip matched" style="font-size: 0.8rem;">
                  ✓ ${sk}
                </span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

    </div>
  `).join('');
}

// Export functions globally
window.getWorkHistoryApi = getWorkHistoryApi;
window.addWorkHistoryApi = addWorkHistoryApi;
window.getWorkerProfile = getWorkerProfile;
window.saveWorkerProfileData = saveWorkerProfileData;

document.addEventListener('DOMContentLoaded', () => {
  renderWorkHistoryTimeline();
});
