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
    if (this._initialized) return;

    if (typeof firebase === 'undefined') {
      console.warn('⚠️ Firebase SDK not loaded');
      return;
    }

    try {
      if (typeof firebaseConfig !== 'undefined') {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this._initialized = true;
        
        console.log('🔥 Live Firebase initialized for project:', firebaseConfig.projectId);
      }
    } catch (err) {
      console.error('Firebase Init Error:', err);
    }
  },

  /**
   * Check if Firebase is ready
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
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Firestore Live: ${projectId}</span>`;
  },

  // ─── PRODUCTS ──────────────────────────────────────────

  /**
   * Fetch all active products (robust query without requiring composite index)
   */
  async getProducts() {
    if (!this.isReady()) return [];
    try {
      const snap = await this.db.collection('products').get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return list
        .filter(p => p.isActive !== false && p.status !== 'inactive')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    }
  },

  /**
   * Fetch all products (including inactive) — for admin
   */
  async getAllProducts() {
    if (!this.isReady()) return [];
    try {
      const snap = await this.db.collection('products').get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (err) {
      console.error('Error fetching all products:', err);
      return [];
    }
  },

  /**
   * Get a single product by ID
   */
  async getProduct(productId) {
    if (!this.isReady()) return null;
    try {
      const doc = await this.db.collection('products').doc(productId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (err) {
      console.error('Error fetching product:', err);
      return null;
    }
  },

  /**
   * Add a new product — admin only
   */
  async addProduct(productData) {
    if (!this.isReady()) return null;
    try {
      productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      productData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await this.db.collection('products').add(productData);
      console.log('✅ Product added:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('Error adding product:', err);
      return null;
    }
  },

  /**
   * Update or upsert a product — admin only
   */
  async updateProduct(productId, updates) {
    if (!this.isReady()) return false;
    try {
      updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await this.db.collection('products').doc(productId).set(updates, { merge: true });
      console.log('✅ Product updated/saved:', productId);
      return true;
    } catch (err) {
      console.error('Error updating product in Firestore:', err);
      return false;
    }
  },

  /**
   * Delete a product — admin only
   */
  async deleteProduct(productId) {
    if (!this.isReady()) return false;
    try {
      await this.db.collection('products').doc(productId).delete();
      console.log('✅ Product deleted:', productId);
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      return false;
    }
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
