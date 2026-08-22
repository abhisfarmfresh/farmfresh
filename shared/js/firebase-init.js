/**
 * Abhis Farm Fresh — Firebase Initialization
 * Shared module: initializes Firebase App, Firestore, and Auth
 * 
 * Requires: firebase-config.js to be loaded BEFORE this script
 * Uses Firebase Compat SDK v10.12.0
 */

const FirebaseApp = {
  db: null,
  auth: null,
  _initialized: false,

  /**
   * Initialize Firebase services
   */
  init() {
    if (this._initialized && this.db) return;

    if (typeof firebase === 'undefined') {
      console.warn('⚠️ Firebase SDK not loaded');
      return;
    }

    try {
      if (typeof firebaseConfig !== 'undefined') {
        const customKey = localStorage.getItem('aff_firebase_api_key');
        if (customKey && customKey.trim() && customKey !== 'YOUR_FIREBASE_API_KEY_HERE') {
          firebaseConfig.apiKey = customKey.trim();
        }

        const isRealKey = firebaseConfig.apiKey && 
                          firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY_HERE" && 
                          firebaseConfig.apiKey.length > 10;

        if (isRealKey) {
          if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
          }
          this.db = firebase.firestore();
          this.auth = firebase.auth();
          this._initialized = true;
          console.log('🔥 Live Firebase initialized for project:', firebaseConfig.projectId);
        } else {
          this._initialized = true;
          this.db = null;
          console.log('💾 Firebase in persistent Local Storage mode (Enter API Key in Settings to connect cloud).');
        }
      }
    } catch (err) {
      console.warn('Firebase Init Note:', err.message);
      this._initialized = true;
    }

    this.updateConnectionBadge();
  },

  /**
   * Check if live Firebase Firestore is ready
   */
  isReady() {
    return this._initialized && this.db !== null;
  },

  /**
   * Update the live Firebase Connection indicator badge in DOM
   */
  updateConnectionBadge() {
    const badge = document.getElementById('firebase-connection-badge');
    if (!badge) return;

    if (this.isReady()) {
      const projectId = (typeof firebaseConfig !== 'undefined' && firebaseConfig.projectId) ? firebaseConfig.projectId : 'abhisfarmfresh-3e7d3';
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Firestore Live: ${projectId}</span>`;
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>Persistent Local Mode</span>`;
    }
  },

  // ─── PRODUCTS ──────────────────────────────────────────

  /**
   * Fetch all active products (guaranteed persistence)
   */
  async getProducts() {
    if (this.isReady()) {
      try {
        const snap = await this.db.collection('products').get();
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (window.ProductStorage) window.ProductStorage.saveAll(list);
          return list
            .filter(p => p.isActive !== false && p.status !== 'inactive')
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
      } catch (err) {
        console.warn('Firestore fetch failed, reading from local persistence:', err.message);
      }
    }

    const fallback = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
    return fallback
      .filter(p => p.isActive !== false && p.status !== 'inactive')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  /**
   * Fetch all products (including inactive) — for admin
   */
  async getAllProducts() {
    if (this.isReady()) {
      try {
        const snap = await this.db.collection('products').get();
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (window.ProductStorage) window.ProductStorage.saveAll(list);
          return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
      } catch (err) {
        console.warn('Firestore fetch failed, reading from local persistence:', err.message);
      }
    }

    const fallback = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
    return fallback.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  /**
   * Get a single product by ID
   */
  async getProduct(productId) {
    if (this.isReady()) {
      try {
        const doc = await this.db.collection('products').doc(productId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (err) {
        console.warn('Firestore getProduct failed:', err.message);
      }
    }

    const list = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
    return list.find(p => String(p.id) === String(productId)) || null;
  },

  /**
   * Add a new product — guaranteed persistence
   */
  async addProduct(productData) {
    const docId = productData.id || `prod_${Date.now()}`;
    productData.id = docId;

    // 1. Immediately save to persistent storage
    if (window.ProductStorage) {
      window.ProductStorage.upsert(productData);
    }

    // 2. Sync to Firestore if live
    if (this.isReady()) {
      try {
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        productData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await this.db.collection('products').doc(docId).set(productData, { merge: true });
        console.log('✅ Product saved to Firestore:', docId);
      } catch (err) {
        console.warn('Firestore addProduct sync error (saved locally):', err.message);
      }
    }

    return docId;
  },

  /**
   * Update or upsert a product — guaranteed persistence
   */
  async updateProduct(productId, updates) {
    // 1. Immediately save to persistent storage
    if (window.ProductStorage) {
      window.ProductStorage.upsert({ id: productId, ...updates });
    }

    // 2. Sync to Firestore if live
    if (this.isReady()) {
      try {
        updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await this.db.collection('products').doc(productId).set(updates, { merge: true });
        console.log('✅ Product updated in Firestore:', productId);
      } catch (err) {
        console.warn('Firestore updateProduct sync error (saved locally):', err.message);
      }
    }

    return true;
  },

  /**
   * Delete a product — guaranteed persistence
   */
  async deleteProduct(productId) {
    // 1. Immediately delete from persistent storage
    if (window.ProductStorage) {
      window.ProductStorage.delete(productId);
    }

    // 2. Sync to Firestore if live
    if (this.isReady()) {
      try {
        await this.db.collection('products').doc(productId).delete();
        console.log('✅ Product deleted from Firestore:', productId);
      } catch (err) {
        console.warn('Firestore deleteProduct sync error:', err.message);
      }
    }

    return true;
  },

  /**
   * Seed / Import default products into Firestore in batch
   */
  async seedDefaultProducts(products) {
    if (!this.isReady() || !Array.isArray(products) || products.length === 0) return 0;
    try {
      const batch = this.db.batch();
      const now = firebase.firestore.FieldValue.serverTimestamp();

      for (const p of products) {
        const docId = p.id || `prod_${p.slug || Date.now()}`;
        const docRef = this.db.collection('products').doc(docId);
        const data = {
          name: p.name,
          slug: p.slug || p.id,
          category: p.category || 'everyday',
          price: Number(p.price) || 0,
          unit: p.unit || 'KG',
          minQty: Number(p.minQty) || 1,
          stock: Number(p.stock) || 500,
          description: p.description || '',
          imageUrl: p.imageUrl || 'images/farm_fresh_media_01.jpeg',
          status: p.status || 'available',
          isActive: p.isActive !== false,
          createdAt: now,
          updatedAt: now
        };
        batch.set(docRef, data, { merge: true });
      }

      await batch.commit();
      console.log(`✅ Successfully seeded ${products.length} products to Firestore`);
      return products.length;
    } catch (err) {
      console.error('Error batch seeding products:', err);
      return 0;
    }
  },

  // ─── ORDERS ──────────────────────────────────────────

  /**
   * Create a new order — customer facing
   */
  async createOrder(orderData) {
    if (!this.isReady()) return null;
    try {
      orderData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await this.db.collection('orders').add(orderData);
      console.log('✅ Order created:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('Error creating order:', err);
      return null;
    }
  },

  /**
   * Get a single order by Firestore doc ID
   */
  async getOrder(orderId) {
    if (!this.isReady()) return null;
    try {
      const doc = await this.db.collection('orders').doc(orderId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (err) {
      console.error('Error fetching order:', err);
      return null;
    }
  },

  /**
   * Get all orders — admin only
   */
  async getAllOrders() {
    if (!this.isReady()) return [];
    try {
      const snap = await this.db.collection('orders')
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error fetching orders:', err);
      return [];
    }
  },

  /**
   * Get orders by status — admin only
   */
  async getOrdersByStatus(status) {
    if (!this.isReady()) return [];
    try {
      const snap = await this.db.collection('orders')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error fetching orders by status:', err);
      return [];
    }
  },

  /**
   * Update order status — admin only
   */
  async updateOrderStatus(orderId, status, extras = {}) {
    if (!this.isReady()) return false;
    try {
      const updates = { status, ...extras };
      if (status === 'confirmed') {
        updates.confirmedAt = firebase.firestore.FieldValue.serverTimestamp();
      } else if (status === 'rejected') {
        updates.rejectedAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      await this.db.collection('orders').doc(orderId).update(updates);
      console.log('✅ Order status updated:', orderId, '→', status);
      return true;
    } catch (err) {
      console.error('Error updating order:', err);
      return false;
    }
  },

  // ─── CUSTOMERS ──────────────────────────────────────────

  /**
   * Upsert customer record (create or update on order placement)
   */
  async upsertCustomer(customerData) {
    if (!this.isReady()) return null;
    try {
      // Use phone number as the unique key
      const phone = customerData.phone.replace(/\D/g, '');
      const customerRef = this.db.collection('customers').doc(phone);
      const existing = await customerRef.get();

      if (existing.exists) {
        // Update existing customer
        await customerRef.update({
          name: customerData.name,
          shopName: customerData.shopName,
          email: customerData.email,
          address: customerData.address,
          totalOrders: firebase.firestore.FieldValue.increment(1),
          totalAmount: firebase.firestore.FieldValue.increment(customerData.orderTotal || 0),
          lastOrderDate: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Create new customer
        await customerRef.set({
          name: customerData.name,
          shopName: customerData.shopName,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
          totalOrders: 1,
          totalAmount: customerData.orderTotal || 0,
          lastOrderDate: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log('✅ Customer upserted:', phone);
      return phone;
    } catch (err) {
      console.error('Error upserting customer:', err);
      return null;
    }
  },

  /**
   * Get all customers — admin only
   */
  async getAllCustomers() {
    if (!this.isReady()) return [];
    try {
      const snap = await this.db.collection('customers')
        .orderBy('lastOrderDate', 'desc')
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error fetching customers:', err);
      return [];
    }
  },

  /**
   * Get orders for a specific customer phone — admin
   */
  async getCustomerOrders(phone) {
    if (!this.isReady()) return [];
    try {
      const snap = await this.db.collection('orders')
        .where('phone', '==', phone)
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error fetching customer orders:', err);
      return [];
    }
  },

  // ─── CATEGORIES ───────────────────────────────────────

  /**
   * Fetch all product categories
   */
  async getCategories() {
    if (!this.isReady()) {
      return (typeof AFF_CONFIG !== 'undefined' && AFF_CONFIG.categories) ? AFF_CONFIG.categories : [];
    }
    try {
      const snap = await this.db.collection('categories').orderBy('order', 'asc').get();
      if (snap.empty) {
        return (typeof AFF_CONFIG !== 'undefined' && AFF_CONFIG.categories) ? AFF_CONFIG.categories : [];
      }
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn('Error fetching categories from Firestore, using config fallback:', err);
      return (typeof AFF_CONFIG !== 'undefined' && AFF_CONFIG.categories) ? AFF_CONFIG.categories : [];
    }
  },

  /**
   * Add or upsert a category
   */
  async addCategory(catData) {
    if (!this.isReady()) return null;
    try {
      catData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      catData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      const docId = catData.id || `cat_${Date.now()}`;
      await this.db.collection('categories').doc(docId).set(catData, { merge: true });
      console.log('✅ Category saved:', docId);
      return docId;
    } catch (err) {
      console.error('Error adding category:', err);
      return null;
    }
  },

  /**
   * Update category
   */
  async updateCategory(catId, updates) {
    if (!this.isReady()) return false;
    try {
      updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await this.db.collection('categories').doc(catId).set(updates, { merge: true });
      console.log('✅ Category updated:', catId);
      return true;
    } catch (err) {
      console.error('Error updating category:', err);
      return false;
    }
  },

  /**
   * Delete category
   */
  async deleteCategory(catId) {
    if (!this.isReady()) return false;
    try {
      await this.db.collection('categories').doc(catId).delete();
      console.log('✅ Category deleted:', catId);
      return true;
    } catch (err) {
      console.error('Error deleting category:', err);
      return false;
    }
  },

  // ─── INQUIRIES & LEADS ────────────────────────────────

  /**
   * Fetch all customer contact inquiries
   */
  async getInquiries() {
    if (!this.isReady()) return [];
    try {
      const snap = await this.db.collection('inquiries').orderBy('createdAt', 'desc').get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error fetching inquiries:', err);
      return [];
    }
  },

  /**
   * Add a new customer inquiry
   */
  async addInquiry(inquiryData) {
    if (!this.isReady()) return null;
    try {
      inquiryData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      inquiryData.status = inquiryData.status || 'unread';
      const docRef = await this.db.collection('inquiries').add(inquiryData);
      console.log('✅ Inquiry saved:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('Error adding inquiry:', err);
      return null;
    }
  },

  /**
   * Update inquiry status ('unread', 'contacted', 'resolved')
   */
  async updateInquiryStatus(inquiryId, status) {
    if (!this.isReady()) return false;
    try {
      await this.db.collection('inquiries').doc(inquiryId).update({
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Inquiry status updated:', inquiryId, '→', status);
      return true;
    } catch (err) {
      console.error('Error updating inquiry:', err);
      return false;
    }
  },

  /**
   * Delete an inquiry
   */
  async deleteInquiry(inquiryId) {
    if (!this.isReady()) return false;
    try {
      await this.db.collection('inquiries').doc(inquiryId).delete();
      console.log('✅ Inquiry deleted:', inquiryId);
      return true;
    } catch (err) {
      console.error('Error deleting inquiry:', err);
      return false;
    }
  },

  // ─── SETTINGS & PROMO BANNER ──────────────────────────

  /**
   * Get storewide promo banner settings
   */
  async getBannerSettings() {
    if (!this.isReady()) {
      return {
        enabled: true,
        text: '🌱 Daily 5 AM Fresh Harvest Picked & Shipped! Min Order 1 KG • Use code FRESH15 for bulk discount',
        code: 'FRESH15',
        linkText: 'Shop Vegetables',
        linkUrl: 'products.html',
        theme: 'emerald' // emerald, ocean, amber, violet
      };
    }
    try {
      const doc = await this.db.collection('settings').doc('banner').get();
      if (doc.exists) {
        return doc.data();
      }
      return {
        enabled: true,
        text: '🌱 Daily 5 AM Fresh Harvest Picked & Shipped! Min Order 1 KG • Use code FRESH15 for bulk discount',
        code: 'FRESH15',
        linkText: 'Shop Vegetables',
        linkUrl: 'products.html',
        theme: 'emerald'
      };
    } catch (err) {
      console.warn('Error fetching banner settings:', err);
      return {
        enabled: true,
        text: '🌱 Daily 5 AM Fresh Harvest Picked & Shipped! Min Order 1 KG',
        code: 'FRESH15',
        linkText: 'Shop Vegetables',
        linkUrl: 'products.html',
        theme: 'emerald'
      };
    }
  },

  /**
   * Save storewide promo banner settings
   */
  async saveBannerSettings(bannerData) {
    if (!this.isReady()) {
      localStorage.setItem('aff_promo_banner', JSON.stringify(bannerData));
      return true;
    }
    try {
      bannerData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await this.db.collection('settings').doc('banner').set(bannerData, { merge: true });
      localStorage.setItem('aff_promo_banner', JSON.stringify(bannerData));
      console.log('✅ Banner settings saved');
      return true;
    } catch (err) {
      console.error('Error saving banner settings:', err);
      return false;
    }
  },

  /**
   * Get Cloudinary & App settings
   */
  async getAppSettings() {
    const defaultSettings = {
      cloudName: 'abhisfarmfresh',
      uploadPreset: 'jpnbyoak',
      folder: 'abhis/farmfresh'
    };
    if (!this.isReady()) {
      const stored = localStorage.getItem('aff_cloudinary_settings');
      return stored ? JSON.parse(stored) : defaultSettings;
    }
    try {
      const doc = await this.db.collection('settings').doc('cloudinary').get();
      if (doc.exists) {
        return doc.data();
      }
      return defaultSettings;
    } catch (err) {
      return defaultSettings;
    }
  },

  /**
   * Save Cloudinary & App settings
   */
  async saveAppSettings(settingsData) {
    localStorage.setItem('aff_cloudinary_settings', JSON.stringify(settingsData));
    if (!this.isReady()) return true;
    try {
      settingsData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await this.db.collection('settings').doc('cloudinary').set(settingsData, { merge: true });
      console.log('✅ Cloudinary settings saved to Firestore');
      return true;
    } catch (err) {
      console.error('Error saving app settings:', err);
      return false;
    }
  },

  /**
   * Get total document counts across collections for diagnostics
   */
  async getDatabaseStats() {
    if (!this.isReady()) return { connected: false, products: 0, orders: 0, customers: 0, inquiries: 0 };
    try {
      const [prodSnap, orderSnap, custSnap, inqSnap] = await Promise.all([
        this.db.collection('products').get().catch(() => ({ size: 0 })),
        this.db.collection('orders').get().catch(() => ({ size: 0 })),
        this.db.collection('customers').get().catch(() => ({ size: 0 })),
        this.db.collection('inquiries').get().catch(() => ({ size: 0 }))
      ]);
      return {
        connected: true,
        projectId: firebaseConfig.projectId,
        products: prodSnap.size,
        orders: orderSnap.size,
        customers: custSnap.size,
        inquiries: inqSnap.size
      };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  },

  // ─── AUTH ──────────────────────────────────────────

  /**
   * Admin sign in with email + password
   */
  async signIn(email, password) {
    if (!this.auth) return { success: false, error: 'Auth not initialized' };
    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      console.log('✅ Admin signed in:', result.user.email);
      return { success: true, user: result.user };
    } catch (err) {
      console.error('Sign in error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Sign out
   */
  async signOut() {
    if (!this.auth) return;
    try {
      await this.auth.signOut();
      console.log('✅ Signed out');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.auth ? this.auth.currentUser : null;
  },

  /**
   * Listen for auth state changes
   */
  onAuthChange(callback) {
    if (!this.auth) return;
    this.auth.onAuthStateChanged(callback);
  }
};

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  FirebaseApp.init();
});

// Make globally available
window.FirebaseApp = FirebaseApp;
