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

  upsert(product) {
    if (!product || !product.id) return;
    const list = this.getAll();
    const idx = list.findIndex(p => p.id === product.id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...product };
    } else {
      list.unshift(product);
    }
    this.saveAll(list);
    return list;
  },

  delete(productId) {
    if (!productId) return;
    const list = this.getAll();
    const filtered = list.filter(p => p.id !== productId);
    this.saveAll(filtered);
    return filtered;
  },

  resetToDefaults() {
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
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading from OrderStorage:', e);
    }
    return [];
  },

  saveAll(orders) {
    try {
      if (Array.isArray(orders)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
      }
    } catch (e) {
      console.warn('Error saving to OrderStorage:', e);
    }
  },

  upsert(order) {
    if (!order) return;
    const key = order.orderNumber || order.id;
    if (!key) return;
    const list = this.getAll();
    const idx = list.findIndex(o => (o.orderNumber && o.orderNumber === key) || (o.id && o.id === key));
    if (idx > -1) {
      list[idx] = { ...list[idx], ...order };
    } else {
      list.unshift(order);
    }
    this.saveAll(list);
    return list;
  },

  delete(orderId) {
    if (!orderId) return;
    const list = this.getAll();
    const filtered = list.filter(o => o.id !== orderId && o.orderNumber !== orderId);
    this.saveAll(filtered);
    return filtered;
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
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
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading from InquiryStorage:', e);
    }
    return [];
  },

  saveAll(inquiries) {
    try {
      if (Array.isArray(inquiries)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(inquiries));
      }
    } catch (e) {
      console.warn('Error saving to InquiryStorage:', e);
    }
  },

  upsert(inquiry) {
    if (!inquiry || !inquiry.id) return;
    const list = this.getAll();
    const idx = list.findIndex(i => i.id === inquiry.id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...inquiry };
    } else {
      list.unshift(inquiry);
    }
    this.saveAll(list);
    return list;
  },

  delete(inquiryId) {
    if (!inquiryId) return;
    const list = this.getAll();
    const filtered = list.filter(i => i.id !== inquiryId);
    this.saveAll(filtered);
    return filtered;
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

window.ProductStorage = ProductStorage;
window.OrderStorage = OrderStorage;
window.InquiryStorage = InquiryStorage;

