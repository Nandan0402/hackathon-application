/* ==========================================================================
   AI HIRING PLATFORM - MAIN GLOBAL SCRIPT
   ========================================================================== */

// Global API Base URL Resolution for all dashboard pages
(function initGlobalApiConfig() {
  const hostname = window.location.hostname || '';
  const port = window.location.port || '';

  let baseUrl = '/api';
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    port === '5500' ||
    port === '5501' ||
    port === '3000' ||
    port === '8080' ||
    window.location.protocol === 'file:'
  ) {
    baseUrl = 'http://localhost:5000/api';
  }

  window.API_CONFIG = window.API_CONFIG || {
    BASE_URL: baseUrl,
    ENDPOINTS: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      GOOGLE: '/auth/google',
      ME: '/auth/profile'
    },
    ENABLE_MOCK_FALLBACK: true
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  initToastSystem();
  initModalListeners();
  setActiveNavLink();
  initMockSession();
});

/**
 * Handles sidebar collapse and mobile drawer toggle
 */
function initSidebarToggle() {
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  const mobileNavToggle = document.getElementById('mobile-nav-toggle');

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      localStorage.setItem('ai_hiring_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    });

    // Restore saved state
    if (localStorage.getItem('ai_hiring_sidebar_collapsed') === 'true') {
      document.body.classList.add('sidebar-collapsed');
    }
  }

  if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-mobile-open');
    });
  }
}

/**
 * Toast Notification System
 * Usage: window.showToast('Message', 'success' | 'danger' | 'warning' | 'info')
 */
function initToastSystem() {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  window.showToast = function (message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast alert-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === 'danger') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span style="flex:1; font-size: 0.875rem; font-weight: 500;">${message}</span>
      <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  };
}

/**
 * Modal Opener & Closer Helpers
 */
function initModalListeners() {
  document.querySelectorAll('[data-modal-target]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const targetId = trigger.getAttribute('data-modal-target');
      window.openModal(targetId);
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach(closer => {
    closer.addEventListener('click', () => {
      const modalBackdrop = closer.closest('.modal-backdrop');
      if (modalBackdrop) {
        window.closeModal(modalBackdrop.id);
      }
    });
  });

  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  };
}

/**
 * Highlight active navbar / sidebar link based on current location
 */
function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-link, .sidebar-link');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPath || href.endsWith(currentPath))) {
      link.classList.add('active');
    }
  });
}

/**
 * Mock User Session Manager
 */
function initMockSession() {
  const userRole = localStorage.getItem('ai_hiring_role') || 'worker';
  const userName = localStorage.getItem('ai_hiring_user_name') || (userRole === 'admin' ? 'System Admin' : userRole === 'employer' ? 'Tech Corp Recruiting' : 'Alex Rivera');
  
  // Populate user info elements if present
  const userNameElements = document.querySelectorAll('.user-name-display');
  userNameElements.forEach(el => el.textContent = userName);
}
