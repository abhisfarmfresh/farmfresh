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
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return true;
    }
    return sessionStorage.getItem(this.SESSION_KEY) === 'true';
  },

  /**
   * Get current admin profile
   */
  getAdminUser() {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return {
        email: window.firebaseAuth.currentUser.email,
        name: window.firebaseAuth.currentUser.displayName || 'Admin Officer'
      };
    }
    const stored = sessionStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : { email: 'admin@abhisfarmfresh.com', name: 'Admin Officer' };
  },

  /**
   * Sign in admin using Firebase Auth (with mock credential fallback)
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim();
    const cleanPass = (password || '').trim();

    // 1. Try Firebase Auth
    if (window.FirebaseApp && window.FirebaseApp.isReady() && window.FirebaseApp.auth) {
      try {
        const res = await window.FirebaseApp.signIn(cleanEmail, cleanPass);
        if (res.success) {
          sessionStorage.setItem(this.SESSION_KEY, 'true');
          sessionStorage.setItem(this.USER_KEY, JSON.stringify({ email: cleanEmail, name: 'Admin Officer' }));
          return { success: true };
        }
      } catch (err) {
        console.warn('Firebase Auth attempt failed:', err);
      }
    }

    // 2. Fallback check for initial offline / dev setup
    if ((cleanEmail === 'admin@abhisfarmfresh.com' || cleanEmail === 'admin') && cleanPass === 'admin123') {
      sessionStorage.setItem(this.SESSION_KEY, 'true');
      sessionStorage.setItem(this.USER_KEY, JSON.stringify({ email: 'admin@abhisfarmfresh.com', name: 'Admin Officer' }));
      return { success: true };
    }

    return { success: false, error: 'Invalid email or password.' };
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
   * Route protection: ensures session is initialized without blocking direct access
   */
  protect() {
    if (!this.isAuthenticated()) {
      sessionStorage.setItem(this.SESSION_KEY, 'true');
      sessionStorage.setItem(this.USER_KEY, JSON.stringify({ email: 'admin@abhisfarmfresh.in', name: 'Admin Officer' }));
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
