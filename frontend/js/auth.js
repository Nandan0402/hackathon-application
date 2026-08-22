/* ==========================================================================
   AI HIRING PLATFORM - COMPLETE AUTHENTICATION & SECURITY ENGINE
   Ready for backend REST API consumption + Fallback Mock Session Engine
   ========================================================================== */

/**
 * Robust Backend API Base URL Resolver
 */
function getApiBaseUrl() {
  const hostname = window.location.hostname || '';
  const port = window.location.port || '';

  // Detect local development environments (Live Server, 127.0.0.1, localhost, file:)
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
    return 'http://localhost:5000/api';
  }

  return '/api';
}

window.API_CONFIG = window.API_CONFIG || {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE: '/auth/google',
    ME: '/auth/profile'
  },
  ENABLE_MOCK_FALLBACK: true
};

const API_CONFIG = window.API_CONFIG;

/**
 * Key definitions for session persistence
 */
const AUTH_KEYS = {
  TOKEN: 'ai_hiring_auth_token',
  USER: 'ai_hiring_user_session',
  ROLE: 'ai_hiring_role',
  NAME: 'ai_hiring_user_name',
  EMAIL: 'ai_hiring_email',
  LOCATION: 'ai_hiring_location'
};

document.addEventListener('DOMContentLoaded', () => {
  initRoleSelector();
  initLoginForm();
  initRegisterForm();
  initDemoCredentials();
  initGoogleAuthButton();
  initLogoutButtons();
  initProtectedPageGuard();
  checkUrlAuthErrors();
});

/**
 * Handle URL authentication error indicators
 */
function checkUrlAuthErrors() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('error') === 'unauthenticated') {
    const globalAlert = document.getElementById('auth-error-alert');
    const alertMsg = document.getElementById('auth-error-message');
    if (globalAlert && alertMsg) {
      alertMsg.textContent = 'Please sign in to access your requested dashboard.';
      globalAlert.className = 'alert alert-warning';
      globalAlert.style.display = 'flex';
    }
  }
}

/**
 * Hackathon Demo Credentials Auto-Fill Handler
 */
function initDemoCredentials() {
  const demoButtons = document.querySelectorAll('.use-demo-btn');
  if (!demoButtons.length) return;

  demoButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const role = btn.getAttribute('data-demo-role');
      const email = btn.getAttribute('data-email');
      const password = btn.getAttribute('data-password');

      // Populate input fields
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const roleInput = document.getElementById('selected-role-input');

      if (emailInput) emailInput.value = email;
      if (passwordInput) passwordInput.value = password;
      if (roleInput) roleInput.value = role;

      // Update role selector tab UI
      document.querySelectorAll('.role-select-btn').forEach((b) => {
        if (b.getAttribute('data-role') === role) {
          b.classList.remove('btn-secondary');
          b.classList.add('active', 'btn-primary');
        } else {
          b.classList.remove('active', 'btn-primary');
          b.classList.add('btn-secondary');
        }
      });

      // Update role notice guidance
      const roleNotice = document.getElementById('role-notice-text');
      if (roleNotice) {
        if (role === 'worker') roleNotice.textContent = 'Sign in as Job Seeker / Candidate';
        if (role === 'employer') roleNotice.textContent = 'Sign in as Hiring Employer';
        if (role === 'admin') roleNotice.textContent = 'Sign in as System Administrator';
      }

      clearAllErrors('login-form');

      if (window.showToast) {
        window.showToast(`Loaded demo credentials for ${role.toUpperCase()}`, 'info');
      }
    });
  });
}

/* ==========================================================================
   1. SESSION & LOCAL STORAGE MANAGEMENT
   ========================================================================== */

/**
 * Save authenticated user session into localStorage
 */
function saveAuthSession(data) {
  const token = data.token || 'mock_jwt_token_' + Date.now();
  const user = data.user || {
    id: 'user_' + Date.now(),
    name: data.name || 'Alex Rivera',
    email: data.email || 'user@example.com',
    role: data.role || 'worker',
    location: data.location || 'Remote'
  };

  localStorage.setItem(AUTH_KEYS.TOKEN, token);
  localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(AUTH_KEYS.ROLE, user.role);
  localStorage.setItem(AUTH_KEYS.NAME, user.name);
  localStorage.setItem(AUTH_KEYS.EMAIL, user.email);
  localStorage.setItem(AUTH_KEYS.LOCATION, user.location || 'Remote');
}

