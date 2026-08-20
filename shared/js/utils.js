/**
 * Abhis Farm Fresh — Utility Functions
 * Shared helpers for formatting, dates, and DOM utilities
 */

const Utils = {
  /**
   * Format currency in Indian Rupees
   */
  formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  },

  /**
   * Format date to readable string
   */
  formatDate(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  /**
   * Format date with time
   */
  formatDateTime(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Generate slug from text
   */
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  },

  /**
   * Show a toast notification
   */
  showToast(message, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }

    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };

    const colors = {
      success: 'text-emerald-400',
      error: 'text-red-400',
      warning: 'text-amber-400',
      info: 'text-blue-400'
    };

    toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-up max-w-sm`;
    toast.innerHTML = `<span class="material-symbols-outlined ${colors[type]} text-base">${icons[type]}</span> ${message}`;
    toast.style.display = 'flex';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  },

  /**
   * Get status badge HTML
   */
  getStatusBadge(status) {
    const map = {
      pending: { class: 'chip-warning', label: 'Pending' },
      confirmed: { class: 'chip-success', label: 'Confirmed' },
      rejected: { class: 'chip-danger', label: 'Rejected' },
      delivered: { class: 'chip-success', label: 'Delivered' },
      cancelled: { class: 'chip-danger', label: 'Cancelled' },
      available: { class: 'chip-success', label: 'Available' },
      out_of_stock: { class: 'chip-danger', label: 'Out of Stock' },
      inactive: { class: 'chip-warning', label: 'Inactive' }
    };

    const info = map[status] || { class: '', label: status };
    return `<span class="chip ${info.class}">${info.label}</span>`;
  },

  /**
   * Create a loading skeleton
   */
  createSkeleton(count = 4) {
    return Array(count).fill('').map(() => `
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-pulse">
        <div class="h-48 bg-slate-200"></div>
        <div class="p-4 space-y-3">
          <div class="h-3 bg-slate-200 rounded w-1/3"></div>
          <div class="h-4 bg-slate-200 rounded w-3/4"></div>
          <div class="h-6 bg-slate-200 rounded w-1/2"></div>
          <div class="h-10 bg-slate-200 rounded mt-4"></div>
        </div>
      </div>
    `).join('');
  },

  /**
   * Debounce function for search inputs
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Utils = Utils;
