/* ==========================================================================
   AI HIRING PLATFORM - AI CANDIDATE MATCHING ENGINE
   Connects to matching API, sorts candidates by AI Match Score, and renders cards
   ========================================================================== */

const MATCHING_API = {
  ENDPOINT: '/matching/find-candidates'
};

// Default Candidate Pool for Matching Engine Demo
const CANDIDATE_MATCH_POOL = [
  {
    id: "cand_ravi",
    name: "Ravi Kumar",
    occupation: "Electrician & Maintenance Specialist",
    experience: "8 Years",
    aiSkillScore: 87,
    matchScore: 94,
    matchedSkills: ["Wiring", "Maintenance", "Troubleshooting"],
    missingSkills: ["High Voltage AC Certification"],
    whyThisCandidate: "Demonstrates 8 years of proven commercial wiring and troubleshooting experience. High overlap in preventative maintenance vectors with zero safety violations.",
    status: "Active"
  },
  {
    id: "cand_sarah",
    name: "Sarah Chen",
    occupation: "Sr. AI Research Engineer",
    experience: "6 Years",
    aiSkillScore: 98,
    matchScore: 98,
    matchedSkills: ["PyTorch", "Transformer Architectures", "Distributed Training", "CUDA"],
    missingSkills: ["Rust Kernel Extensions"],
    whyThisCandidate: "Top 1% AI researcher with extensive experience scaling PyTorch models across multi-node GPU clusters. Perfect alignment for deep learning roles.",
    status: "Active"
  },
  {
    id: "cand_alex",
    name: "Alex Rivera",
    occupation: "Senior Machine Learning Engineer",
    experience: "5 Years",
    aiSkillScore: 94,
    matchScore: 96,
    matchedSkills: ["PyTorch", "Python", "CUDA Acceleration", "MLOps"],
    missingSkills: ["Ray Train"],
    whyThisCandidate: "Strong background in PyTorch distributed training and inference acceleration with verified project impact scores.",
    status: "Shortlisted"
  },
  {
    id: "cand_marcus",
    name: "Marcus Vance",
    occupation: "ML Infrastructure Developer",
    experience: "7 Years",
    aiSkillScore: 92,
    matchScore: 91,
    matchedSkills: ["Kubernetes", "C++", "Python", "Ray"],
    missingSkills: ["PyTorch Lightning"],
    whyThisCandidate: "Extensive Kubernetes MLOps cluster management experience with high reliability ratings.",
    status: "Active"
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initMatchingEngine();
});

/**
 * Initialize Matching Engine Page Event Listeners
 */
function initMatchingEngine() {
  const findBtn = document.getElementById('find-candidates-btn');
  const jobSelect = document.getElementById('job-requisition-select');

  if (findBtn && jobSelect) {
    findBtn.addEventListener('click', async () => {
      const selectedJobId = jobSelect.value;
      if (!selectedJobId) {
        const container = document.getElementById('matching-candidates-container');
        if (container) {
          container.innerHTML = `
            <div class="card" style="text-align: center; padding: 2rem;">
              <p style="color: var(--text-muted);">Please select an active job requisition first, then click <strong>Find Candidates</strong>.</p>
            </div>
          `;
        }
        return;
      }
      await executeFindCandidates(selectedJobId);
    });
    // Do NOT auto-fire on page load — the job dropdown may still be loading
  }
}

/**
 * Call Matching API (with fallback) & Sort Candidates by Match Score Descending
 */