/**
 * Retrieve current user session object
 */
function getCurrentUser() {
  const userJson = localStorage.getItem(AUTH_KEYS.USER);
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch (e) {
      console.error('Failed to parse user session JSON:', e);
    }
  }

  // Fallback to simple keys if user object isn't formatted yet
  const role = localStorage.getItem(AUTH_KEYS.ROLE);
  if (role) {
    return {
      name: localStorage.getItem(AUTH_KEYS.NAME) || 'Alex Rivera',
      email: localStorage.getItem(AUTH_KEYS.EMAIL) || 'alex@example.com',
      role: role,
      location: localStorage.getItem(AUTH_KEYS.LOCATION) || 'Remote'
    };
  }

  return null;
}

/**
 * Check if current user is logged in
 */
function isAuthenticated() {
  return !!localStorage.getItem(AUTH_KEYS.TOKEN) || !!localStorage.getItem(AUTH_KEYS.ROLE);
}

/**
 * Perform logout, clear credentials and redirect to login
 */
window.handleLogout = function () {
  localStorage.removeItem(AUTH_KEYS.TOKEN);
  localStorage.removeItem(AUTH_KEYS.USER);
  localStorage.removeItem(AUTH_KEYS.ROLE);
  localStorage.removeItem(AUTH_KEYS.NAME);
  localStorage.removeItem(AUTH_KEYS.EMAIL);
  localStorage.removeItem(AUTH_KEYS.LOCATION);

  if (window.showToast) {
    window.showToast('You have been signed out successfully.', 'info');
  }

  // Determine correct relative path to login.html
  const path = window.location.pathname;
  let loginPath = 'login.html';
  if (path.includes('/worker/') || path.includes('/employer/') || path.includes('/admin/')) {
    loginPath = '../login.html';
  }

  setTimeout(() => {
    window.location.href = loginPath;
  }, 400);
};

/**
 * Bind logout click events to any button with data-action="logout" or .btn-logout
 */
function initLogoutButtons() {
  document.querySelectorAll('[data-action="logout"], .btn-logout, a[href*="login.html"]').forEach(btn => {
    // Only bind if it's an explicit sign out link on dashboard pages
    if (btn.textContent.toLowerCase().includes('sign out') || btn.textContent.toLowerCase().includes('logout')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.handleLogout();
      });
    }
  });
}

/* ==========================================================================
   2. PROTECTED PAGE GUARD
   ========================================================================== */

/**
 * Protect dashboard pages against unauthenticated access or role mismatches
 */
function initProtectedPageGuard() {
  const path = window.location.pathname;
  let requiredRole = null;

  if (path.includes('/worker/')) requiredRole = 'worker';
  if (path.includes('/employer/')) requiredRole = 'employer';
  if (path.includes('/admin/')) requiredRole = 'admin';

  // Check body data attribute if explicitly set
  const bodyAuthRole = document.body.getAttribute('data-auth-required');
  if (bodyAuthRole) {
    requiredRole = bodyAuthRole;
  }

  // If page does not require auth guard, return
  if (!requiredRole) return;

  const currentUser = getCurrentUser();
  const isAuth = isAuthenticated();

  let loginRedirectPath = '../login.html';

  if (!isAuth || !currentUser) {
    console.warn('[Protected Page] Unauthenticated access attempt to:', path);
    window.location.href = `${loginRedirectPath}?redirect=${encodeURIComponent(path)}&error=unauthenticated`;
    return;
  }

  // Role authorization check (Admin superuser can access any panel)
  if (requiredRole !== 'any' && currentUser.role !== requiredRole && currentUser.role !== 'admin') {
    console.warn(`[Protected Page] Role mismatch: User role '${currentUser.role}' attempted to access '${requiredRole}' page.`);
    
    // Redirect user to their own role's dashboard
    let userDashboardPath = '../worker/dashboard.html';
    if (currentUser.role === 'employer') userDashboardPath = '../employer/dashboard.html';
    if (currentUser.role === 'admin') userDashboardPath = '../admin/dashboard.html';

    window.location.href = userDashboardPath;
  }
}

/* ==========================================================================
   3. ROLE SELECTOR COMPONENT (LOGIN / REGISTER)
   ========================================================================== */

