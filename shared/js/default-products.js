/**
 * Abhis Farm Fresh — Shared Default Vegetable Catalogue
 * Accessible across Customer website and Admin CRM portals
 */

window.DEFAULT_PRODUCTS = [
  {
    id: "prod_tomato",
    name: "Fresh Tomato",
    slug: "fresh-tomato",
    category: "everyday",
    description: "Firm, juicy hybrid tomatoes. Perfect for curries, gravies, salads and commercial kitchen prep. Grade A morning harvest.",
    imageUrl: "images/farm_fresh_media_01.jpeg",
    price: 35,
    unit: "KG",
    minQty: 1,
    stock: 500,
    status: "available",
    isActive: true
  },
  {
    id: "prod_capsicum",
    name: "Green Capsicum",
    slug: "green-capsicum",
    category: "everyday",
    description: "Crisp, fresh bell peppers with thick walls. Ideal for stir-fries, stuffings, and continental gravies. Grade A quality.",
    imageUrl: "images/farm_fresh_media_02.jpeg",
    price: 45,
    unit: "KG",
    minQty: 1,
    stock: 300,
    status: "available",
    isActive: true
  },
  {
    id: "prod_lettuce",
    name: "Butterhead Lettuce",
    slug: "butterhead-lettuce",
    category: "leafy",
    description: "Tender, buttery leaves with delicate crunch. Hydroponically grown fresh produce. Chef-grade salad base.",
    imageUrl: "images/farm_fresh_media_03.jpeg",
    price: 120,
    unit: "KG",
    minQty: 1,
    stock: 80,
    status: "available",
    isActive: true
  },
  {
    id: "prod_onion",
    name: "Red Onion (Nasik)",
    slug: "red-onion",
    category: "everyday",
    description: "Premium Nasik red onions, medium to large size (55mm+). Essential kitchen staple with excellent shelf life.",
    imageUrl: "images/farm_fresh_media_05.jpeg",
    price: 32,
    unit: "KG",
    minQty: 1,
    stock: 1000,
    status: "available",
    isActive: true
  },
  {
    id: "prod_spinach",
    name: "Baby Spinach",
    slug: "baby-spinach",
    category: "leafy",
    description: "Tender, farm-fresh baby spinach leaves. Rich in iron, crisp texture, washed and sorted for instant use.",
    imageUrl: "images/farm_fresh_media_07.jpeg",
    price: 60,
    unit: "KG",
    minQty: 1,
    stock: 120,
    status: "available",
    isActive: true
  },
  {
    id: "prod_cucumber",
    name: "English Cucumber",
    slug: "english-cucumber",
    category: "everyday",
    description: "Crisp, thin-skinned English cucumbers from polyhouse cultivation. Perfect for salads, raita, and cold prep.",
    imageUrl: "images/farm_fresh_media_10.jpeg",
    price: 36,
    unit: "KG",
    minQty: 1,
    stock: 400,
    status: "available",
    isActive: true
  },
  {
    id: "prod_sweetcorn",
    name: "Sweet Corn Cobs",
    slug: "sweet-corn",
    category: "seasonal",
    description: "Golden sweet corn cobs, shucked and freshly picked. High sugar content, ideal for continental soups and grilling.",
    imageUrl: "images/farm_fresh_media_12.jpeg",
    price: 40,
    unit: "KG",
    minQty: 1,
    stock: 300,
    status: "available",
    isActive: true
  },
  {
    id: "prod_carrot",
    name: "Fresh Carrot",
    slug: "fresh-carrot",
    category: "root",
    description: "Sweet, crunchy orange carrots. Rich in beta-carotene, ideal for daily restaurant cooking and fresh juice bars.",
    imageUrl: "images/farm_fresh_media_14.jpeg",
    price: 55,
    unit: "KG",
    minQty: 1,
    stock: 350,
    status: "available",
    isActive: true
  },
  {
    id: "prod_potato",
    name: "Fresh Potato",
    slug: "fresh-potato",
    category: "root",
    description: "Clean, firm medium-grade potatoes with smooth skin. Low sugar, high starch, versatile for curries and frying.",
    imageUrl: "images/farm_fresh_media_15.jpeg",
    price: 28,
    unit: "KG",
    minQty: 1,
    stock: 800,
    status: "available",
    isActive: true
  },
  {
    id: "prod_chilli",
    name: "Green Chilli",
    slug: "green-chilli",
    category: "everyday",
    description: "Fresh, medium-hot green chillies. Sharp heat, bright green color, harvested daily for aromatic seasoning.",
    imageUrl: "images/farm_fresh_media_17.jpeg",
    price: 80,
    unit: "KG",
    minQty: 1,
    stock: 100,
    status: "available",
    isActive: true
  },
  {
    id: "prod_basil",
    name: "Genovese Basil",
    slug: "genovese-basil",
    category: "exotic",
    description: "Authentic Italian sweet basil. Hydroponically grown for intense aroma and deep flavor in artisan pesto and sauces.",
    imageUrl: "images/farm_fresh_media_09.jpeg",
    price: 240,
    unit: "KG",
    minQty: 1,
    stock: 40,
    status: "available",
    isActive: true
  },
  {
    id: "prod_mint",
    name: "Fresh Mint Leaves (Pudina)",
    slug: "fresh-mint",
    category: "leafy",
    description: "Fragrant, dark green mint sprigs. Intensely aromatic, fresh morning harvest for chutneys, biryanis and beverages.",
    imageUrl: "images/farm_fresh_media_11.jpeg",
    price: 45,
    unit: "KG",
    minQty: 1,
    stock: 90,
    status: "available",
    isActive: true
  }
];

