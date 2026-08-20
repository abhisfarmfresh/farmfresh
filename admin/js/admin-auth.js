/**
 * Abhis Farm Fresh - Admin Authentication & Route Guard
 * Supports Firebase Authentication with fallback session management
 */

const AdminAuth = {
  SESSION_KEY: 'aff_admin_authenticated',
  USER_KEY: 'aff_admin_user',

  /**
   * Check if admin is currently authenticated
   */
  isAuthenticated() {
    // 1. Check Firebase Auth
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return true;
    }
    // 2. Check session storage
    return sessionStorage.getItem(this.SESSION_KEY) === 'true';
  },

  /**
   * Get current admin email/name
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
   * Sign in admin using Firebase Auth (or fallback for initial setup)
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim();
    const cleanPass = (password || '').trim();

    // 1. Try Firebase Auth if configured
    if (window.FirebaseApp && window.FirebaseApp.isReady() && window.FirebaseApp.auth) {
      try {
        const res = await window.FirebaseApp.signIn(cleanEmail, cleanPass);
        if (res.success) {
          sessionStorage.setItem(this.SESSION_KEY, 'true');
          sessionStorage.setItem(this.USER_KEY, JSON.stringify({ email: cleanEmail, name: 'Admin Officer' }));
          return { success: true };
        }
      } catch (err) {
        console.warn('Firebase Auth failed, checking default credentials:', err);
      }
    }

    // 2. Fallback check for initial setup
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
      await window.FirebaseApp.signOut();
    }
    window.location.href = 'login.html';
  },

  /**
   * Route protection: redirects unauthorized users to login.html
   */
  protect() {
    const isLoginPage = window.location.pathname.endsWith('login.html');
    if (!this.isAuthenticated() && !isLoginPage) {
      window.location.href = 'login.html';
    } else if (this.isAuthenticated() && isLoginPage) {
      window.location.href = 'index.html';
    }
  }
};

window.AdminAuth = AdminAuth;

// Auto-run protection
document.addEventListener('DOMContentLoaded', () => {
  AdminAuth.protect();
  
  // Update admin user badge in sidebar if present
  const adminNameEl = document.getElementById('admin-profile-name');
  const adminEmailEl = document.getElementById('admin-profile-email');
  const user = AdminAuth.getAdminUser();
  if (adminNameEl) adminNameEl.textContent = user.name;
  if (adminEmailEl) adminEmailEl.textContent = user.email;
});
