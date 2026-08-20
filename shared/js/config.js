/**
 * Abhis Farm Fresh — Brand Configuration
 * Shared constants used by both Customer and Admin applications
 */

const AFF_CONFIG = {
  brand: {
    name: 'Abhis Farm Fresh',
    tagline: 'Premium Fresh Vegetables. Delivered to Your Business.',
    shortTagline: 'Premium veggies at your doorstep.',
    domain: 'www.abhisfarmfresh.com',
    copyright: '© 2026 Abhis Farm Fresh. All rights reserved.'
  },

  contact: {
    phone: '6380710362',
    phoneFormatted: '+91 6380710362',
    whatsapp: '916380710362',
    whatsappLink: 'https://wa.me/916380710362',
    email: 'orders@abhisfarmfresh.com',
    instagram: '@abhisfarmfresh',
    instagramUrl: 'https://www.instagram.com/abhisfarmfresh?igsi=MXVhOXIzY2g0cHRwYw=='
  },

  order: {
    prefix: 'AFF',
    minQtyKg: 1,
    currency: '₹',
    unit: 'KG',
    statuses: {
      PENDING: 'pending',
      CONFIRMED: 'confirmed',
      REJECTED: 'rejected',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled'
    }
  },

  categories: [
    { id: 'all', name: 'All Vegetables', icon: 'grid_view' },
    { id: 'leafy', name: 'Leafy Vegetables', icon: 'eco' },
    { id: 'root', name: 'Root Vegetables', icon: 'yard' },
    { id: 'everyday', name: 'Everyday Vegetables', icon: 'nutrition' },
    { id: 'exotic', name: 'Exotic Vegetables', icon: 'spa' },
    { id: 'seasonal', name: 'Seasonal Vegetables', icon: 'wb_sunny' }
  ],

  /**
   * Generate a unique order number: AFF-YYYYMMDD-NNN
   */
  generateOrderNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 900) + 100);
    return `${this.order.prefix}-${y}${m}${d}-${seq}`;
  }
};

// Make available globally
window.AFF_CONFIG = AFF_CONFIG;