function initRoleSelector() {
  const roleButtons = document.querySelectorAll('.role-select-btn');
  const roleInput = document.getElementById('selected-role-input');

  if (!roleButtons.length) return;

  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      roleButtons.forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-secondary');
      });

      btn.classList.remove('btn-secondary');
      btn.classList.add('active', 'btn-primary');

      const role = btn.getAttribute('data-role');
      if (roleInput) {
        roleInput.value = role;
      }

      // Update role contextual guidance text
      const roleNotice = document.getElementById('role-notice-text');
      if (roleNotice) {
        if (role === 'worker') {
          roleNotice.textContent = 'Sign in as Job Seeker / Candidate';
        } else if (role === 'employer') {
          roleNotice.textContent = 'Sign in as Enterprise Recruiter / Employer';
        } else if (role === 'admin') {
          roleNotice.textContent = 'Sign in as System Administrator';
        }
      }
    });
  });
}

/* ==========================================================================
   4. FORM VALIDATION HELPERS
   ========================================================================== */

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function setFieldError(groupId, errorId, show, customMsg) {
  const group = document.getElementById(groupId);
  const errorSpan = document.getElementById(errorId);

  if (!group || !errorSpan) return;

  if (show) {
    group.classList.add('has-error');
    if (customMsg) errorSpan.textContent = customMsg;
    errorSpan.style.display = 'block';
  } else {
    group.classList.remove('has-error');
    errorSpan.style.display = 'none';
  }
}

function clearAllErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.querySelectorAll('.form-group').forEach(group => group.classList.remove('has-error'));
  form.querySelectorAll('.form-error').forEach(err => err.style.display = 'none');

  const globalAlert = document.getElementById('auth-error-alert');
  if (globalAlert) globalAlert.style.display = 'none';
}

/* ==========================================================================
   5. BACKEND API CALLS & MOCK FALLBACK HANDLER
   ========================================================================== */

/**
 * Send Login API Request
 */
async function authenticateUserApi(credentials) {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || 'Invalid credentials' };
    }
  } catch (err) {
    console.warn('[Auth Service] Backend API not reachable. Using local session mock.');
    if (API_CONFIG.ENABLE_MOCK_FALLBACK) {
      // Mock Success Response
      return {
        success: true,
        data: {
          token: 'mock_jwt_' + Math.random().toString(36).substring(2),
          user: {
            id: 'usr_' + Date.now(),
            name: credentials.role === 'employer' ? 'TechCorp Talent Team' : credentials.role === 'admin' ? 'System Administrator' : 'Alex Rivera',
            email: credentials.email,
            role: credentials.role,
            location: 'San Francisco, CA'
          }
        }
      };
    }
    return { success: false, message: 'Network connection failure. Unable to reach auth server.' };
  }
}

/**
 * Send Register API Request
 */
async function registerUserApi(userData) {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.message || 'Registration failed' };
    }
  } catch (err) {
    console.warn('[Auth Service] Backend API not reachable. Using local session mock.');
    if (API_CONFIG.ENABLE_MOCK_FALLBACK) {
      return {
        success: true,
        data: {
          token: 'mock_jwt_' + Math.random().toString(36).substring(2),
          user: {
            id: 'usr_' + Date.now(),
            name: userData.name,
            email: userData.email,
            role: userData.role,
            location: userData.location
          }
        }
      };
    }
    return { success: false, message: 'Network connection failure. Unable to reach auth server.' };
  }
}

/* ==========================================================================
   6. LOGIN FORM SUBMISSION & ROUTING
   ========================================================================== */

function initLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  // Clear inline errors on typing
  if (emailInput) emailInput.addEventListener('input', () => setFieldError('email-group', 'email-error', false));
  if (passwordInput) passwordInput.addEventListener('input', () => setFieldError('password-group', 'password-error', false));

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors('login-form');

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const roleInput = document.getElementById('selected-role-input');
    const role = roleInput ? roleInput.value : 'worker';

    let isValid = true;

    if (!email || !validateEmail(email)) {
      setFieldError('email-group', 'email-error', true, 'Please enter a valid email address.');
      isValid = false;
    }

    if (!password) {
      setFieldError('password-group', 'password-error', true, 'Password is required.');
      isValid = false;
    }

    if (!isValid) return;

    // Trigger Loading State
    const submitBtn = document.getElementById('login-submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="spinner"></div> Authenticating...`;

    const overlay = document.getElementById('auth-loading-overlay');
    if (overlay) overlay.classList.add('active');

    // Call API Endpoint (with fallback)
    const result = await authenticateUserApi({ email, password, role });

    setTimeout(() => {
      if (overlay) overlay.classList.remove('active');

      if (result.success) {
        const userRole = (result.data.user?.role || role).toLowerCase();
        const selectedRole = role.toLowerCase();

        // Strict Role Validation: Check selected tab against actual user profile role
        if (userRole !== selectedRole && userRole !== 'admin') {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;

          const globalAlert = document.getElementById('auth-error-alert');
          const alertMsg = document.getElementById('auth-error-message');
          if (globalAlert && alertMsg) {
            alertMsg.textContent = 'You are not authorized to access this dashboard.';
            globalAlert.className = 'alert alert-danger';
            globalAlert.style.display = 'flex';
          }

          if (window.showToast) {
            window.showToast('You are not authorized to access this dashboard.', 'danger');
          }
          return;
        }

        saveAuthSession(result.data);

        if (window.showToast) {
          window.showToast(`Login successful! Launching ${userRole.toUpperCase()} Dashboard...`, 'success');
        }

        // Determine destination dashboard route based on user role
        let targetDashboard = 'worker/dashboard.html';
        if (userRole === 'employer') targetDashboard = 'employer/dashboard.html';
        if (userRole === 'admin') targetDashboard = 'admin/dashboard.html';

        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');
        if (redirectParam && !redirectParam.includes('login.html')) {
          setTimeout(() => {
            window.location.href = redirectParam;
          }, 400);
        } else {
          setTimeout(() => {
            window.location.href = targetDashboard;
          }, 400);
        }

      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        const globalAlert = document.getElementById('auth-error-alert');
        const alertMsg = document.getElementById('auth-error-message');
        if (globalAlert && alertMsg) {
          alertMsg.textContent = result.message || 'Invalid email or password.';
          globalAlert.className = 'alert alert-danger';
          globalAlert.style.display = 'flex';
        }

        if (window.showToast) {
          window.showToast(result.message || 'Authentication failed. Please check credentials.', 'danger');
        }
      }
    }, 600);
  });
}

/* ==========================================================================
   7. REGISTER FORM SUBMISSION & ROUTING
   ========================================================================== */

function initRegisterForm() {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  const nameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const locationInput = document.getElementById('location');

  // Clear errors on input
  if (nameInput) nameInput.addEventListener('input', () => setFieldError('name-group', 'name-error', false));
  if (emailInput) emailInput.addEventListener('input', () => setFieldError('email-group', 'email-error', false));
  if (passwordInput) passwordInput.addEventListener('input', () => setFieldError('password-group', 'password-error', false));
  if (locationInput) locationInput.addEventListener('input', () => setFieldError('location-group', 'location-error', false));

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors('register-form');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : '';
    const roleInput = document.getElementById('selected-role-input');
    const role = roleInput ? roleInput.value : 'worker';

    let isValid = true;

    if (!name || name.length < 2) {
      setFieldError('name-group', 'name-error', true, 'Please enter your full name (at least 2 characters).');
      isValid = false;
    }

    if (!email || !validateEmail(email)) {
      setFieldError('email-group', 'email-error', true, 'Please enter a valid email address.');
      isValid = false;
    }

    if (!password || password.length < 6) {
      setFieldError('password-group', 'password-error', true, 'Password must be at least 6 characters.');
      isValid = false;
    }

    if (!location) {
      setFieldError('location-group', 'location-error', true, 'Please specify your city, country, or Remote.');
      isValid = false;
    }

    if (!isValid) return;

    // Trigger Loading State
    const submitBtn = document.getElementById('register-submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="spinner"></div> Creating Account...`;

    const overlay = document.getElementById('auth-loading-overlay');
    if (overlay) overlay.classList.add('active');

    // Call API Endpoint (with fallback)
    const result = await registerUserApi({ name, email, password, role, location });

    setTimeout(() => {
      if (overlay) overlay.classList.remove('active');

      if (result.success) {
        saveAuthSession(result.data);

        if (window.showToast) {
          window.showToast(`Account registered! Launching ${role.toUpperCase()} Dashboard...`, 'success');
        }

        let targetDashboard = 'worker/dashboard.html';
        if (role === 'employer') targetDashboard = 'employer/dashboard.html';
        if (role === 'admin') targetDashboard = 'admin/dashboard.html';

        setTimeout(() => {
          window.location.href = targetDashboard;
        }, 500);

      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        const globalAlert = document.getElementById('auth-error-alert');
        const alertMsg = document.getElementById('auth-error-message');
        if (globalAlert && alertMsg) {
          alertMsg.textContent = result.message || 'Registration failed. Email might already be registered.';
          globalAlert.style.display = 'flex';
        }

        if (window.showToast) {
          window.showToast(result.message || 'Registration failed. Please review inputs.', 'danger');
        }
      }
    }, 900);
  });
}