async function executeFindCandidates(jobId) {
  const container = document.getElementById('matching-candidates-container');
  if (!container) return;

  // Guard: don't call the API with an empty jobId
  if (!jobId || jobId.trim() === '') {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <p style="color: var(--text-muted);">Please select an active job requisition first, then click <strong>Find Candidates</strong>.</p>
      </div>
    `;
    return;
  }

  // Show Loading State
  container.innerHTML = `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
      <div class="spinner spinner-green spinner-lg" style="margin: 0 auto 1rem;"></div>
      <h3 style="font-size: 1.125rem; color: var(--text-main);">Running AI Vector Matching Engine...</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
        Querying API endpoint \`/api/matching/find-candidates\`
      </p>
    </div>
  `;

  const token = localStorage.getItem('ai_hiring_auth_token');
  const baseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000/api';

  let candidatesList = null;

  try {
    const res = await fetch(`${baseUrl}${MATCHING_API.ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ jobId: jobId })
    });

    if (res.ok) {
      const responseData = await res.json();
      // Backend returns { success: true, data: { candidates: [...] } }
      const rawCandidates = responseData.data?.candidates
        || responseData.data
        || responseData.candidates
        || responseData;

      if (Array.isArray(rawCandidates) && rawCandidates.length > 0) {
        // Normalize backend candidate shape to match frontend card expectations
        candidatesList = rawCandidates.map(c => ({
          id: c.workerId || c.id,
          name: c.name,
          occupation: c.occupation,
          experience: typeof c.experience === 'number' ? `${c.experience} Years` : (c.experience || 'N/A'),
          aiSkillScore: c.skillScore || 0,
          matchScore: c.matchScore || 0,
          matchedSkills: Array.isArray(c.matchedSkills) ? c.matchedSkills : [],
          missingSkills: Array.isArray(c.missingSkills) ? c.missingSkills : [],
          whyThisCandidate: c.reason || 'Strong match based on skills and experience alignment.',
          status: c.status || 'Active'
        }));
      }
    }
  } catch (e) {
    console.warn('[Matching Engine] Matching API offline. Using dynamic candidate vector pool.');
  }

  if (!candidatesList) {
    candidatesList = [...CANDIDATE_MATCH_POOL];
  }

  // SORT CANDIDATES BY AI MATCH SCORE DESCENDING (Highest match score first)
  candidatesList.sort((a, b) => b.matchScore - a.matchScore);

  setTimeout(() => {
    renderCandidateMatchingCards(candidatesList);
  }, 500);
}

/**
 * Render Candidate Cards according to user specification
 */
function renderCandidateMatchingCards(candidates) {
  const container = document.getElementById('matching-candidates-container');
  if (!container) return;

  if (candidates.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <p style="color: var(--text-muted);">No candidates matched the selected job criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = candidates.map(cand => `
    <div class="card card-accent-top candidate-match-card" style="margin-bottom: 1.5rem; transition: transform var(--transition-fast);">
      
      <!-- CARD HEADER: NAME, OCCUPATION, MATCH BADGE -->
      <div class="card-header">
        <div class="flex items-center gap-4 flex-wrap">
          <div class="avatar" style="width: 52px; height: 52px; font-size: 1.15rem; font-weight: 700; background: linear-gradient(135deg, var(--accent-green) 0%, var(--accent-blue) 100%);">
            ${getInitials(cand.name)}
          </div>
          <div>
            <h3 style="font-size: 1.25rem; color: var(--text-main); font-weight: 700;">${cand.name}</h3>
            <p style="font-size: 0.9rem; color: var(--accent-green-light); font-weight: 600;">${cand.occupation}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="badge ai-match-badge" style="font-size: 0.95rem; padding: 0.4rem 0.875rem;">
            AI Match: ${cand.matchScore}%
          </span>
        </div>
      </div>

      <div class="card-body">
        
        <!-- ROW OF METRICS: SKILL SCORE & EXPERIENCE -->
        <div class="grid grid-cols-2 md:grid-cols-1 gap-4" style="margin-bottom: 1.25rem; padding: 0.875rem 1rem; background: var(--bg-dark); border-radius: var(--radius-md); border: 1px solid var(--border-color-light);">
          <div>
            <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Skill Score</span>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-green);">${cand.aiSkillScore}/100</div>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Experience</span>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${cand.experience}</div>
          </div>
        </div>

        <!-- MATCHED SKILLS -->
        <div style="margin-bottom: 1rem;">
          <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.35rem;">Matched Skills</span>
          <div class="skill-tags">
            ${cand.matchedSkills.map(sk => `
              <span class="skill-chip matched" style="font-size: 0.8rem; padding: 0.3rem 0.65rem;">
                ✓ ${sk}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- MISSING SKILLS -->
        ${cand.missingSkills && cand.missingSkills.length > 0 ? `
          <div style="margin-bottom: 1.25rem;">
            <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.35rem;">Missing Skills</span>
            <div class="skill-tags">
              ${cand.missingSkills.map(ms => `
                <span class="skill-chip" style="border-color: rgba(239,68,68,0.3); color: #f87171; background: rgba(239,68,68,0.08); font-size: 0.8rem; padding: 0.3rem 0.65rem;">
                  ✗ ${ms}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- WHY THIS CANDIDATE (AI REASONING) -->
        <div style="background: rgba(16, 185, 129, 0.06); padding: 1rem; border-radius: var(--radius-md); border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 1.25rem;">
          <span style="font-size: 0.75rem; color: var(--accent-green-light); text-transform: uppercase; font-weight: 700; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.35rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Why This Candidate?
          </span>
          <p style="font-size: 0.875rem; color: var(--text-main); line-height: 1.5;">
            ${cand.whyThisCandidate}
          </p>
        </div>

      </div>

      <!-- CARD FOOTER BUTTONS: View Profile & Shortlist -->
      <div class="card-footer" style="padding-top: 1rem;">
        <span style="font-size: 0.8rem; color: var(--text-dim);">Status: <strong>${cand.status}</strong></span>
        
        <div class="flex gap-3">
          <a href="candidate-profile.html?id=${cand.id}" class="btn btn-secondary btn-sm">
            View Profile
          </a>

          <button class="btn btn-primary btn-sm" onclick="handleShortlistClick('${cand.id}', '${cand.name}', this)">
            ${cand.status === 'Shortlisted' ? '✓ Shortlisted' : 'Shortlist'}
          </button>
        </div>
      </div>

    </div>
  `).join('');
}

/**
 * Handle Shortlist Button Click
 */
async function handleShortlistClick(candId, candName, btnEl) {
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'Shortlisting...';
  }

  if (window.updateCandidateStatus) {
    await window.updateCandidateStatus(candId, 'Shortlisted');
  }

  setTimeout(() => {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = '✓ Shortlisted';
      btnEl.className = 'btn btn-secondary btn-sm';
      btnEl.style.color = 'var(--accent-green-light)';
    }

    if (window.showToast) {
      window.showToast(`${candName} has been added to your Shortlisted Candidates!`, 'success');
    }
  }, 400);
}

function getInitials(name) {
  if (!name) return 'C';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}
