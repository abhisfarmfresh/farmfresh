/**
 * Abhis Farm Fresh Admin CRM Controller
 */

const AdminAuth = {
    isAuthenticated() {
        return sessionStorage.getItem('admin_authenticated') === 'true';
    },
    login(user, pass) {
        if (user === 'admin' && pass === 'admin123') {
            sessionStorage.setItem('admin_authenticated', 'true');
            return true;
        }
        return false;
    },
    logout() {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = 'index.html';
    },
    protect() {
        if (!this.isAuthenticated() && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
        }
    }
};

// Auto-run protection
if (!window.location.pathname.endsWith('admin/index.html') && !window.location.pathname.endsWith('admin/')) {
    AdminAuth.protect();
}
