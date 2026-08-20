/**
 * Abhis Farm Fresh — Utility Functions
 * Shared helpers for formatting, dates, phone normalization, and DOM utilities
 */

const Utils = {
  /**
   * Format currency in Indian Rupees
   */
  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  },

  /**
   * Robust Date parser for Firestore Timestamp, ISO string, epoch number, or Date
   */
  parseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  },

  /**
   * Format date to readable string (e.g. "20 Aug 2026")
   */
  formatDate(timestamp) {
    const date = this.parseDate(timestamp);
    if (!date) return '—';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  /**
   * Format date with time (e.g. "20 Aug 2026, 05:30 PM")
   */
  formatDateTime(timestamp) {
    const date = this.parseDate(timestamp);
    if (!date) return '—';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Get dynamic month boundaries (handles 28, 29, 30, 31 days and leap years automatically)
   * @param {number} year - full year (e.g. 2026)
   * @param {number} month - 0-indexed month (0 = Jan, 11 = Dec)
   * @returns {{ start: Date, end: Date, label: string }}
   */
  getMonthRange(year, month) {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    // Passing 0 as the day for month+1 returns the last day of month
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const monthName = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return {
      start,
      end,
      label: monthName,
      formattedRange: `${this.formatDate(start)} – ${this.formatDate(end)}`
    };
  },

  /**
   * Get current month range dynamically
   */
  getCurrentMonthRange() {
    const now = new Date();
    return this.getMonthRange(now.getFullYear(), now.getMonth());
  },

  /**
   * Get previous month range dynamically
   */
  getPreviousMonthRange() {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() - 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    return this.getMonthRange(year, month);
  },

  /**
   * Normalize phone number for WhatsApp and validation
   */
  normalizePhone(phone) {
    if (!phone) return null;
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length === 10) {
      return '91' + clean;
    } else if (clean.length === 12 && clean.startsWith('91')) {
      return clean;
    } else if (clean.length >= 10) {
      return clean;
    }
    return null;
  },

  /**
   * Generate slug from text
   */
  slugify(text) {
    return (text || '')
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
    toast.innerHTML = `<span class="material-symbols-outlined ${colors[type] || 'text-white'} text-base">${icons[type] || 'info'}</span> ${this.escapeHtml(message)}`;
    toast.style.display = 'flex';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  },

  /**
   * Get status badge HTML
   */
  getStatusBadge(status) {
    const norm = (status || 'pending').toLowerCase();
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

    const info = map[norm] || { class: 'chip-neutral', label: status };
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
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
};

window.Utils = Utils;
