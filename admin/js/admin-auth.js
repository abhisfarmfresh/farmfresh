/**
 * Abhis Farm Fresh — Admin Authentication & Route Guard
 * Firebase Authentication + Session Guard + Auto-Redirect
 */

const AdminAuth = {
  SESSION_KEY: 'aff_admin_authenticated',
  USER_KEY: 'aff_admin_user',

  /**
   * Check if admin is currently authenticated
   */
  isAuthenticated() {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      return true;
    }
    return sessionStorage.getItem(this.SESSION_KEY) === 'true';
  },

  /**
   * Get current admin profile
   */
  getAdminUser() {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      return {
        email: firebase.auth().currentUser.email,
        name: firebase.auth().currentUser.displayName || 'Admin Officer'
      };
    }
    const stored = sessionStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : { email: 'admin@abhisfarmfresh.com', name: 'Admin Officer' };
  },

  /**
   * Sign in admin using Firebase Auth strictly (No hardcoded credentials)
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    if (window.FirebaseApp && window.FirebaseApp.isReady() && window.FirebaseApp.auth) {
      try {
        const res = await window.FirebaseApp.signIn(cleanEmail, cleanPass);
        if (res.success) {
          sessionStorage.setItem(this.SESSION_KEY, 'true');
          sessionStorage.setItem(this.USER_KEY, JSON.stringify({
            email: cleanEmail,
            name: res.user?.displayName || 'Admin Officer'
          }));
          return { success: true };
        }
        return { success: false, error: res.error || 'Invalid credentials. Please verify your Firebase Auth credentials.' };
      } catch (err) {
        console.error('Firebase Auth error:', err);
        return { success: false, error: err.message || 'Firebase Authentication failed.' };
      }
    }

    return { success: false, error: 'Firebase Auth service is unavailable or unconfigured.' };
  },

  /**
   * Sign out admin and redirect to login page
   */
  async logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    if (window.FirebaseApp) {
      try {
        await window.FirebaseApp.signOut();
      } catch (e) {}
    }
    window.location.href = 'login.html';
  },

  /**
   * Route protection: redirect unauthenticated users to login.html
   */
  protect() {
    const path = window.location.pathname;
    if (path.endsWith('login.html') || path.endsWith('/login')) {
      return;
    }
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  },

  /**
   * Synchronize active profile information in UI
   */
  syncProfileUI() {
    const adminNameEl = document.getElementById('admin-profile-name');
    const adminEmailEl = document.getElementById('admin-profile-email');
    const user = this.getAdminUser();
    if (adminNameEl) adminNameEl.textContent = user.name;
    if (adminEmailEl) adminEmailEl.textContent = user.email;
  }
};

window.AdminAuth = AdminAuth;

// Auto-run protection & sync
document.addEventListener('DOMContentLoaded', () => {
  AdminAuth.protect();
  AdminAuth.syncProfileUI();

  // Watch Firebase Auth state
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        sessionStorage.setItem(AdminAuth.SESSION_KEY, 'true');
        sessionStorage.setItem(AdminAuth.USER_KEY, JSON.stringify({
          email: user.email,
          name: user.displayName || 'Admin Officer'
        }));
        AdminAuth.syncProfileUI();
      }
    });
  }
});
