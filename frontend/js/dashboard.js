/* ==========================================================================
   AI HIRING PLATFORM - DASHBOARD CONTROLLER SCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTabSwitchers();
  initCandidateFilter();
  initPostJobModal();
  initAIScoreGaugeAnimation();
});

/**
 * Tab Navigation Switcher
 */
function initTabSwitchers() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tab-container') || document;
      const targetId = btn.getAttribute('data-tab');

      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabGroup.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

/**
 * Candidate Filtering Search Bar in Employer Screening
 */
function initCandidateFilter() {
  const searchInput = document.getElementById('candidate-search-input');
  const filterSelect = document.getElementById('match-filter-select');
  const candidateCards = document.querySelectorAll('.candidate-card-item');

  function filterList() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const minMatch = filterSelect ? parseInt(filterSelect.value) || 0 : 0;

    candidateCards.forEach(card => {
      const name = card.getAttribute('data-name')?.toLowerCase() || '';
      const role = card.getAttribute('data-title')?.toLowerCase() || '';
      const matchScore = parseInt(card.getAttribute('data-match')) || 0;

      const matchesSearch = name.includes(searchTerm) || role.includes(searchTerm);
      const matchesFilter = matchScore >= minMatch;

      if (matchesSearch && matchesFilter) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterList);
  if (filterSelect) filterSelect.addEventListener('change', filterList);
}

/**
 * Post Job Form Handler
 */
function initPostJobModal() {
  const postJobForm = document.getElementById('post-job-form');
  if (!postJobForm) return;

  postJobForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('job-title')?.value;
    const department = document.getElementById('job-department')?.value;

    if (!title || !department) {
      if (window.showToast) window.showToast('Please fill required job details.', 'danger');
      return;
    }

    const btn = postJobForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Indexing Job with AI...`;

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = `Post Job & Match Candidates`;
      window.closeModal('post-job-modal');
      postJobForm.reset();

      if (window.showToast) {
        window.showToast(`Job "${title}" published! AI is matching top candidates now.`, 'success');
      }
    }, 1000);
  });
}

/**
 * Animate AI Score circular gauge on page load
 */
function initAIScoreGaugeAnimation() {
  const circles = document.querySelectorAll('.score-circle[data-score]');
  circles.forEach(circle => {
    const targetScore = parseInt(circle.getAttribute('data-score')) || 85;
    let current = 0;
    const interval = setInterval(() => {
      if (current >= targetScore) {
        current = targetScore;
        clearInterval(interval);
      } else {
        current += 1;
      }
      circle.style.setProperty('--score-pct', current);
      const numSpan = circle.querySelector('.score-number');
      if (numSpan) numSpan.textContent = `${current}%`;
    }, 15);
  });
}
