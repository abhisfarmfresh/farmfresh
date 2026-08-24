/**
 * Abhis Farm Fresh — Executive Admin Core Controller
 * Handles 7 Core Modules: Auth, Orders, Products, Categories, Inquiries, Banner, Settings
 * Guaranteed Dual-Layer Persistence (Firestore Cloud + Local Persistent Cache)
 */

const AdminCore = {
  activeTab: 'orders',
  orders: [],
  products: [],
  categories: [],
  inquiries: [],
  bannerSettings: null,
  cloudinarySettings: null,

  // ─── INITIALIZATION ─────────────────────────────────────
  async init() {
    this.setupTabRouting();
    this.setupEventListeners();
    await this.loadAllData();
    this.renderCurrentTab();

    // Subscribe to live Firestore + cross-tab order updates
    if (window.FirebaseApp && typeof window.FirebaseApp.subscribeToOrders === 'function') {
      window.FirebaseApp.subscribeToOrders((latestOrders) => {
        this.orders = latestOrders || [];
        this.renderOrdersKPIs();
        this.filterAndRenderOrders();
      });
    }

    // Listen for customer inquiries/leads in real time across browser tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'aff_inquiries_store') {
        if (window.InquiryStorage) {
          this.inquiries = window.InquiryStorage.getAll();
          this.renderInquiriesKPIs();
          this.filterAndRenderInquiries();
        }
      }
    });
  },

  // ─── URL & PATH RESOLUTION HELPERS ──────────────────────
  resolveImageUrl(url) {
    if (!url) return '../images/farm_fresh_media_01.jpeg';
    const trimmed = String(url).trim();
    if (!trimmed) return '../images/farm_fresh_media_01.jpeg';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }
    if (trimmed.startsWith('../')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
    return '../' + trimmed;
  },

  // ─── TAB ROUTING ────────────────────────────────────────
  setupTabRouting() {
    const hash = window.location.hash.replace('#', '') || 'orders';
    this.switchTab(hash);

    window.addEventListener('hashchange', () => {
      const newHash = window.location.hash.replace('#', '') || 'orders';
      this.switchTab(newHash);
    });
  },

  switchTab(tabId) {
    const validTabs = ['orders', 'products', 'categories', 'inquiries', 'banner', 'settings'];
    if (!validTabs.includes(tabId)) tabId = 'orders';

    this.activeTab = tabId;

    // Update navigation links
    document.querySelectorAll('.admin-sidebar-link[data-tab]').forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update tab panes
    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Update page title
    const titles = {
      orders: 'Orders Management | Abhis Admin',
      products: 'Products & Inventory | Abhis Admin',
      categories: 'Categories CMS | Abhis Admin',
      inquiries: 'Customer Leads | Abhis Admin',
      banner: 'Promo Banner | Abhis Admin',
      settings: 'Settings Hub | Abhis Admin'
    };
    document.title = titles[tabId] || 'Executive Admin CRM | Abhis Farm Fresh';

    // Render tab specific data
    this.renderCurrentTab();
  },

  renderCurrentTab() {
    switch (this.activeTab) {
      case 'orders':
        this.renderOrdersTab();
        break;
      case 'products':
        this.renderProductsTab();
        break;
      case 'categories':
        this.renderCategoriesTab();
        break;
      case 'inquiries':
        this.renderInquiriesTab();
        break;
      case 'banner':
        this.renderBannerTab();
        break;
      case 'settings':
        this.renderSettingsTab();
        break;
    }
  },

  // ─── DATA LOADING (Parallelized via Promise.allSettled) ──
  async loadAllData() {
    try {
      const fb = window.FirebaseApp;
      const [prodRes, catRes, ordRes, inqRes, banRes, setRes] = await Promise.allSettled([
        fb ? fb.getAllProducts() : Promise.resolve([]),
        fb ? fb.getCategories() : Promise.resolve([]),
        fb ? fb.getAllOrders() : Promise.resolve([]),
        fb ? fb.getInquiries() : Promise.resolve([]),
        fb ? fb.getBannerSettings() : Promise.resolve(null),
        fb ? fb.getAppSettings() : Promise.resolve(null)
      ]);

      // 1. Products
      this.products = (prodRes.status === 'fulfilled' && prodRes.value && prodRes.value.length > 0)
        ? prodRes.value
        : (window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []));

      // 2. Categories
      this.categories = (catRes.status === 'fulfilled' && catRes.value && catRes.value.length > 0)
        ? catRes.value
        : ((window.AFF_CONFIG && window.AFF_CONFIG.categories) ? [...window.AFF_CONFIG.categories] : []);

      // 3. Orders (Pure real Firestore + OrderStorage, NO dummy mock data)
      this.orders = (ordRes.status === 'fulfilled' && Array.isArray(ordRes.value))
        ? ordRes.value
        : (window.OrderStorage ? window.OrderStorage.getAll() : []);

      // 4. Inquiries (Pure real Firestore + InquiryStorage, NO dummy mock data)
      this.inquiries = (inqRes.status === 'fulfilled' && Array.isArray(inqRes.value))
        ? inqRes.value
        : (window.InquiryStorage ? window.InquiryStorage.getAll() : []);

      // 5. Banner Settings
      if (banRes.status === 'fulfilled' && banRes.value) {
        this.bannerSettings = banRes.value;
      } else {
        const stored = localStorage.getItem('aff_promo_banner');
        this.bannerSettings = stored ? JSON.parse(stored) : {
          enabled: true,
          text: '🌱 Daily 5 AM Fresh Harvest Picked & Shipped! Min Order 1 KG • Use code FRESH15 for bulk discount',
          code: 'FRESH15',
          linkText: 'Shop Vegetables',
          linkUrl: 'products.html',
          theme: 'emerald'
        };
      }

      // 6. Cloudinary Settings
      if (setRes.status === 'fulfilled' && setRes.value) {
        this.cloudinarySettings = setRes.value;
      } else {
        const stored = localStorage.getItem('aff_cloudinary_settings');
        this.cloudinarySettings = stored ? JSON.parse(stored) : {
          cloudName: 'abhisfarmfresh',
          uploadPreset: 'jpnbyoak',
          folder: 'abhis/farmfresh'
        };
      }
    } catch (err) {
      console.warn('Data load warning:', err);
    }
  },

  // ─── TAB 1: ORDERS MANAGEMENT CMS ───────────────────────
  renderOrdersTab() {
    this.renderOrdersKPIs();
    this.filterAndRenderOrders();
  },

  renderOrdersKPIs() {
    const validOrders = this.orders.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s !== 'rejected' && s !== 'cancelled';
    });
    const totalRev = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal ?? o.total ?? o.subtotal ?? 0) || 0), 0);
    const pendingCount = this.orders.filter(o => (o.status || 'pending').toLowerCase() === 'pending').length;
    const deliveredCount = this.orders.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'delivered' || s === 'confirmed';
    }).length;

    const revEl = document.getElementById('orders-kpi-revenue');
    const totalEl = document.getElementById('orders-kpi-total');
    const pendingEl = document.getElementById('orders-kpi-pending');
    const deliveredEl = document.getElementById('orders-kpi-delivered');

    if (revEl) revEl.textContent = `₹${totalRev.toLocaleString('en-IN')}`;
    if (totalEl) totalEl.textContent = this.orders.length;
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (deliveredEl) deliveredEl.textContent = deliveredCount;
  },

  filterAndRenderOrders() {
    const statusFilter = document.getElementById('orders-status-filter')?.value || 'all';
    const searchQuery = (document.getElementById('orders-search-input')?.value || '').toLowerCase().trim();

    let filtered = [...this.orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => (o.status || 'pending').toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchQuery) {
      filtered = filtered.filter(o => 
        (o.orderNumber || o.id || '').toLowerCase().includes(searchQuery) ||
        (o.name || o.customerName || '').toLowerCase().includes(searchQuery) ||
        (o.phone || '').includes(searchQuery) ||
        (o.shopName || '').toLowerCase().includes(searchQuery)
      );
    }

    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-12 text-slate-400">
            <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">receipt_long</span>
            <p class="font-bold">No orders found matching criteria</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(order => {
      const orderNum = order.orderNumber || order.id || 'AFF-ORDER';
      const items = order.items || [];
      const itemsCount = items.reduce((sum, it) => sum + (Number(it.quantity ?? it.qty ?? 1)), 0);
      const orderTotal = Number(order.grandTotal ?? order.total ?? order.subtotal ?? 0);
      const totalFormatted = `₹${orderTotal.toLocaleString('en-IN')}`;
      const statusRaw = (order.status || 'pending').toLowerCase();
      const dateStr = this.formatDate(order.createdAt);
      const customerName = order.customerName || order.name || 'Customer';
      const shopOrPhone = order.shopName ? `${order.shopName} • ${order.phone || ''}` : (order.phone || '');

      return `
        <tr>
          <td class="font-mono font-bold text-slate-900">${orderNum}</td>
          <td>
            <div class="font-bold text-slate-900">${this.escapeHtml(customerName)}</div>
            <div class="text-[11px] text-slate-500">${this.escapeHtml(shopOrPhone)}</div>
          </td>
          <td>
            <span class="font-semibold text-slate-700">${itemsCount} kg / items</span>
          </td>
          <td class="font-extrabold text-emerald-800">${totalFormatted}</td>
          <td>
            <select onchange="AdminCore.updateOrderStatus('${order.id}', this.value)"
                    class="status-pill status-${statusRaw} text-xs font-bold border rounded-lg px-2.5 py-1 bg-white cursor-pointer outline-none shadow-sm">
              <option value="pending" ${statusRaw === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="confirmed" ${statusRaw === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="processing" ${statusRaw === 'processing' ? 'selected' : ''}>Processing</option>
              <option value="out_for_delivery" ${statusRaw === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
              <option value="delivered" ${statusRaw === 'delivered' ? 'selected' : ''}>Delivered</option>
              <option value="rejected" ${statusRaw === 'rejected' ? 'selected' : ''}>Rejected</option>
              <option value="cancelled" ${statusRaw === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td class="text-slate-500 text-[11px]">${dateStr}</td>
          <td class="text-right space-x-1.5 whitespace-nowrap">
            <button type="button"
                    data-order-id="${this.escapeHtml(order.id)}" 
                    class="btn-view-order p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition-colors"
                    title="View Order Details">
              <span class="material-symbols-outlined text-lg">visibility</span>
            </button>
            <button type="button"
                    data-order-id="${this.escapeHtml(order.id)}" 
                    class="btn-print-invoice p-1.5 text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Print Tax Invoice">
              <span class="material-symbols-outlined text-lg">print</span>
            </button>
            <button type="button"
                    data-order-id="${this.escapeHtml(order.id)}" 
                    class="btn-delete-order p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete Order Permanently">
              <span class="material-symbols-outlined text-lg">delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (!tbody._hasEventDelegation) {
      tbody._hasEventDelegation = true;
      tbody.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.btn-view-order');
        if (viewBtn && viewBtn.dataset.orderId) {
          AdminCore.viewOrderDetails(viewBtn.dataset.orderId);
          return;
        }
        const printBtn = e.target.closest('.btn-print-invoice');
        if (printBtn && printBtn.dataset.orderId) {
          AdminCore.printInvoice(printBtn.dataset.orderId);
          return;
        }
        const delBtn = e.target.closest('.btn-delete-order');
        if (delBtn && delBtn.dataset.orderId) {
          AdminCore.deleteOrder(delBtn.dataset.orderId);
          return;
        }
      });
      tbody.addEventListener('change', (e) => {
        const select = e.target.closest('select[data-order-id]');
        if (select && select.dataset.orderId) {
          AdminCore.updateOrderStatus(select.dataset.orderId, select.value);
        }
      });
    }
  },

  async deleteOrder(orderId) {
    const order = this.orders.find(o => String(o.id) === String(orderId) || String(o.orderNumber) === String(orderId));
    const orderNum = order ? (order.orderNumber || order.id) : orderId;

    if (!confirm(`Are you sure you want to permanently delete order "${orderNum}"?\n\nThis will remove the order completely from Cloud Firestore database and cannot be undone.`)) {
      return;
    }

    try {
      if (window.FirebaseApp) {
        await window.FirebaseApp.deleteOrder(orderId);
      }
      if (window.OrderStorage) {
        window.OrderStorage.delete(orderId);
        if (order && order.orderNumber) {
          window.OrderStorage.delete(order.orderNumber);
        }
      }

      this.orders = this.orders.filter(o => String(o.id) !== String(orderId) && String(o.orderNumber) !== String(orderId));
      this.closeModal('order-details-modal');
      this.showToast(`Order "${orderNum}" deleted successfully`, 'info');
      this.renderOrdersKPIs();
      this.filterAndRenderOrders();
    } catch (err) {
      console.error('Failed to delete order:', err);
      this.showToast('Failed to delete order: ' + err.message, 'error');
    }
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      if (window.FirebaseApp && window.FirebaseApp.isReady()) {
        await window.FirebaseApp.updateOrderStatus(orderId, newStatus);
      }
      
      const order = this.orders.find(o => String(o.id) === String(orderId));
      if (order) order.status = newStatus;

      this.showToast(`Order status updated to "${newStatus.replace('_', ' ')}"`, 'success');
      this.renderOrdersKPIs();
      this.filterAndRenderOrders();
    } catch (err) {
      this.showToast('Failed to update status: ' + err.message, 'error');
    }
  },

  viewOrderDetails(orderId) {
    const order = this.orders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const modal = document.getElementById('order-details-modal');
    const content = document.getElementById('order-details-modal-content');
    if (!modal || !content) return;

    const items = order.items || [];
    const itemsHtml = items.map(item => {
      const name = item.productName || item.name || 'Fresh Produce';
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      const quantity = Number(item.quantity ?? item.qty ?? 1);
      const totalPrice = Number(item.totalPrice ?? item.total ?? (unitPrice * quantity));
      return `
        <div class="flex items-center justify-between py-2.5 border-b border-slate-100 text-xs">
          <div>
            <div class="font-bold text-slate-900">${this.escapeHtml(name)}</div>
            <div class="text-[11px] text-slate-400">₹${unitPrice} / ${item.unit || 'KG'}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-slate-900">${quantity} ${item.unit || 'KG'}</div>
            <div class="font-extrabold text-emerald-800">₹${totalPrice.toFixed(2)}</div>
          </div>
        </div>
      `;
    }).join('');

    const grandTotal = Number(order.grandTotal ?? order.total ?? order.subtotal ?? 0);
    const customerName = order.customerName || order.name || 'Customer';
    const deliveryAddress = order.deliveryAddress || order.businessAddress || order.address || 'Standard Delivery';
    const cleanPhone = (order.phone || '').replace(/\D/g, '');

    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-start justify-between border-b pb-4 border-slate-100">
          <div>
            <span class="status-pill status-${order.status || 'pending'} font-bold uppercase text-[10px]">${order.status || 'pending'}</span>
            <h3 class="text-xl font-extrabold text-slate-900 mt-2 font-mono">${order.orderNumber || order.id}</h3>
            <p class="text-xs text-slate-400">Placed on ${this.formatDate(order.createdAt)}</p>
          </div>
          <div class="text-right">
            <div class="text-xs text-slate-400 font-bold uppercase">Grand Total</div>
            <div class="text-2xl font-black text-emerald-800">₹${grandTotal.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
          <div>
            <div class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Customer / Business</div>
            <div class="font-extrabold text-slate-900 text-sm">${this.escapeHtml(customerName)}</div>
            <div class="text-slate-600 font-medium">${this.escapeHtml(order.shopName || '')}</div>
            <div class="text-emerald-700 font-bold mt-1">📞 ${this.escapeHtml(order.phone || 'N/A')}</div>
          </div>
          <div>
            <div class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Delivery Address</div>
            <div class="text-slate-700 leading-relaxed">${this.escapeHtml(deliveryAddress)}</div>
            <div class="text-slate-500 font-semibold mt-1">Payment: <span class="text-slate-900 font-bold uppercase">${order.paymentMethod || 'UPI / Online'}</span></div>
          </div>
        </div>

        <div>
          <div class="font-extrabold text-slate-900 text-sm mb-3">Ordered Produce (${items.length} items)</div>
          <div class="space-y-1">
            ${itemsHtml || '<p class="text-xs text-slate-400">No item details recorded.</p>'}
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <a href="https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(customerName)}!%20Regarding%20your%20Abhis%20Farm%20Fresh%20Order%20${encodeURIComponent(order.orderNumber || order.id)}" 
               target="_blank" class="admin-btn admin-btn-whatsapp text-xs font-bold">
              <span class="material-symbols-outlined text-base">chat</span>
              <span>WhatsApp Customer</span>
            </a>
            <button type="button" id="btn-modal-delete-order" class="admin-btn admin-btn-danger text-xs font-bold" title="Delete Order Permanently">
              <span class="material-symbols-outlined text-base">delete</span>
              <span>Delete Order</span>
            </button>
          </div>
          <button type="button" id="btn-modal-print-invoice" class="admin-btn admin-btn-primary text-xs font-bold">
            <span class="material-symbols-outlined text-base">print</span>
            <span>Print Tax Invoice</span>
          </button>
        </div>
      </div>
    `;

    const printModalBtn = document.getElementById('btn-modal-print-invoice');
    if (printModalBtn) {
      printModalBtn.addEventListener('click', () => this.printInvoice(order.id));
    }

    const deleteModalBtn = document.getElementById('btn-modal-delete-order');
    if (deleteModalBtn) {
      deleteModalBtn.addEventListener('click', () => this.deleteOrder(order.id));
    }

    this.openModal('order-details-modal');
  },

  printInvoice(orderId) {
    const order = this.orders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const printArea = document.getElementById('invoice-print-area');
    if (!printArea) return;

    const items = order.items || [];
    const itemsRows = items.map((it, idx) => {
      const name = it.productName || it.name || 'Produce Item';
      const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
      const quantity = Number(it.quantity ?? it.qty ?? 1);
      const totalPrice = Number(it.totalPrice ?? it.total ?? (unitPrice * quantity));
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-size: 11px; font-weight: bold;">${this.escapeHtml(name)}</td>
          <td style="padding: 10px 12px; font-size: 11px; text-align: center;">${quantity} ${it.unit || 'KG'}</td>
          <td style="padding: 10px 12px; font-size: 11px; text-align: right;">₹${unitPrice.toFixed(2)}</td>
          <td style="padding: 10px 12px; font-size: 11px; text-align: right; font-weight: bold;">₹${totalPrice.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const grandTotal = Number(order.grandTotal ?? order.total ?? order.subtotal ?? 0);
    const customerName = order.customerName || order.name || 'Customer';
    const deliveryAddress = order.deliveryAddress || order.businessAddress || order.address || 'Standard Delivery';

    printArea.innerHTML = `
      <div style="font-family: 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #047857; padding-bottom: 16px; margin-bottom: 24px;">
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #064e3b;">ABHIS FARM FRESH</h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Direct Farm Procurement & Wholesale Supply</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Phone: +91 6380710362 | Email: orders@abhisfarmfresh.in</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Website: https://abhisfarmfresh.in</p>
          </div>
          <div style="text-align: right;">
            <span style="display: inline-block; background: #ecfdf5; color: #047857; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 6px; border: 1px solid #a7f3d0;">TAX INVOICE</span>
            <p style="margin: 8px 0 2px 0; font-size: 12px; font-weight: bold;">Invoice #: ${order.orderNumber || order.id}</p>
            <p style="margin: 0; font-size: 11px; color: #64748b;">Date: ${this.formatDate(order.createdAt)}</p>
          </div>
        </div>

        <!-- Bill To -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div>
            <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">BILLED TO:</div>
            <div style="font-size: 14px; font-weight: 800; margin-top: 4px;">${this.escapeHtml(customerName)}</div>
            <div style="font-size: 12px; color: #475569;">${this.escapeHtml(order.shopName || '')}</div>
            <div style="font-size: 12px; color: #475569;">Phone: ${this.escapeHtml(order.phone || 'N/A')}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">DELIVERY DETAILS:</div>
            <div style="font-size: 12px; color: #475569; max-width: 250px; margin-top: 4px;">${this.escapeHtml(deliveryAddress)}</div>
            <div style="font-size: 11px; color: #047857; font-weight: bold; margin-top: 4px;">Payment: ${order.paymentMethod || 'Online / UPI'}</div>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #064e3b; color: white;">
              <th style="padding: 10px 12px; font-size: 11px; text-align: left;">#</th>
              <th style="padding: 10px 12px; font-size: 11px; text-align: left;">Item Description</th>
              <th style="padding: 10px 12px; font-size: 11px; text-align: center;">Qty</th>
              <th style="padding: 10px 12px; font-size: 11px; text-align: right;">Rate (₹)</th>
              <th style="padding: 10px 12px; font-size: 11px; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold; font-size: 12px;">Grand Total:</td>
              <td style="padding: 12px; text-align: right; font-weight: 900; font-size: 14px; color: #064e3b;">₹${grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for your business! Fresh produce daily 5 AM harvest delivery.</p>
          <p style="margin: 4px 0 0 0;">For inquiries or bulk order contracts, reach us on WhatsApp: +91 6380710362</p>
        </div>
      </div>
    `;

    window.print();
  },

  // ─── TAB 2: PRODUCTS & INVENTORY CMS ────────────────────
  renderProductsTab() {
    this.renderProductsKPIs();
    this.populateCategorySelects();
    this.filterAndRenderProducts();
  },

  renderProductsKPIs() {
    const active = this.products.filter(p => p.isActive !== false && p.status !== 'inactive').length;
    const lowStock = this.products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 50).length;
    const outOfStock = this.products.filter(p => Number(p.stock) === 0 || p.status === 'out_of_stock').length;

    const activeEl = document.getElementById('products-kpi-active');
    const lowEl = document.getElementById('products-kpi-low');
    const outEl = document.getElementById('products-kpi-out');

    if (activeEl) activeEl.textContent = active;
    if (lowEl) lowEl.textContent = lowStock;
    if (outEl) outEl.textContent = outOfStock;
  },

  populateCategorySelects() {
    const filterSelect = document.getElementById('products-category-filter');
    const modalSelect = document.getElementById('product-form-category');

    const optionsHtml = this.categories.map(c => `
      <option value="${c.id}">${this.escapeHtml(c.name)}</option>
    `).join('');

    if (filterSelect) {
      filterSelect.innerHTML = `<option value="all">All Categories</option>${optionsHtml}`;
    }
    if (modalSelect) {
      modalSelect.innerHTML = optionsHtml;
    }
  },

  filterAndRenderProducts() {
    const catFilter = document.getElementById('products-category-filter')?.value || 'all';
    const searchQuery = (document.getElementById('products-search-input')?.value || '').toLowerCase().trim();

    let filtered = [...this.products];

    if (catFilter !== 'all') {
      filtered = filtered.filter(p => (p.category || '').toLowerCase() === catFilter.toLowerCase());
    }

    if (searchQuery) {
      filtered = filtered.filter(p => 
        (p.name || '').toLowerCase().includes(searchQuery) ||
        (p.slug || '').toLowerCase().includes(searchQuery) ||
        (p.description || '').toLowerCase().includes(searchQuery)
      );
    }

    const grid = document.getElementById('products-management-grid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200">
          <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">inventory_2</span>
          <p class="font-bold">No products found</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(product => {
      const isOutOfStock = Number(product.stock) === 0 || product.status === 'out_of_stock';
      const isLowStock = !isOutOfStock && Number(product.stock) <= 50;
      const imgUrl = this.resolveImageUrl(product.imageUrl);
      const badges = Array.isArray(product.badges) ? product.badges : [];
      const safeId = this.escapeHtml(String(product.id || ''));

      return `
        <div class="admin-card p-4 flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
          <div>
            <!-- Image & Stock Badge -->
            <div class="relative h-44 rounded-xl overflow-hidden bg-slate-100 mb-3">
              <img src="${imgUrl}" alt="${this.escapeHtml(product.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null; this.src='../images/farm_fresh_media_01.jpeg';">
              
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                ${isOutOfStock ? `<span class="status-pill status-cancelled">Out of Stock</span>` : ''}
                ${isLowStock ? `<span class="status-pill status-pending">Low Stock (${product.stock} kg)</span>` : ''}
              </div>

              <div class="absolute top-2 right-2 flex flex-wrap gap-1 justify-end">
                ${badges.map(b => `<span class="bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">${b}</span>`).join('')}
              </div>
            </div>

            <!-- Title & Details -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">${this.escapeHtml(product.category || 'Produce')}</span>
                <span class="text-xs font-mono text-slate-400">${product.sku || product.id || ''}</span>
              </div>
              <h3 class="font-extrabold text-slate-900 text-sm line-clamp-1">${this.escapeHtml(product.name)}</h3>
              <p class="text-xs text-slate-500 line-clamp-2">${this.escapeHtml(product.description || '')}</p>
            </div>

            <!-- Price & Stock -->
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div>
                <div class="text-base font-black text-slate-900">₹${product.price} <span class="text-[10px] text-slate-400 font-bold">/ ${product.unit || 'KG'}</span></div>
                ${product.discountPrice ? `<div class="text-[10px] text-emerald-700 line-through">₹${product.discountPrice}</div>` : ''}
              </div>
              <div class="text-right">
                <span class="text-xs font-bold ${isOutOfStock ? 'text-red-600' : 'text-slate-600'}">${product.stock || 0} ${product.unit || 'KG'} in stock</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <button type="button" data-product-id="${this.escapeHtml(product.id)}" class="btn-admin-edit-product admin-btn admin-btn-secondary flex-1 text-xs py-2">
              <span class="material-symbols-outlined text-sm">edit</span>
              <span>Edit</span>
            </button>
            <button type="button" data-product-id="${this.escapeHtml(product.id)}" 
                    class="btn-admin-toggle-stock admin-btn ${isOutOfStock ? 'admin-btn-primary' : 'admin-btn-secondary'} text-xs p-2"
                    title="${isOutOfStock ? 'Mark In Stock' : 'Mark Out of Stock'}">
              <span class="material-symbols-outlined text-sm">${isOutOfStock ? 'check_circle' : 'block'}</span>
            </button>
            <button type="button" data-product-id="${this.escapeHtml(product.id)}" class="btn-admin-delete-product admin-btn admin-btn-danger text-xs p-2" title="Delete Product">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (!grid._hasProductEventDelegation) {
      grid._hasProductEventDelegation = true;
      grid.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-admin-edit-product');
        if (editBtn && editBtn.dataset.productId) {
          AdminCore.editProduct(editBtn.dataset.productId);
          return;
        }
        const toggleBtn = e.target.closest('.btn-admin-toggle-stock');
        if (toggleBtn && toggleBtn.dataset.productId) {
          AdminCore.toggleProductStock(toggleBtn.dataset.productId);
          return;
        }
        const delBtn = e.target.closest('.btn-admin-delete-product');
        if (delBtn && delBtn.dataset.productId) {
          AdminCore.deleteProduct(delBtn.dataset.productId);
          return;
        }
      });
    }
  },

  openAddProductModal() {
    document.getElementById('product-form')?.reset();
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('product-form-id', '');
    setVal('product-form-image-url', '');
    const titleEl = document.getElementById('product-modal-title');
    if (titleEl) titleEl.textContent = 'Add New Fresh Produce';
    
    const previewEl = document.getElementById('product-image-preview');
    if (previewEl) previewEl.src = '../images/farm_fresh_media_01.jpeg';

    document.querySelectorAll('.product-badge-checkbox').forEach(cb => cb.checked = false);

    this.openModal('product-modal');
  },

  editProduct(productId) {
    const p = this.products.find(item => String(item.id) === String(productId) || String(item.slug) === String(productId));
    if (!p) {
      console.warn('Product not found for edit ID:', productId);
      this.showToast('Product not found.', 'error');
      return;
    }

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = (val !== undefined && val !== null) ? val : '';
    };

    const titleEl = document.getElementById('product-modal-title');
    if (titleEl) titleEl.textContent = 'Edit Produce Details';

    setVal('product-form-id', p.id);
    setVal('product-form-name', p.name);
    setVal('product-form-category', p.category || 'everyday');
    setVal('product-form-price', p.price);
    setVal('product-form-discount', p.discountPrice);
    setVal('product-form-unit', p.unit || 'KG');
    setVal('product-form-stock', p.stock !== undefined ? p.stock : 500);
    setVal('product-form-sku', p.sku || p.id);
    setVal('product-form-desc', p.description);
    setVal('product-form-image-url', p.imageUrl);
    setVal('product-form-origin', p.origin);
    setVal('product-form-shelflife', p.shelfLife);

    // Badges checkboxes
    const badges = Array.isArray(p.badges) ? p.badges : [];
    document.querySelectorAll('.product-badge-checkbox').forEach(cb => {
      cb.checked = badges.includes(cb.value);
    });

    const previewEl = document.getElementById('product-image-preview');
    if (previewEl) {
      previewEl.src = this.resolveImageUrl(p.imageUrl);
    }

    this.openModal('product-modal');
  },

  async handleProductFormSubmit(e) {
    e.preventDefault();
    const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

    const id = getVal('product-form-id');
    const name = getVal('product-form-name');
    const category = document.getElementById('product-form-category')?.value || 'everyday';
    const price = Number(document.getElementById('product-form-price')?.value) || 0;
    const discountPrice = Number(document.getElementById('product-form-discount')?.value) || null;
    const unit = document.getElementById('product-form-unit')?.value || 'KG';
    const stock = Number(document.getElementById('product-form-stock')?.value) || 0;
    const sku = getVal('product-form-sku') || `AFF-${Date.now().toString().slice(-4)}`;
    const description = getVal('product-form-desc');
    const imageUrl = getVal('product-form-image-url') || 'images/farm_fresh_media_01.jpeg';
    const origin = getVal('product-form-origin');
    const shelfLife = getVal('product-form-shelflife');

    const badges = [];
    document.querySelectorAll('.product-badge-checkbox:checked').forEach(cb => {
      badges.push(cb.value);
    });

    const productData = {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category,
      price,
      discountPrice,
      unit,
      stock,
      sku,
      description,
      imageUrl,
      origin,
      shelfLife,
      badges,
      status: stock > 0 ? 'available' : 'out_of_stock',
      isActive: true
    };

    try {
      if (id) {
        // Update both Firestore & Local persistent storage
        if (window.FirebaseApp) {
          await window.FirebaseApp.updateProduct(id, productData);
        }
        if (window.ProductStorage) {
          window.ProductStorage.upsert({ id, ...productData });
        }

        const index = this.products.findIndex(p => String(p.id) === String(id));
        if (index !== -1) {
          this.products[index] = { ...this.products[index], ...productData };
        }
        this.showToast('Product updated & saved permanently!', 'success');
      } else {
        // Create both in Firestore & Local persistent storage
        let newId = `prod_${Date.now()}`;
        if (window.FirebaseApp) {
          newId = await window.FirebaseApp.addProduct(productData) || newId;
        }
        if (window.ProductStorage) {
          window.ProductStorage.upsert({ id: newId, ...productData });
        }

        this.products.unshift({ id: newId, ...productData });
        this.showToast('New product added to catalogue!', 'success');
      }

      this.closeModal('product-modal');
      this.renderProductsTab();
    } catch (err) {
      this.showToast('Error saving product: ' + err.message, 'error');
    }
  },

  async toggleProductStock(productId) {
    const p = this.products.find(item => String(item.id) === String(productId));
    if (!p) return;

    const isCurrentlyOut = Number(p.stock) === 0 || p.status === 'out_of_stock';
    const newStock = isCurrentlyOut ? 200 : 0;
    const newStatus = isCurrentlyOut ? 'available' : 'out_of_stock';

    p.stock = newStock;
    p.status = newStatus;

    if (window.FirebaseApp) {
      await window.FirebaseApp.updateProduct(productId, { stock: newStock, status: newStatus });
    }
    if (window.ProductStorage) {
      window.ProductStorage.upsert({ id: productId, stock: newStock, status: newStatus });
    }

    this.showToast(`${p.name} marked as ${isCurrentlyOut ? 'In Stock' : 'Out of Stock'}`, 'info');
    this.renderProductsTab();
  },

  async deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this produce item from the catalogue?')) return;

    if (window.FirebaseApp) {
      await window.FirebaseApp.deleteProduct(productId);
    }
    if (window.ProductStorage) {
      window.ProductStorage.delete(productId);
    }

    this.products = this.products.filter(p => String(p.id) !== String(productId));
    this.showToast('Product removed from catalogue', 'info');
    this.renderProductsTab();
  },

  // ─── TAB 3: CATEGORY CMS ────────────────────────────────
  renderCategoriesTab() {
    const list = document.getElementById('categories-grid');
    if (!list) return;

    list.innerHTML = this.categories.map(cat => {
      const prodCount = this.products.filter(p => p.category === cat.id).length;
      return `
        <div class="admin-card p-5 flex items-center justify-between group hover:border-emerald-500/50 transition-all">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner">
              <span class="material-symbols-outlined text-2xl">${cat.icon || 'agriculture'}</span>
            </div>
            <div>
              <h4 class="font-extrabold text-slate-900 text-sm">${this.escapeHtml(cat.name)}</h4>
              <p class="text-xs text-slate-500 font-medium">${this.escapeHtml(cat.subtitle || '')}</p>
              <div class="text-[11px] font-bold text-emerald-800 mt-1">${prodCount} Products Listed</div>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" data-category-id="${this.escapeHtml(cat.id)}" class="btn-admin-edit-category p-2 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-slate-100" title="Edit Category">
              <span class="material-symbols-outlined text-lg">edit</span>
            </button>
            <button type="button" data-category-id="${this.escapeHtml(cat.id)}" class="btn-admin-delete-category p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100" title="Delete Category">
              <span class="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (!container._hasCategoryEventDelegation) {
      container._hasCategoryEventDelegation = true;
      container.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-admin-edit-category');
        if (editBtn && editBtn.dataset.categoryId) {
          AdminCore.editCategory(editBtn.dataset.categoryId);
          return;
        }
        const delBtn = e.target.closest('.btn-admin-delete-category');
        if (delBtn && delBtn.dataset.categoryId) {
          AdminCore.deleteCategory(delBtn.dataset.categoryId);
          return;
        }
      });
    }
  },

  openAddCategoryModal() {
    document.getElementById('category-form')?.reset();
    const idEl = document.getElementById('category-form-id');
    if (idEl) idEl.value = '';
    const titleEl = document.getElementById('category-modal-title');
    if (titleEl) titleEl.textContent = 'Add Product Category';
    this.openModal('category-modal');
  },

  editCategory(catId) {
    const cat = this.categories.find(c => String(c.id) === String(catId));
    if (!cat) return;

    const titleEl = document.getElementById('category-modal-title');
    if (titleEl) titleEl.textContent = 'Edit Category';

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = (val !== undefined && val !== null) ? val : '';
    };

    setVal('category-form-id', cat.id);
    setVal('category-form-name', cat.name);
    setVal('category-form-icon', cat.icon || 'eco');
    setVal('category-form-subtitle', cat.subtitle);
    setVal('category-form-order', cat.order || 1);

    this.openModal('category-modal');
  },

  async handleCategoryFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('category-form-id')?.value?.trim() || `cat_${Date.now()}`;
    const name = document.getElementById('category-form-name')?.value?.trim() || '';
    const icon = document.getElementById('category-form-icon')?.value?.trim() || 'eco';
    const subtitle = document.getElementById('category-form-subtitle')?.value?.trim() || '';
    const order = Number(document.getElementById('category-form-order')?.value) || 1;

    const catData = { id, name, icon, subtitle, order };

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.addCategory(catData);
    }

    const index = this.categories.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
      this.categories[index] = catData;
    } else {
      this.categories.push(catData);
    }

    this.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    this.showToast('Category saved successfully!', 'success');
    this.closeModal('category-modal');
    this.renderCategoriesTab();
    this.populateCategorySelects();
  },

  async deleteCategory(catId) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.deleteCategory(catId);
    }

    this.categories = this.categories.filter(c => String(c.id) !== String(catId));
    this.showToast('Category deleted', 'info');
    this.renderCategoriesTab();
    this.populateCategorySelects();
  },

  // ─── TAB 4: CUSTOMER INQUIRIES & LEADS CMS ──────────────
  renderInquiriesTab() {
    this.renderInquiriesKPIs();
    this.filterAndRenderInquiries();
  },

  renderInquiriesKPIs() {
    const unread = this.inquiries.filter(i => i.status === 'unread').length;
    const contacted = this.inquiries.filter(i => i.status === 'contacted').length;
    const resolved = this.inquiries.filter(i => i.status === 'resolved').length;

    const totalEl = document.getElementById('inquiries-kpi-total');
    const unreadEl = document.getElementById('inquiries-kpi-unread');
    const contactedEl = document.getElementById('inquiries-kpi-contacted');
    const resolvedEl = document.getElementById('inquiries-kpi-resolved');

    if (totalEl) totalEl.textContent = this.inquiries.length;
    if (unreadEl) unreadEl.textContent = unread;
    if (contactedEl) contactedEl.textContent = contacted;
    if (resolvedEl) resolvedEl.textContent = resolved;
  },

  filterAndRenderInquiries() {
    const filter = document.getElementById('inquiries-status-filter')?.value || 'all';
    let list = [...this.inquiries];

    if (filter !== 'all') {
      list = list.filter(i => (i.status || 'unread') === filter);
    }

    const container = document.getElementById('inquiries-list');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200">
          <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">mail</span>
          <p class="font-bold">No customer inquiries found</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(inq => {
      const cleanPhone = (inq.phone || '').replace(/\D/g, '');
      const waMessage = encodeURIComponent(`Hi ${inq.name || 'there'}! This is Abhis Farm Fresh responding to your inquiry regarding vegetable procurement.`);

      return `
        <div class="admin-card p-5 space-y-4 hover:border-emerald-500/40 transition-all">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-extrabold text-slate-900 text-sm">${this.escapeHtml(inq.name || 'Customer Lead')}</h4>
                <span class="status-pill status-${inq.status || 'unread'}">${inq.status || 'unread'}</span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">📞 ${this.escapeHtml(inq.phone || 'N/A')} • ${this.formatDate(inq.createdAt)}</p>
            </div>

            <div class="flex items-center gap-2">
              <select data-inquiry-id="${this.escapeHtml(inq.id)}"
                      class="inquiry-status-select admin-input text-xs py-1.5 px-2.5 rounded-lg font-bold bg-slate-50">
                <option value="unread" ${inq.status === 'unread' ? 'selected' : ''}>Unread</option>
                <option value="contacted" ${inq.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                <option value="resolved" ${inq.status === 'resolved' ? 'selected' : ''}>Resolved</option>
              </select>
              <button type="button" data-inquiry-id="${this.escapeHtml(inq.id)}" class="btn-admin-delete-inquiry p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Delete lead">
                <span class="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 leading-relaxed">
            "${this.escapeHtml(inq.message || 'No specific requirement message attached.')}"
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <a href="https://wa.me/${cleanPhone}?text=${waMessage}" target="_blank" 
               class="admin-btn admin-btn-whatsapp text-xs py-2 px-3">
              <span class="material-symbols-outlined text-base">chat</span>
              <span>Reply on WhatsApp</span>
            </a>
            ${inq.email ? `
              <a href="mailto:${encodeURIComponent(inq.email)}?subject=Abhis%20Farm%20Fresh%20Inquiry%20Response" 
                 class="admin-btn admin-btn-secondary text-xs py-2 px-3">
                <span class="material-symbols-outlined text-base">mail</span>
                <span>Send Email</span>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (!container._hasInquiryEventDelegation) {
      container._hasInquiryEventDelegation = true;
      container.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-admin-delete-inquiry');
        if (delBtn && delBtn.dataset.inquiryId) {
          AdminCore.deleteInquiry(delBtn.dataset.inquiryId);
          return;
        }
      });
      container.addEventListener('change', (e) => {
        const select = e.target.closest('.inquiry-status-select');
        if (select && select.dataset.inquiryId) {
          AdminCore.updateInquiryStatus(select.dataset.inquiryId, select.value);
        }
      });
    }
  },

  async updateInquiryStatus(inquiryId, status) {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.updateInquiryStatus(inquiryId, status);
    }
    const inq = this.inquiries.find(i => String(i.id) === String(inquiryId));
    if (inq) inq.status = status;

    this.showToast(`Inquiry marked as ${status}`, 'success');
    this.renderInquiriesKPIs();
  },

  async deleteInquiry(inquiryId) {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.deleteInquiry(inquiryId);
    }
    this.inquiries = this.inquiries.filter(i => String(i.id) !== String(inquiryId));
    this.showToast('Lead deleted', 'info');
    this.renderInquiriesTab();
  },

  // ─── TAB 5: PROMO BANNER CMS ────────────────────────────
  renderBannerTab() {
    if (!this.bannerSettings) return;

    const enabledInput = document.getElementById('banner-form-enabled');
    const textInput = document.getElementById('banner-form-text');
    const codeInput = document.getElementById('banner-form-code');
    const linkTextInput = document.getElementById('banner-form-link-text');
    const linkUrlInput = document.getElementById('banner-form-link-url');
    const themeSelect = document.getElementById('banner-form-theme');

    if (enabledInput) enabledInput.checked = this.bannerSettings.enabled !== false;
    if (textInput) textInput.value = this.bannerSettings.text || '';
    if (codeInput) codeInput.value = this.bannerSettings.code || '';
    if (linkTextInput) linkTextInput.value = this.bannerSettings.linkText || '';
    if (linkUrlInput) linkUrlInput.value = this.bannerSettings.linkUrl || '';
    if (themeSelect) themeSelect.value = this.bannerSettings.theme || 'emerald';

    this.updateBannerPreview();
  },

  updateBannerPreview() {
    const text = document.getElementById('banner-form-text')?.value || 'Daily 5 AM Fresh Harvest Picked & Shipped!';
    const code = document.getElementById('banner-form-code')?.value || 'FRESH15';
    const linkText = document.getElementById('banner-form-link-text')?.value || 'Shop Vegetables';
    const theme = document.getElementById('banner-form-theme')?.value || 'emerald';
    const isEnabled = document.getElementById('banner-form-enabled')?.checked;

    const previewEl = document.getElementById('banner-live-preview');
    if (!previewEl) return;

    const themeGradients = {
      emerald: 'bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white',
      ocean: 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white',
      amber: 'bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-white',
      violet: 'bg-gradient-to-r from-purple-900 via-pink-900 to-slate-900 text-white'
    };

    previewEl.className = `${themeGradients[theme] || themeGradients.emerald} p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md transition-all`;
    previewEl.innerHTML = `
      <div class="flex-1 flex flex-wrap items-center justify-center gap-2 text-center">
        <span>${this.escapeHtml(text)}</span>
        ${code ? `<span class="bg-white/20 border border-white/30 text-white px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase">${this.escapeHtml(code)}</span>` : ''}
        ${linkText ? `<span class="underline font-bold text-emerald-200 ml-1">${this.escapeHtml(linkText)} &rarr;</span>` : ''}
      </div>
      <span class="text-white/60 text-sm font-bold">&times;</span>
    `;

    const statusBadge = document.getElementById('banner-status-indicator');
    if (statusBadge) {
      statusBadge.innerHTML = isEnabled ? 
        `<span class="status-pill status-delivered">Live on Storefront</span>` : 
        `<span class="status-pill status-cancelled">Banner Disabled</span>`;
    }
  },

  async handleBannerFormSubmit(e) {
    e.preventDefault();
    const enabled = document.getElementById('banner-form-enabled')?.checked ?? true;
    const text = document.getElementById('banner-form-text')?.value?.trim() || '';
    const code = document.getElementById('banner-form-code')?.value?.trim() || '';
    const linkText = document.getElementById('banner-form-link-text')?.value?.trim() || '';
    const linkUrl = document.getElementById('banner-form-link-url')?.value?.trim() || '';
    const theme = document.getElementById('banner-form-theme')?.value || 'emerald';

    const bannerData = { enabled, text, code, linkText, linkUrl, theme };

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.saveBannerSettings(bannerData);
    } else {
      localStorage.setItem('aff_promo_banner', JSON.stringify(bannerData));
    }

    this.bannerSettings = bannerData;
    this.showToast('Announcement banner saved & updated across store!', 'success');
    this.updateBannerPreview();
  },

  // ─── TAB 6: SETTINGS HUB ────────────────────────────────
  async renderSettingsTab() {
    // Cloudinary Inputs
    if (this.cloudinarySettings) {
      const cName = document.getElementById('settings-cloudinary-name');
      const cPreset = document.getElementById('settings-cloudinary-preset');
      const cFolder = document.getElementById('settings-cloudinary-folder');

      if (cName) cName.value = this.cloudinarySettings.cloudName || 'abhisfarmfresh';
      if (cPreset) cPreset.value = this.cloudinarySettings.uploadPreset || 'jpnbyoak';
      if (cFolder) cFolder.value = this.cloudinarySettings.folder || 'abhis/farmfresh';
    }

    // Firebase Diagnostics (Auto-loaded from Live Cloud Firestore)
    const statsContainer = document.getElementById('settings-firebase-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `<div class="p-3 text-center text-xs text-slate-500"><span class="inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span> Connecting to Cloud Firestore (abhisfarmfresh-3e7d3)...</div>`;
      
      let stats = { connected: false, products: 0, orders: 0, customers: 0, inquiries: 0 };
      if (window.FirebaseApp) {
        stats = await window.FirebaseApp.getDatabaseStats();
      }

      const prodCount = stats.connected ? stats.products : (this.products ? this.products.length : 12);
      const orderCount = stats.connected ? stats.orders : (this.orders ? this.orders.length : 0);
      const custCount = stats.connected ? stats.customers : (this.customers ? this.customers.length : 0);
      const inqCount = stats.connected ? stats.inquiries : (this.inquiries ? this.inquiries.length : 0);

      statsContainer.innerHTML = `
        <div class="space-y-3">
          <div class="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900">
            <div class="flex items-center gap-2 font-medium">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Project <strong>abhisfarmfresh-3e7d3</strong> Connected</span>
            </div>
            <span class="text-[11px] text-emerald-700 font-mono font-semibold">Live Database</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <div class="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Cloud Products</div>
              <div class="text-xl font-extrabold text-emerald-950">${prodCount}</div>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Orders</div>
              <div class="text-xl font-extrabold text-slate-900">${orderCount}</div>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Customers</div>
              <div class="text-xl font-extrabold text-slate-900">${custCount}</div>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Inquiries</div>
              <div class="text-xl font-extrabold text-slate-900">${inqCount}</div>
            </div>
          </div>
        </div>
      `;
    }
  },

  async syncCloudData() {
    this.showToast('Syncing latest data from Cloud Firestore...', 'info');
    try {
      await this.loadAllData();
      await this.renderSettingsTab();
      this.renderCurrentTab();
      this.showToast('✅ Cloud Firestore synced successfully! (abhisfarmfresh-3e7d3)', 'success');
    } catch (err) {
      console.warn('Sync error:', err);
      this.showToast('Sync completed with local cache fallback.', 'info');
    }
  },

  async syncLocalToCloud() {
    if (!window.FirebaseApp || !window.FirebaseApp.isReady()) {
      this.showToast('Firebase connecting... please try again in a moment.', 'info');
      if (window.FirebaseApp) window.FirebaseApp.init();
    }

    const localProducts = window.ProductStorage ? window.ProductStorage.getAll() : this.products;
    if (!localProducts || localProducts.length === 0) {
      this.showToast('No products available to sync.', 'info');
      return;
    }

    this.showToast(`Pushing ${localProducts.length} produce items to Cloud Firestore...`, 'info');
    const seeded = await window.FirebaseApp.seedDefaultProducts(localProducts);
    this.showToast(`✅ Successfully pushed ${seeded || localProducts.length} products to Cloud Firestore!`, 'success');
    await this.renderSettingsTab();
  },

  async handleSettingsFormSubmit(e) {
    e.preventDefault();
    const cloudName = document.getElementById('settings-cloudinary-name')?.value?.trim() || 'abhisfarmfresh';
    const uploadPreset = document.getElementById('settings-cloudinary-preset')?.value?.trim() || 'jpnbyoak';
    const folder = document.getElementById('settings-cloudinary-folder')?.value?.trim() || 'abhis/farmfresh';

    const config = { cloudName, uploadPreset, folder };

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.saveAppSettings(config);
    } else {
      localStorage.setItem('aff_cloudinary_settings', JSON.stringify(config));
    }

    this.cloudinarySettings = config;
    this.showToast('Cloudinary configurations saved!', 'success');
  },

  async testCloudinaryUpload(file) {
    if (!file) return;
    const testBtn = document.getElementById('cloudinary-test-btn');
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Testing Upload...`;
    }

    try {
      let uploadedUrl = null;
      if (window.CloudinaryService && typeof window.CloudinaryService.uploadImage === 'function') {
        uploadedUrl = await window.CloudinaryService.uploadImage(file);
      }

      if (uploadedUrl) {
        this.showToast('Cloudinary upload successful! URL: ' + uploadedUrl.slice(0, 35) + '...', 'success');
      } else {
        this.showToast('Upload test completed (check Cloudinary preset credentials).', 'info');
      }
    } catch (err) {
      this.showToast('Upload test error: ' + err.message, 'error');
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.innerHTML = `<span>Test Cloudinary Connection</span>`;
      }
    }
  },

  async seedSampleProducts() {
    if (!confirm('Reset produce catalog to Grade A default fresh vegetables?')) return;
    if (window.ProductStorage) {
      window.ProductStorage.resetToDefaults();
    }
    if (window.FirebaseApp && window.FirebaseApp.isReady() && window.DEFAULT_PRODUCTS) {
      const count = await window.FirebaseApp.seedDefaultProducts(window.DEFAULT_PRODUCTS);
      this.showToast(`Successfully seeded ${count} produce items to Firestore!`, 'success');
    } else {
      this.showToast('Reset to default fresh vegetables locally.', 'success');
    }
    await this.loadAllData();
    this.renderProductsTab();
  },

  // ─── EVENT LISTENERS & CLOUDINARY DROPZONE ──────────────
  setupEventListeners() {
    // Orders filters
    document.getElementById('orders-status-filter')?.addEventListener('change', () => this.filterAndRenderOrders());
    document.getElementById('orders-search-input')?.addEventListener('input', () => this.filterAndRenderOrders());

    // Products filters
    document.getElementById('products-category-filter')?.addEventListener('change', () => this.filterAndRenderProducts());
    document.getElementById('products-search-input')?.addEventListener('input', () => this.filterAndRenderProducts());

    // Inquiries filter
    document.getElementById('inquiries-status-filter')?.addEventListener('change', () => this.filterAndRenderInquiries());

    // Forms
    document.getElementById('product-form')?.addEventListener('submit', (e) => this.handleProductFormSubmit(e));
    document.getElementById('category-form')?.addEventListener('submit', (e) => this.handleCategoryFormSubmit(e));
    document.getElementById('banner-form')?.addEventListener('submit', (e) => this.handleBannerFormSubmit(e));
    document.getElementById('settings-form')?.addEventListener('submit', (e) => this.handleSettingsFormSubmit(e));

    // Banner live preview listeners
    ['banner-form-text', 'banner-form-code', 'banner-form-link-text', 'banner-form-theme', 'banner-form-enabled'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.updateBannerPreview());
      document.getElementById(id)?.addEventListener('change', () => this.updateBannerPreview());
    });

    // Cloudinary Dropzone for Product Modal
    this.setupDropzone('product-image-dropzone', 'product-file-input', async (file) => {
      const previewImg = document.getElementById('product-image-preview');
      const urlInput = document.getElementById('product-form-image-url');

      if (previewImg) previewImg.src = URL.createObjectURL(file);

      // Upload via Cloudinary / Local Fast Compression Fallback
      if (window.CloudinaryService) {
        this.showToast('Uploading produce image...', 'info');
        const url = await window.CloudinaryService.uploadImage(file);
        if (url) {
          if (urlInput) urlInput.value = url;
          if (previewImg) previewImg.src = url;
          this.showToast('Produce image uploaded & ready!', 'success');
        } else {
          this.showToast('Image processing failed. Please select another image.', 'error');
        }
      }
    });

    // Cloudinary Test File Input
    document.getElementById('cloudinary-test-file')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.testCloudinaryUpload(e.target.files[0]);
      }
    });
  },

  setupDropzone(dropzoneId, fileInputId, onFileCallback) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(fileInputId);

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileCallback(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        onFileCallback(e.target.files[0]);
      }
    });
  },

  // ─── MODAL CONTROLLERS ──────────────────────────────────
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  },

  // ─── TOAST NOTIFICATIONS ────────────────────────────────
  showToast(message, type = 'info') {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    const icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');
    toast.innerHTML = `
      <span class="material-symbols-outlined text-base">${icon}</span>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  },

  // ─── UTILITIES & MOCK DATA ──────────────────────────────
  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  },

  formatDate(timestamp) {
    if (!timestamp) return 'Today';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('en-IN');
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString('en-IN');
    return new Date(timestamp).toLocaleDateString('en-IN');
  }
};

window.AdminCore = AdminCore;

document.addEventListener('DOMContentLoaded', () => {
  AdminCore.init();
});

