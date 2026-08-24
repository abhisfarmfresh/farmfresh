/**
 * Abhis Farm Fresh — Admin Authentication & Strict Session Guard
 * Features:
 * 1. Strict Session-based Authentication (Requires password on fresh link entry)
 * 2. Immediate route protection (blocks unauthorized access / content flashing)
 * 3. Session Timeout & Inactivity Monitor (Auto-logout on idle)
 * 4. Explicit Session Logout with confirmation
 */

const AdminAuth = {
  SESSION_KEY: 'aff_admin_authenticated',
  USER_KEY: 'aff_admin_user',
  EXPIRY_KEY: 'aff_admin_auth_expires',
  SESSION_DURATION_MS: 60 * 60 * 1000, // 60 minutes session validity

  /**
   * Check if admin currently has a valid, active unexpired session
   */
  isAuthenticated() {
    const isAuth = sessionStorage.getItem(this.SESSION_KEY) === 'true';
    const expiresAt = Number(sessionStorage.getItem(this.EXPIRY_KEY) || 0);
    const now = Date.now();

    if (!isAuth || !expiresAt || now > expiresAt) {
      this.clearSessionData();
      return false;
    }
    return true;
  },

  /**
   * Clear all local and session credentials
   */
  clearSessionData() {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.EXPIRY_KEY);
  },

  /**
   * Refresh session expiration timestamp on user activity
   */
  refreshSession() {
    if (sessionStorage.getItem(this.SESSION_KEY) === 'true') {
      const newExpiry = Date.now() + this.SESSION_DURATION_MS;
      sessionStorage.setItem(this.EXPIRY_KEY, String(newExpiry));
    }
  },

  /**
   * Get current active admin profile
   */
  getAdminUser() {
    const stored = sessionStorage.getItem(this.USER_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return { email: 'admin@abhisfarmfresh.com', name: 'Admin Officer' };
  },

  /**
   * Sign in admin using Firebase Auth with SESSION persistence
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    try {
      // Configure Firebase to only persist auth in current browser session
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
        } catch (pErr) {
          console.warn('Could not set SESSION persistence:', pErr.message);
        }
      }

      if (window.FirebaseApp && window.FirebaseApp.isReady() && window.FirebaseApp.auth) {
        const res = await window.FirebaseApp.signIn(cleanEmail, cleanPass);
        if (res.success) {
          const now = Date.now();
          sessionStorage.setItem(this.SESSION_KEY, 'true');
          sessionStorage.setItem(this.EXPIRY_KEY, String(now + this.SESSION_DURATION_MS));
          sessionStorage.setItem(this.USER_KEY, JSON.stringify({
            email: cleanEmail,
            name: res.user?.displayName || 'Admin Officer'
          }));
          return { success: true };
        }
        return { success: false, error: res.error || 'Invalid email or password. Please try again.' };
      }

      return { success: false, error: 'Database service is temporarily unavailable. Please try again.' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Authentication failed.' };
    }
  },

  /**
   * Explicit Session Logout with confirmation
   */
  async logout(promptConfirm = true) {
    if (promptConfirm) {
      const confirmLogout = confirm('Are you sure you want to end your Admin session and log out?');
      if (!confirmLogout) return;
    }

    this.clearSessionData();

    if (window.FirebaseApp) {
      try {
        await window.FirebaseApp.signOut();
      } catch (e) {}
    } else if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        await firebase.auth().signOut();
      } catch (e) {}
    }

    const returnHash = window.location.hash || '';
    const redirectParam = returnHash ? `?redirect=${encodeURIComponent(returnHash)}` : '';
    window.location.href = `login.html${redirectParam}`;
  },

  /**
   * Handle session timeout due to inactivity
   */
  handleSessionExpiry() {
    this.clearSessionData();
    const returnHash = window.location.hash || '';
    const redirectParam = returnHash ? `&redirect=${encodeURIComponent(returnHash)}` : '';
    window.location.href = `login.html?reason=expired${redirectParam}`;
  },

  /**
   * Immediate route guard: redirect to login.html if not authenticated
   */
  protect() {
    const path = window.location.pathname;
    if (path.endsWith('login.html') || path.endsWith('/login')) {
      return;
    }

    if (!this.isAuthenticated()) {
      const returnHash = window.location.hash || '';
      const redirectParam = returnHash ? `?redirect=${encodeURIComponent(returnHash)}` : '';
      window.location.replace(`login.html${redirectParam}`);
    }
  },

  /**
   * Sync active profile display in Admin UI
   */
  syncProfileUI() {
    const adminNameEl = document.getElementById('admin-profile-name');
    const adminEmailEl = document.getElementById('admin-profile-email');
    const user = this.getAdminUser();
    if (adminNameEl && user.name) adminNameEl.textContent = user.name;
    if (adminEmailEl && user.email) adminEmailEl.textContent = user.email;
  },

  /**
   * Setup idle session monitoring
   */
  setupActivityMonitor() {
    let activityDebounce = null;
    const onUserActivity = () => {
      if (activityDebounce) return;
      activityDebounce = setTimeout(() => {
        activityDebounce = null;
        if (AdminAuth.isAuthenticated()) {
          AdminAuth.refreshSession();
        }
      }, 5000);
    };

    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    // Check expiry every 30 seconds
    setInterval(() => {
      const path = window.location.pathname;
      if (path.endsWith('login.html') || path.endsWith('/login')) return;

      if (!AdminAuth.isAuthenticated()) {
        AdminAuth.handleSessionExpiry();
      }
    }, 30000);
  }
};

window.AdminAuth = AdminAuth;

// Immediate execution & listeners
AdminAuth.protect();

document.addEventListener('DOMContentLoaded', () => {
  AdminAuth.protect();
  AdminAuth.syncProfileUI();
  AdminAuth.setupActivityMonitor();
});
