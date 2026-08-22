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
    { id: 'all', name: 'All Produce', icon: 'grid_view', subtitle: 'Full Daily Harvest', tag: 'Complete Fresh Selection', iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { id: 'leafy', name: 'Leafy Greens', icon: 'eco', subtitle: 'Spinach, Coriander & Mint', tag: 'Crisp & Farm-Fresh', iconBg: 'bg-green-100 text-green-800 border-green-200' },
    { id: 'root', name: 'Root Veggies', icon: 'yard', subtitle: 'Potatoes, Onions, Carrots', tag: 'Direct From Earth', iconBg: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'everyday', name: 'Daily Essentials', icon: 'nutrition', subtitle: 'Tomatoes, Beans, Chillies', tag: 'Kitchen Staples', iconBg: 'bg-teal-100 text-teal-800 border-teal-200' },
    { id: 'exotic', name: 'Exotic & Gourmet', icon: 'spa', subtitle: 'Broccoli, Zucchini, Peppers', tag: 'Hotel Grade Premium', iconBg: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'seasonal', name: 'Seasonal Specials', icon: 'wb_sunny', subtitle: 'Cauliflower, Drumsticks', tag: 'Peak Harvest Fresh', iconBg: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
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
