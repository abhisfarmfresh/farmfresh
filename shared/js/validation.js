/**
 * Abhis Farm Fresh — Form Validation
 * Shared validation rules for checkout forms
 */

const Validator = {
  /**
   * Validate a field and return error message or null
   */
  validateField(fieldName, value) {
    const v = (value || '').trim();

    switch (fieldName) {
      case 'customerName':
        if (!v) return 'Please enter your name.';
        if (v.length < 2) return 'Name must be at least 2 characters.';
        return null;

      case 'shopName':
        if (!v) return 'Please enter your shop or business name.';
        if (v.length < 2) return 'Shop name must be at least 2 characters.';
        return null;

      case 'phone':
        if (!v) return 'Please enter your phone number.';
        const phoneClean = v.replace(/[\s\-\(\)\+]/g, '');
        if (!/^\d{10,12}$/.test(phoneClean)) return 'Please enter a valid 10-digit phone number.';
        return null;

      case 'email':
        if (!v) return 'Please enter your email address.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email address.';
        return null;

      case 'businessAddress':
        if (!v) return 'Please enter your business address.';
        if (v.length < 10) return 'Please enter a complete address.';
        return null;

      case 'deliveryAddress':
        if (!v) return 'Please enter your delivery address.';
        if (v.length < 10) return 'Please enter a complete delivery address.';
        return null;

      default:
        return null;
    }
  },

  /**
   * Validate all checkout fields
   * @param {Object} fields - { customerName, shopName, phone, email, businessAddress, deliveryAddress }
   * @returns {{ valid: boolean, errors: Object }}
   */
  validateCheckout(fields) {
    const errors = {};
    let valid = true;

    for (const [key, value] of Object.entries(fields)) {
      const error = this.validateField(key, value);
      if (error) {
        errors[key] = error;
        valid = false;
      }
    }

    return { valid, errors };
  },

  /**
   * Validate quantity (minimum 1 KG)
   */
  validateQuantity(qty) {
    const num = parseInt(qty, 10);
    if (isNaN(num) || num < 1) return 1;
    return num;
  },

  /**
   * Show inline error on a form field
   */
  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Remove existing error
    this.clearFieldError(fieldId);

    // Add error styling
    field.classList.add('border-red-400', 'bg-red-50');
    field.classList.remove('border-slate-200');

    // Insert error message
    const errorEl = document.createElement('p');
    errorEl.className = 'field-error text-xs text-red-600 font-semibold mt-1';
    errorEl.id = `${fieldId}-error`;
    errorEl.textContent = message;
    field.parentNode.appendChild(errorEl);
  },

  /**
   * Clear error from a form field
   */
  clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('border-red-400', 'bg-red-50');
    field.classList.add('border-slate-200');

    const errorEl = document.getElementById(`${fieldId}-error`);
    if (errorEl) errorEl.remove();
  },

  /**
   * Clear all errors
   */
  clearAllErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.border-red-400').forEach(el => {
      el.classList.remove('border-red-400', 'bg-red-50');
      el.classList.add('border-slate-200');
    });
  }
};

window.Validator = Validator;
