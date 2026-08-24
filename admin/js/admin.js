/**
 * Abhis Farm Fresh Admin CRM (Legacy Wrapper)
 * Deprecated: All authentication and admin controls are handled by admin-auth.js and admin-core.js.
 */
// Ensure compatibility if legacy script is referenced
if (typeof window !== 'undefined' && !window.AdminAuth && typeof AdminAuth !== 'undefined') {
  window.AdminAuth = AdminAuth;
}