/**
 * Unified Local Storage Persistence Layer for Products
 * Ensures edits, price updates, and additions persist locally and sync across Admin and Customer pages
 */
const ProductStorage = {
  STORAGE_KEY: 'aff_products_store',

  getAll() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading from ProductStorage:', e);
    }
    const defaults = window.DEFAULT_PRODUCTS ? JSON.parse(JSON.stringify(window.DEFAULT_PRODUCTS)) : [];
    this.saveAll(defaults);
    return defaults;
  },

  saveAll(products) {
    try {
      if (Array.isArray(products)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(products));
      }
    } catch (e) {
      console.warn('Error saving to ProductStorage:', e);
    }
  },

  getDeletedIds() {
    try {
      const stored = localStorage.getItem('aff_deleted_product_ids');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  markDeleted(productId) {
    if (!productId) return;
    try {
      const deleted = this.getDeletedIds();
      const sId = String(productId);
      if (!deleted.includes(sId)) {
        deleted.push(sId);
        localStorage.setItem('aff_deleted_product_ids', JSON.stringify(deleted));
      }
    } catch (e) {}
  },

  unmarkDeleted(productId) {
    if (!productId) return;
    try {
      const deleted = this.getDeletedIds().filter(id => String(id) !== String(productId));
      localStorage.setItem('aff_deleted_product_ids', JSON.stringify(deleted));
    } catch (e) {}
  },

  clearDeletedList() {
    localStorage.removeItem('aff_deleted_product_ids');
  },

  upsert(product) {
    if (!product || !product.id) return;
    this.unmarkDeleted(product.id);
    const list = this.getAll();
    const idx = list.findIndex(p => String(p.id) === String(product.id));
    if (idx > -1) {
      list[idx] = { ...list[idx], ...product };
    } else {
      list.unshift(product);
    }
    this.saveAll(list);
    return list;
  },

  delete(productId) {
    if (!productId) return [];
    this.markDeleted(productId);
    const list = this.getAll();
    const filtered = list.filter(p => String(p.id) !== String(productId));
    this.saveAll(filtered);
    return filtered;
  },

  resetToDefaults() {
    this.clearDeletedList();
    const defaults = window.DEFAULT_PRODUCTS ? JSON.parse(JSON.stringify(window.DEFAULT_PRODUCTS)) : [];
    this.saveAll(defaults);
    return defaults;
  }
};

/**
 * Client-side dual-layer persistence for Orders
 */
const OrderStorage = {
  STORAGE_KEY: 'aff_orders_store',

  getAll() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const deleted = this.getDeletedIds();
          return parsed.filter(o => {
            if (!o) return false;
            const id = String(o.id || '');
            const num = String(o.orderNumber || '');
            return !deleted.includes(id) && !deleted.includes(num) && !o.isDeleted && o.status !== 'deleted';
          });
        }
      }
    } catch (e) {
      console.warn('Error reading from OrderStorage:', e);
    }
    return [];
  },

  getDeletedIds() {
    try {
      const stored = localStorage.getItem('aff_deleted_orders');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  markDeleted(orderId) {
    if (!orderId) return;
    try {
      const deleted = this.getDeletedIds();
      const sId = String(orderId);
      if (!deleted.includes(sId)) {
        deleted.push(sId);
        localStorage.setItem('aff_deleted_orders', JSON.stringify(deleted));
      }
    } catch (e) {}
  },

  saveAll(orders) {
    try {
      if (Array.isArray(orders)) {
        const deleted = this.getDeletedIds();
        const clean = orders.filter(o => {
          if (!o) return false;
          const id = String(o.id || '');
          const num = String(o.orderNumber || '');
          return !deleted.includes(id) && !deleted.includes(num) && !o.isDeleted && o.status !== 'deleted';
        });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(clean));
      }
    } catch (e) {
      console.warn('Error saving to OrderStorage:', e);
    }
  },

  upsert(order) {
    if (!order) return;
    const key = String(order.orderNumber || order.id || '');
    if (!key) return;
    const list = this.getAll();
    const idx = list.findIndex(o => (o.orderNumber && String(o.orderNumber) === key) || (o.id && String(o.id) === key));
    if (idx > -1) {
      list[idx] = { ...list[idx], ...order };
    } else {
      list.unshift(order);
    }
    this.saveAll(list);
    return list;
  },

  delete(orderId) {
    if (!orderId) return [];
    this.markDeleted(orderId);
    const sId = String(orderId);
    const list = this.getAll();
    const filtered = list.filter(o => String(o.id) !== sId && String(o.orderNumber) !== sId);
    this.saveAll(filtered);
    return filtered;
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  clearAll() {
    const all = this.getAll();
    all.forEach(o => {
      if (o.id) this.markDeleted(o.id);
      if (o.orderNumber) this.markDeleted(o.orderNumber);
    });
    this.clear();
  }
};

/**
 * Client-side dual-layer persistence for Customer Inquiries & Leads
 */
const InquiryStorage = {
  STORAGE_KEY: 'aff_inquiries_store',

  getAll() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const deleted = this.getDeletedIds();
          return parsed.filter(i => i && !deleted.includes(String(i.id)) && !i.isDeleted && i.status !== 'deleted');
        }
      }
    } catch (e) {
      console.warn('Error reading from InquiryStorage:', e);
    }
    return [];
  },

  getDeletedIds() {
    try {
      const stored = localStorage.getItem('aff_deleted_inquiries');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  markDeleted(inquiryId) {
    if (!inquiryId) return;
    try {
      const deleted = this.getDeletedIds();
      const sId = String(inquiryId);
      if (!deleted.includes(sId)) {
        deleted.push(sId);
        localStorage.setItem('aff_deleted_inquiries', JSON.stringify(deleted));
      }
    } catch (e) {}
  },

  saveAll(inquiries) {
    try {
      if (Array.isArray(inquiries)) {
        const deleted = this.getDeletedIds();
        const clean = inquiries.filter(i => i && !deleted.includes(String(i.id)) && !i.isDeleted && i.status !== 'deleted');
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(clean));
      }
    } catch (e) {
      console.warn('Error saving to InquiryStorage:', e);
    }
  },

  upsert(inquiry) {
    if (!inquiry || !inquiry.id) return;
    const list = this.getAll();
    const idx = list.findIndex(i => String(i.id) === String(inquiry.id));
    if (idx > -1) {
      list[idx] = { ...list[idx], ...inquiry };
    } else {
      list.unshift(inquiry);
    }
    this.saveAll(list);
    return list;
  },

  delete(inquiryId) {
    if (!inquiryId) return [];
    this.markDeleted(inquiryId);
    const sId = String(inquiryId);
    const list = this.getAll();
    const filtered = list.filter(i => String(i.id) !== sId);
    this.saveAll(filtered);
    return filtered;
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

/**
 * Client-side persistence for Categories
 */
const CategoryStorage = {
  STORAGE_KEY: 'aff_categories_store',
  DEFAULT_CATEGORIES: [
    { id: 'all', name: 'All Produce', icon: 'grid_view', subtitle: 'Full Daily Harvest', tag: 'Complete Fresh Selection', iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { id: 'leafy', name: 'Leafy Greens', icon: 'eco', subtitle: 'Spinach, Coriander & Mint', tag: 'Crisp & Farm-Fresh', iconBg: 'bg-green-100 text-green-800 border-green-200' },
    { id: 'root', name: 'Root Veggies', icon: 'yard', subtitle: 'Potatoes, Onions, Carrots', tag: 'Direct From Earth', iconBg: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'everyday', name: 'Daily Essentials', icon: 'nutrition', subtitle: 'Tomatoes, Beans, Chillies', tag: 'Kitchen Staples', iconBg: 'bg-teal-100 text-teal-800 border-teal-200' },
    { id: 'exotic', name: 'Exotic & Gourmet', icon: 'spa', subtitle: 'Broccoli, Zucchini, Peppers', tag: 'Hotel Grade Premium', iconBg: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'seasonal', name: 'Seasonal Specials', icon: 'wb_sunny', subtitle: 'Cauliflower, Drumsticks', tag: 'Peak Harvest Fresh', iconBg: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
  ],

  getAll() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deleted = this.getDeletedIds();
          return parsed.filter(c => c && !deleted.includes(String(c.id)));
        }
      }
    } catch (e) {}
    const defaults = (window.AFF_CONFIG && window.AFF_CONFIG.categories) ? [...window.AFF_CONFIG.categories] : [...this.DEFAULT_CATEGORIES];
    const deleted = this.getDeletedIds();
    return defaults.filter(c => c && !deleted.includes(String(c.id)));
  },

  getDeletedIds() {
    try {
      const stored = localStorage.getItem('aff_deleted_categories');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  markDeleted(catId) {
    if (!catId) return;
    try {
      const deleted = this.getDeletedIds();
      const sId = String(catId);
      if (!deleted.includes(sId)) {
        deleted.push(sId);
        localStorage.setItem('aff_deleted_categories', JSON.stringify(deleted));
      }
    } catch (e) {}
  },

  saveAll(categories) {
    try {
      if (Array.isArray(categories)) {
        const deleted = this.getDeletedIds();
        const clean = categories.filter(c => c && !deleted.includes(String(c.id)));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(clean));
      }
    } catch (e) {}
  },

  upsert(category) {
    if (!category || !category.id) return;
    const list = this.getAll();
    const idx = list.findIndex(c => String(c.id) === String(category.id));
    if (idx > -1) {
      list[idx] = { ...list[idx], ...category };
    } else {
      list.push(category);
    }
    this.saveAll(list);
    return list;
  },

  delete(catId) {
    if (!catId) return [];
    this.markDeleted(catId);
    const sId = String(catId);
    const list = this.getAll();
    const filtered = list.filter(c => String(c.id) !== sId);
    this.saveAll(filtered);
    return filtered;
  },

  resetToDefaults() {
    localStorage.removeItem('aff_deleted_categories');
    const defaults = (window.AFF_CONFIG && window.AFF_CONFIG.categories) ? [...window.AFF_CONFIG.categories] : [];
    this.saveAll(defaults);
    return defaults;
  }
};

window.ProductStorage = ProductStorage;
window.OrderStorage = OrderStorage;
window.InquiryStorage = InquiryStorage;
window.CategoryStorage = CategoryStorage;