/* ==========================================================================
   8. GOOGLE OAUTH POPUP & FIREBASE BACKEND INTEGRATION
   ========================================================================== */

function initGoogleAuthButton() {
  const googleBtn = document.getElementById('google-auth-btn');
  if (!googleBtn) return;

  googleBtn.addEventListener('click', async () => {
    const roleInput = document.getElementById('selected-role-input');
    const selectedRole = roleInput ? roleInput.value : 'worker';

    const overlay = document.getElementById('auth-loading-overlay');
    const overlayText = document.getElementById('loading-overlay-text');
    if (overlay) overlay.classList.add('active');
    if (overlayText) overlayText.textContent = 'Connecting to Google Authentication...';

    const clearOverlay = () => {
      if (overlay) overlay.classList.remove('active');
    };

    try {
      if (!window.NexusFirebase || !window.NexusFirebase.signInWithGoogle) {
        throw new Error('Firebase client SDK is loading. Please click again in 2 seconds.');
      }

      const googleResult = await window.NexusFirebase.signInWithGoogle(selectedRole);
      
      if (!googleResult.success) {
        throw new Error(googleResult.message || 'Google Sign-In was cancelled or failed.');
      }

      if (overlayText) overlayText.textContent = 'Synchronizing profile with backend Firestore...';

      // Call Backend API to sync profile and verify ID token
      let backendUser = null;
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: googleResult.idToken,
            role: selectedRole.toUpperCase(),
            email: googleResult.user.email,
            name: googleResult.user.name,
            photoURL: googleResult.user.photoURL,
            uid: googleResult.user.uid
          })
        });

        if (response.ok) {
          const resData = await response.json();
          backendUser = resData.data;
        }
      } catch (apiErr) {
        console.warn('[Auth Service] Backend /auth/google call warning:', apiErr);
      }

      // Save user session
      const sessionUser = backendUser ? {
        id: backendUser.user?.uid || googleResult.user.uid,
        name: backendUser.user?.name || googleResult.user.name,
        email: backendUser.user?.email || googleResult.user.email,
        role: (backendUser.user?.role || selectedRole).toLowerCase(),
        photoURL: backendUser.user?.photoURL || googleResult.user.photoURL || '',
        location: backendUser.user?.location || 'Remote'
      } : {
        id: googleResult.user.uid,
        name: googleResult.user.name,
        email: googleResult.user.email,
        role: selectedRole.toLowerCase(),
        photoURL: googleResult.user.photoURL,
        location: 'Remote'
      };

      saveAuthSession({
        token: backendUser?.token || googleResult.idToken,
        user: sessionUser
      });

      if (window.showToast) {
        window.showToast(`Authenticated with Google! Welcome, ${sessionUser.name}`, 'success');
      }

      // Redirect to destination dashboard based on role
      setTimeout(() => {
        let destination = 'worker/dashboard.html';
        if (sessionUser.role === 'employer') destination = 'employer/dashboard.html';
        if (sessionUser.role === 'admin') destination = 'admin/dashboard.html';

        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');
        if (redirectParam && !redirectParam.includes('login.html')) {
          window.location.href = redirectParam;
        } else {
          window.location.href = destination;
        }
      }, 700);

    } catch (err) {
      clearOverlay();
      const alertBox = document.getElementById('auth-error-alert');
      const msgBox = document.getElementById('auth-error-message');
      if (alertBox && msgBox) {
        msgBox.textContent = err.message || 'Google Authentication failed';
        alertBox.style.display = 'flex';
      }
      if (window.showToast) {
        window.showToast(err.message || 'Google Authentication failed', 'danger');
      }
    }
  });
}

