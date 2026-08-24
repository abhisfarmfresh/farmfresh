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

    const savedApiKey = (typeof localStorage !== 'undefined') ? localStorage.getItem('aff_firebase_api_key') : null;
    const baseConfig = (typeof firebaseConfig !== 'undefined') ? firebaseConfig : {
      apiKey: "",
      authDomain: "abhisfarmfresh-3e7d3.firebaseapp.com",
      projectId: "abhisfarmfresh-3e7d3",
      storageBucket: "abhisfarmfresh-3e7d3.firebasestorage.app",
      messagingSenderId: "763350925496",
      appId: "1:763350925496:web:3750a3eee35a3d8085b44d",
      measurementId: "G-XEXNM98B50"
    };

    const effectiveApiKey = (savedApiKey || baseConfig.apiKey || '').trim();

    try {
      const config = {
        ...baseConfig,
        apiKey: effectiveApiKey
      };

      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }

      this.db = firebase.firestore();

      // Enable Firestore settings for robustness against undefined fields
      try {
        this.db.settings({ ignoreUndefinedProperties: true });
      } catch (sErr) {}

      try {
        this.auth = firebase.auth();
      } catch (authErr) {
        console.warn('Auth note:', authErr.message);
      }

      // Enable offline tab synchronization for seamless caching
      try {
        this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      } catch (pErr) {}

      this._initialized = true;
      console.log('🔥 Live Firebase initialized for project:', config.projectId);
    } catch (err) {
      console.error('Firebase Initialization Error:', err.message);
      this._initialized = false;
      this.db = null;
    }

    this.updateConnectionBadge();
  },

  /**
   * Sanitize an object to ensure it contains no `undefined` properties before sending to Firestore
   */
  _cleanForFirestore(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    // Keep Date instances intact
    if (obj instanceof Date) return obj;
    // Keep Firestore FieldValue and Timestamp objects intact
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      if (typeof firebase.firestore.Timestamp === 'function' && obj instanceof firebase.firestore.Timestamp) {
        return obj;
      }
      if (typeof firebase.firestore.FieldValue === 'function') {
        try {
          if (obj instanceof firebase.firestore.FieldValue) return obj;
        } catch (e) {}
      }
      if (obj && (obj.constructor?.name === 'FieldValue' || obj._methodName || (typeof obj.toDate === 'function' && typeof obj.isEqual === 'function'))) {
        return obj;
      }
    }
    if (Array.isArray(obj)) {
      return obj
        .map(item => this._cleanForFirestore(item))
        .filter(item => item !== undefined);
    }
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = this._cleanForFirestore(value);
      }
    }
    return clean;
  },

  /**
   * Diagnostic method to test connection to Firebase servers with latency check
   */
  async testConnection(apiKeyOverride = null) {
    const keyToTest = apiKeyOverride || (typeof localStorage !== 'undefined' ? localStorage.getItem('aff_firebase_api_key') : null) || (typeof firebaseConfig !== 'undefined' ? firebaseConfig.apiKey : '');
    const startTime = performance.now();
    try {
      const restUrl = 'https://firestore.googleapis.com/v1/projects/abhisfarmfresh-3e7d3/databases/(default)/documents/products?pageSize=1';
      const res = await fetch(restUrl);
      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        return { success: true, latency, message: 'Connected directly to Cloud Firestore' };
      } else {
        return { success: false, latency, message: `Firestore returned status ${res.status}` };
      }
    } catch (err) {
      return { success: false, latency: 0, message: err.message };
    }
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

    const projectId = (typeof firebaseConfig !== 'undefined' && firebaseConfig.projectId) ? firebaseConfig.projectId : 'abhisfarmfresh-3e7d3';
    if (this.isReady()) {
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Firestore Live: ${projectId}</span>`;
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Connecting to ${projectId}...</span>`;
    }
  },

  // ─── DATA NORMALIZATION HELPERS ───────────────────────

  /**
   * Normalize an order object to ensure all required fields and aliases exist
   */
  _normalizeOrder(id, data) {
    if (!data) return null;
    const grandTotal = Number(data.grandTotal ?? data.total ?? data.subtotal ?? data.totalAmount ?? 0);
    const subtotal = Number(data.subtotal ?? data.grandTotal ?? data.total ?? 0);
    const total = grandTotal || subtotal;
    const totalQuantity = Number(data.totalQuantity ?? (data.items || []).reduce((sum, it) => sum + Number(it.quantity || it.qty || 1), 0));
    const customerName = (data.customerName || data.name || 'Customer').toString().trim();
    const phone = (data.phone || '').toString().trim();
    const email = (data.email || '').toString().trim();
    const shopName = (data.shopName || '').toString().trim();
    const deliveryAddress = (data.deliveryAddress || data.businessAddress || data.address || '').toString().trim();
    const businessAddress = (data.businessAddress || deliveryAddress).toString().trim();
    
    // Normalize items
    const items = (data.items || []).map(it => {
      const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
      const quantity = Number(it.quantity ?? it.qty ?? 1);
      const totalPrice = Number(it.totalPrice ?? it.total ?? (unitPrice * quantity));
      const productName = (it.productName || it.name || 'Produce Item').toString().trim();
      return {
        productId: (it.productId || it.id || '').toString(),
        id: (it.productId || it.id || '').toString(),
        productName,
        name: productName,
        unit: (it.unit || 'KG').toString(),
        quantity,
        qty: quantity,
        unitPrice,
        price: unitPrice,
        totalPrice,
        total: totalPrice,
        imageUrl: (it.imageUrl || 'images/farm_fresh_media_01.jpeg').toString()
      };
    });

    // Parse created date robustly
    let createdAt = data.createdAt;
    if (createdAt && typeof createdAt.toDate === 'function') {
      createdAt = createdAt.toDate();
    } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      createdAt = new Date(createdAt);
    } else if (!(createdAt instanceof Date)) {
      createdAt = new Date();
    }

    const docId = id || data.id || null;
    const orderNumber = (data.orderNumber || docId || (window.AFF_CONFIG ? window.AFF_CONFIG.generateOrderNumber() : `AFF-${Date.now()}`)).toString();

    const normalized = {
      orderNumber,
      customerName,
      name: customerName,
      shopName,
      phone,
      email,
      businessAddress,
      deliveryAddress,
      address: deliveryAddress,
      paymentMethod: (data.paymentMethod || 'UPI / Online').toString(),
      items,
      totalQuantity,
      subtotal,
      grandTotal: total,
      total,
      totalAmount: total,
      status: (data.status || 'pending').toString().toLowerCase(),
      adminNotes: (data.adminNotes || '').toString(),
      rejectionReason: (data.rejectionReason || '').toString(),
      confirmedAt: data.confirmedAt || null,
      rejectedAt: data.rejectedAt || null,
      createdAt,
      updatedAt: data.updatedAt || null
    };

    if (docId) {
      normalized.id = docId.toString();
    }

    return normalized;
  },

  /**
   * Normalize a produce item object
   */
  _normalizeProduct(id, data) {
    if (!data) return null;
    const price = Number(data.price) || 0;
    const stock = (data.stock !== undefined && data.stock !== null) ? Number(data.stock) : 500;
    const minQty = Number(data.minQty) || 1;
    const discountPrice = (data.discountPrice !== undefined && data.discountPrice !== null && data.discountPrice !== '') ? Number(data.discountPrice) : null;
    return {
      ...data,
      id: id || data.id,
      name: data.name || 'Produce Item',
      slug: data.slug || data.id,
      category: data.category || 'everyday',
      price,
      discountPrice,
      unit: data.unit || 'KG',
      minQty,
      stock,
      sku: data.sku || data.id || '',
      description: data.description || '',
      imageUrl: data.imageUrl || 'images/farm_fresh_media_01.jpeg',
      origin: data.origin || '',
      shelfLife: data.shelfLife || '',
      badges: Array.isArray(data.badges) ? data.badges : [],
      status: (stock <= 0 || data.status === 'out_of_stock') ? 'out_of_stock' : (data.status || 'available'),
      isActive: data.isActive !== false && data.status !== 'inactive',
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    };
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
          const list = snap.docs.map(doc => this._normalizeProduct(doc.id, doc.data()));
          if (window.ProductStorage) window.ProductStorage.saveAll(list);
          return list
            .filter(p => p.isActive !== false && p.status !== 'inactive')
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
      } catch (err) {
        console.warn('Firestore fetch failed, reading from local persistence:', err.message);
      }
    }

    const fallback = (window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []))
      .map(p => this._normalizeProduct(p.id, p));
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
          const list = snap.docs.map(doc => this._normalizeProduct(doc.id, doc.data()));
          if (window.ProductStorage) window.ProductStorage.saveAll(list);
          return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
      } catch (err) {
        console.warn('Firestore fetch failed, reading from local persistence:', err.message);
      }
    }

    const fallback = (window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []))
      .map(p => this._normalizeProduct(p.id, p));
    return fallback.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  /**
   * Get a single product by ID
   */
  async getProduct(productId) {
    if (this.isReady()) {
      try {
        const doc = await this.db.collection('products').doc(productId).get();
        if (doc.exists) return this._normalizeProduct(doc.id, doc.data());
      } catch (err) {
        console.warn('Firestore getProduct failed:', err.message);
      }
    }

    const list = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
    const found = list.find(p => String(p.id) === String(productId));
    return found ? this._normalizeProduct(found.id, found) : null;
  },

  /**
   * Add a new product — guaranteed persistence
   */
  async addProduct(productData) {
    const docId = productData.id || `prod_${Date.now()}`;
    productData.id = docId;
    const normalized = this._normalizeProduct(docId, productData);

    // 1. Immediately save to persistent storage
    if (window.ProductStorage) {
      window.ProductStorage.upsert(normalized);
    }

    // 2. Sync to Firestore if live
    if (this.isReady()) {
      try {
        normalized.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        normalized.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await this.db.collection('products').doc(docId).set(normalized, { merge: true });
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
    const normalized = this._normalizeProduct(productId, updates);

    // 1. Immediately save to persistent storage
    if (window.ProductStorage) {
      window.ProductStorage.upsert({ id: productId, ...normalized });
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
        const data = this._normalizeProduct(docId, { ...p, createdAt: now, updatedAt: now });
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
    if (!this.isReady()) {
      this.init();
    }

    const docRef = (this.isReady() && this.db) ? this.db.collection('orders').doc() : null;
    const docId = docRef ? docRef.id : (`order_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
    const orderNumber = (orderData && orderData.orderNumber) ? orderData.orderNumber : (window.AFF_CONFIG ? window.AFF_CONFIG.generateOrderNumber() : `AFF-${Date.now()}`);

    const normalized = this._normalizeOrder(docId, {
      ...orderData,
      id: docId,
      orderNumber
    });

    // 1. Immediately persist to OrderStorage with ISO date string
    if (window.OrderStorage) {
      window.OrderStorage.upsert({
        ...normalized,
        createdAt: (normalized.createdAt instanceof Date) ? normalized.createdAt.toISOString() : new Date().toISOString()
      });
    }

    // 2. Push to Firestore if live
    if (this.isReady() && docRef) {
      try {
        const firestorePayload = this._cleanForFirestore({
          ...normalized,
          id: docId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await docRef.set(firestorePayload);
        console.log('✅ Order successfully stored in Cloud Firestore:', docId, orderNumber);
        return docId;
      } catch (err) {
        console.error('❌ Firestore order write error:', err);
      }
    } else {
      console.warn('⚠️ Firestore is offline. Order saved to local persistence.');
    }

    return docId;
  },

  /**
   * Get a single order by Firestore doc ID or Order Number
   */
  async getOrder(orderId) {
    if (!this.isReady()) {
      this.init();
    }

    if (this.isReady() && orderId) {
      try {
        // 1. Try by direct Document ID
        const doc = await this.db.collection('orders').doc(orderId).get();
        if (doc.exists) return this._normalizeOrder(doc.id, doc.data());

        // 2. Try querying by orderNumber
        const snap = await this.db.collection('orders')
          .where('orderNumber', '==', orderId)
          .limit(1)
          .get();
        if (!snap.empty) {
          const firstDoc = snap.docs[0];
          return this._normalizeOrder(firstDoc.id, firstDoc.data());
        }
      } catch (err) {
        console.warn('Firestore getOrder note:', err.message);
      }
    }

    const list = window.OrderStorage ? window.OrderStorage.getAll() : [];
    const found = list.find(o => String(o.id) === String(orderId) || String(o.orderNumber) === String(orderId));
    return found ? this._normalizeOrder(found.id, found) : null;
  },

  /**
   * Get all orders — pure real data (Firestore + local OrderStorage)
   */
  async getAllOrders() {
    if (!this.isReady()) {
      this.init();
    }

    let cloudOrders = null;
    if (this.isReady()) {
      try {
        const snap = await this.db.collection('orders')
          .orderBy('createdAt', 'desc')
          .get();
        cloudOrders = snap.docs.map(doc => this._normalizeOrder(doc.id, doc.data()));
      } catch (err) {
        console.warn('Firestore getAllOrders error (reading local persistence):', err.message);
      }
    }

    // If Firestore was queried successfully, treat cloud as authoritative single source of truth
    if (cloudOrders !== null) {
      if (window.OrderStorage) {
        window.OrderStorage.saveAll(cloudOrders);
      }
      return cloudOrders;
    }

    // Offline fallback to local storage
    const localOrders = (window.OrderStorage ? window.OrderStorage.getAll() : [])
      .map(o => this._normalizeOrder(o.id, o))
      .sort((a, b) => {
        const ta = (a.createdAt instanceof Date) ? a.createdAt.getTime() : (new Date(a.createdAt || 0).getTime() || 0);
        const tb = (b.createdAt instanceof Date) ? b.createdAt.getTime() : (new Date(b.createdAt || 0).getTime() || 0);
        return tb - ta;
      });

    return localOrders;
  },

  /**
   * Subscribe to real-time order updates (Firestore onSnapshot + window storage event)
   */
  subscribeToOrders(callback) {
    if (typeof callback !== 'function') return () => {};

    let unsubscribeFirestore = () => {};

    if (!this.isReady()) {
      this.init();
    }

    if (this.isReady()) {
      try {
        unsubscribeFirestore = this.db.collection('orders')
          .orderBy('createdAt', 'desc')
          .onSnapshot(snap => {
            const list = snap.docs.map(doc => this._normalizeOrder(doc.id, doc.data()));
            if (window.OrderStorage) window.OrderStorage.saveAll(list);
            callback(list);
          }, err => {
            console.warn('Orders onSnapshot error:', err.message);
          });
      } catch (e) {
        console.warn('Could not attach Firestore onSnapshot listener:', e.message);
      }
    }

    const handleStorageChange = (e) => {
      if (e.key === 'aff_orders_store') {
        const local = window.OrderStorage ? window.OrderStorage.getAll() : [];
        callback(local);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      try { unsubscribeFirestore(); } catch (e) {}
      window.removeEventListener('storage', handleStorageChange);
    };
  },

  /**
   * Get orders by status — admin only
   */
  async getOrdersByStatus(status) {
    const all = await this.getAllOrders();
    return all.filter(o => (o.status || 'pending').toLowerCase() === (status || '').toLowerCase());
  },

  /**
   * Update order status — admin only
   */
  async updateOrderStatus(orderId, status, extras = {}) {
    if (!this.isReady()) {
      this.init();
    }

    // 1. Update in local storage
    if (window.OrderStorage) {
      const list = window.OrderStorage.getAll();
      const idx = list.findIndex(o => String(o.id) === String(orderId) || String(o.orderNumber) === String(orderId));
      if (idx > -1) {
        list[idx] = { 
          ...list[idx], 
          status, 
          ...extras, 
          updatedAt: new Date().toISOString() 
        };
        window.OrderStorage.saveAll(list);
      }
    }

    // 2. Update in Firestore if live
    if (this.isReady() && orderId) {
      try {
        const updates = { 
          status, 
          ...extras,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (status === 'confirmed') {
          updates.confirmedAt = firebase.firestore.FieldValue.serverTimestamp();
        } else if (status === 'rejected') {
          updates.rejectedAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        const cleanUpdates = this._cleanForFirestore(updates);
        
        // Try direct doc update first
        try {
          await this.db.collection('orders').doc(orderId).update(cleanUpdates);
          console.log('✅ Order status updated in Firestore:', orderId, '→', status);
        } catch (directErr) {
          // If not found by doc ID, search by orderNumber
          const snap = await this.db.collection('orders').where('orderNumber', '==', orderId).limit(1).get();
          if (!snap.empty) {
            await snap.docs[0].ref.update(cleanUpdates);
            console.log('✅ Order status updated by orderNumber in Firestore:', orderId, '→', status);
          } else {
            throw directErr;
          }
        }
      } catch (err) {
        console.warn('Firestore updateOrderStatus note (saved locally):', err.message);
      }
    }

    return true;
  },

  // ─── CUSTOMERS ──────────────────────────────────────────

  /**
   * Upsert customer record (atomic set with merge)
   */
  async upsertCustomer(customerData) {
    if (!this.isReady()) {
      this.init();
    }
    if (!customerData || !customerData.phone) return null;

    try {
      const phone = (customerData.phone.replace(/\D/g, '') || customerData.phone.trim()).toString();
      if (!phone) return null;

      if (this.isReady() && this.db) {
        const customerRef = this.db.collection('customers').doc(phone);
        const payload = this._cleanForFirestore({
          name: (customerData.name || 'Customer').toString().trim(),
          shopName: (customerData.shopName || '').toString().trim(),
          phone: customerData.phone.toString().trim(),
          email: (customerData.email || '').toString().trim(),
          address: (customerData.address || '').toString().trim(),
          totalOrders: firebase.firestore.FieldValue.increment(1),
          totalAmount: firebase.firestore.FieldValue.increment(Number(customerData.orderTotal) || 0),
          lastOrderDate: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await customerRef.set(payload, { merge: true });
        console.log('✅ Customer upserted in Firestore:', phone);
      }
      return phone;
    } catch (err) {
      console.warn('Customer upsert note (non-blocking):', err.message);
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
   * Fetch all customer contact inquiries (Firestore + local InquiryStorage)
   */
  async getInquiries() {
    let cloudInquiries = [];
    if (this.isReady()) {
      try {
        const snap = await this.db.collection('inquiries').orderBy('createdAt', 'desc').get();
        cloudInquiries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('Firestore getInquiries error (reading local persistence):', err.message);
      }
    }

    const localInquiries = window.InquiryStorage ? window.InquiryStorage.getAll() : [];
    const map = new Map();
    localInquiries.forEach(i => { if (i.id) map.set(i.id, i); });
    cloudInquiries.forEach(i => { if (i.id) map.set(i.id, i); });

    const merged = Array.from(map.values()).sort((a, b) => {
      const ta = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate().getTime() : (new Date(a.createdAt || 0).getTime() || 0);
      const tb = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate().getTime() : (new Date(b.createdAt || 0).getTime() || 0);
      return tb - ta;
    });

    if (window.InquiryStorage) {
      window.InquiryStorage.saveAll(merged);
    }
    return merged;
  },

  /**
   * Add a new customer inquiry
   */
  async addInquiry(inquiryData) {
    const id = inquiryData.id || `inq_${Date.now()}`;
    inquiryData.id = id;
    inquiryData.status = inquiryData.status || 'unread';

    if (window.InquiryStorage) {
      window.InquiryStorage.upsert(inquiryData);
    }

    if (this.isReady()) {
      try {
        inquiryData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await this.db.collection('inquiries').doc(id).set(inquiryData, { merge: true });
        console.log('✅ Inquiry saved to Firestore:', id);
      } catch (err) {
        console.warn('Firestore addInquiry sync error (saved locally):', err.message);
      }
    }

    return id;
  },

  /**
   * Update inquiry status ('unread', 'contacted', 'resolved')
   */
  async updateInquiryStatus(inquiryId, status) {
    if (window.InquiryStorage) {
      const list = window.InquiryStorage.getAll();
      const item = list.find(i => String(i.id) === String(inquiryId));
      if (item) {
        item.status = status;
        window.InquiryStorage.saveAll(list);
      }
    }

    if (this.isReady()) {
      try {
        await this.db.collection('inquiries').doc(inquiryId).update({
          status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Inquiry status updated in Firestore:', inquiryId, '→', status);
        return true;
      } catch (err) {
        console.warn('Firestore updateInquiryStatus error:', err.message);
        return false;
      }
    }
    return true;
  },

  /**
   * Delete an inquiry
   */
  async deleteInquiry(inquiryId) {
    if (window.InquiryStorage) {
      window.InquiryStorage.delete(inquiryId);
    }

    if (this.isReady()) {
      try {
        await this.db.collection('inquiries').doc(inquiryId).delete();
        console.log('✅ Inquiry deleted from Firestore:', inquiryId);
        return true;
      } catch (err) {
        console.warn('Firestore deleteInquiry error:', err.message);
        return false;
      }
    }
    return true;
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
