/**
 * Abhis Farm Fresh — Executive Admin Core Controller
 * Handles 7 Core Modules: Auth, Orders, Products, Categories, Inquiries, Banner, Settings
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
  },

  // ─── TAB ROUTING ────────────────────────────────────────
  setupTabRouting() {
    // Check URL hash (#orders, #products, #categories, #inquiries, #banner, #settings)
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
      inquiries: 'Customer Inquiries & Leads | Abhis Admin',
      banner: 'Top Promo Banner CMS | Abhis Admin',
      settings: 'Firebase & Cloudinary Hub | Abhis Admin'
    };
    document.title = titles[tabId] || 'Admin CRM | Abhis Farm Fresh';

    // Render tab-specific view
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

  // ─── DATA LOADING ───────────────────────────────────────
  async loadAllData() {
    try {
      // 1. Products
      if (window.FirebaseApp && window.FirebaseApp.isReady()) {
        this.products = await window.FirebaseApp.getAllProducts();
        if (this.products.length === 0 && window.DEFAULT_PRODUCTS) {
          this.products = [...window.DEFAULT_PRODUCTS];
        }
      } else if (window.DEFAULT_PRODUCTS) {
        this.products = [...window.DEFAULT_PRODUCTS];
      }

      // 2. Categories
      if (window.FirebaseApp && window.FirebaseApp.isReady()) {
        this.categories = await window.FirebaseApp.getCategories();
      } else if (window.AFF_CONFIG && window.AFF_CONFIG.categories) {
        this.categories = [...window.AFF_CONFIG.categories];
      }

      // 3. Orders
      if (window.FirebaseApp && window.FirebaseApp.isReady()) {
        this.orders = await window.FirebaseApp.getAllOrders();
      }
      if (!this.orders || this.orders.length === 0) {
        this.orders = this.getMockOrders();
      }

      // 4. Inquiries
      if (window.FirebaseApp && window.FirebaseApp.isReady()) {
        this.inquiries = await window.FirebaseApp.getInquiries();
      }
      if (!this.inquiries || this.inquiries.length === 0) {
        this.inquiries = this.getMockInquiries();
      }

      // 5. Banner Settings
      if (window.FirebaseApp && window.FirebaseApp.isReady()) {
        this.bannerSettings = await window.FirebaseApp.getBannerSettings();
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
      if (window.FirebaseApp && window.FirebaseApp.isReady()) {
        this.cloudinarySettings = await window.FirebaseApp.getAppSettings();
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
    const totalRev = this.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const pendingCount = this.orders.filter(o => o.status === 'pending').length;
    const deliveredCount = this.orders.filter(o => o.status === 'delivered' || o.status === 'confirmed').length;

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
      const itemsCount = (order.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
      const totalFormatted = `₹${(Number(order.total) || 0).toLocaleString('en-IN')}`;
      const statusClass = `status-${(order.status || 'pending').toLowerCase()}`;
      const dateStr = this.formatDate(order.createdAt);

      return `
        <tr>
          <td class="font-mono font-bold text-slate-900">${orderNum}</td>
          <td>
            <div class="font-bold text-slate-900">${this.escapeHtml(order.name || order.customerName || 'Customer')}</div>
            <div class="text-[11px] text-slate-400">${this.escapeHtml(order.shopName || order.phone || '')}</div>
          </td>
          <td>
            <span class="font-semibold text-slate-700">${itemsCount} kg / items</span>
          </td>
          <td class="font-extrabold text-emerald-800">${totalFormatted}</td>
          <td>
            <select onchange="AdminCore.updateOrderStatus('${order.id}', this.value)"
                    class="status-pill ${statusClass} text-xs font-bold border rounded-lg px-2.5 py-1 bg-white cursor-pointer outline-none">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
              <option value="out_for_delivery" ${order.status === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td class="text-slate-500 text-[11px]">${dateStr}</td>
          <td class="text-right space-x-1.5 whitespace-nowrap">
            <button onclick="AdminCore.viewOrderDetails('${order.id}')" 
                    class="p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition-colors"
                    title="View Order Details">
              <span class="material-symbols-outlined text-lg">visibility</span>
            </button>
            <button onclick="AdminCore.printInvoice('${order.id}')" 
                    class="p-1.5 text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Print Tax Invoice">
              <span class="material-symbols-outlined text-lg">print</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      if (window.FirebaseApp && window.FirebaseApp.isReady()) {
        await window.FirebaseApp.updateOrderStatus(orderId, newStatus);
      }
      
      const order = this.orders.find(o => o.id === orderId);
      if (order) order.status = newStatus;

      this.showToast(`Order status updated to "${newStatus.replace('_', ' ')}"`, 'success');
      this.renderOrdersKPIs();
    } catch (err) {
      this.showToast('Failed to update status: ' + err.message, 'error');
    }
  },

  viewOrderDetails(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('order-details-modal');
    const content = document.getElementById('order-details-modal-content');
    if (!modal || !content) return;

    const items = order.items || [];
    const itemsHtml = items.map(item => `
      <div class="flex items-center justify-between py-2.5 border-b border-slate-100 text-xs">
        <div>
          <div class="font-bold text-slate-900">${this.escapeHtml(item.name)}</div>
          <div class="text-[11px] text-slate-400">₹${item.price} / ${item.unit || 'KG'}</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-slate-900">${item.quantity} ${item.unit || 'KG'}</div>
          <div class="font-extrabold text-emerald-800">₹${(item.price * item.quantity).toFixed(2)}</div>
        </div>
      </div>
    `).join('');

    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-start justify-between border-b pb-4 border-slate-100">
          <div>
            <span class="status-pill status-${order.status || 'pending'}">${order.status || 'pending'}</span>
            <h3 class="text-xl font-extrabold text-slate-900 mt-2 font-mono">${order.orderNumber || order.id}</h3>
            <p class="text-xs text-slate-400">Placed on ${this.formatDate(order.createdAt)}</p>
          </div>
          <div class="text-right">
            <div class="text-xs text-slate-400 font-bold uppercase">Grand Total</div>
            <div class="text-2xl font-black text-emerald-800">₹${(Number(order.total) || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
          <div>
            <div class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Customer / Business</div>
            <div class="font-extrabold text-slate-900 text-sm">${this.escapeHtml(order.name || order.customerName || 'N/A')}</div>
            <div class="text-slate-600 font-medium">${this.escapeHtml(order.shopName || '')}</div>
            <div class="text-emerald-700 font-bold mt-1">📞 ${this.escapeHtml(order.phone || 'N/A')}</div>
          </div>
          <div>
            <div class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Delivery Address</div>
            <div class="text-slate-700 leading-relaxed">${this.escapeHtml(order.address || 'Standard Delivery')}</div>
            <div class="text-slate-500 font-semibold mt-1">Payment: <span class="text-slate-900 font-bold uppercase">${order.paymentMethod || 'UPI / Online'}</span></div>
          </div>
        </div>

        <div>
          <div class="font-extrabold text-slate-900 text-sm mb-3">Ordered Produce (${items.length} items)</div>
          <div class="space-y-1">
            ${itemsHtml || '<p class="text-xs text-slate-400">No item details recorded.</p>'}
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
          <a href="https://wa.me/${(order.phone || '').replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(order.name || 'Customer')}!%20Regarding%20your%20Abhis%20Farm%20Fresh%20Order%20${encodeURIComponent(order.orderNumber || order.id)}" 
             target="_blank" class="admin-btn admin-btn-whatsapp text-xs font-bold">
            <span class="material-symbols-outlined text-base">chat</span>
            <span>WhatsApp Customer</span>
          </a>
          <button onclick="AdminCore.printInvoice('${order.id}')" class="admin-btn admin-btn-primary text-xs font-bold">
            <span class="material-symbols-outlined text-base">print</span>
            <span>Print Tax Invoice</span>
          </button>
        </div>
      </div>
    `;

    this.openModal('order-details-modal');
  },

  printInvoice(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const printArea = document.getElementById('invoice-print-area');
    if (!printArea) return;

    const items = order.items || [];
    const itemsRows = items.map((it, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-size: 11px; font-weight: bold;">${this.escapeHtml(it.name)}</td>
        <td style="padding: 10px 12px; font-size: 11px; text-align: center;">${it.quantity} ${it.unit || 'KG'}</td>
        <td style="padding: 10px 12px; font-size: 11px; text-align: right;">₹${Number(it.price).toFixed(2)}</td>
        <td style="padding: 10px 12px; font-size: 11px; text-align: right; font-weight: bold;">₹${(it.price * it.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

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
            <p style="margin: 0; font-size: 11px; color: #64748b;">Date: ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <!-- Bill To -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div>
            <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">BILLED TO:</div>
            <div style="font-size: 14px; font-weight: 800; margin-top: 4px;">${this.escapeHtml(order.name || order.customerName || 'Customer')}</div>
            <div style="font-size: 12px; color: #475569;">${this.escapeHtml(order.shopName || '')}</div>
            <div style="font-size: 12px; color: #475569;">Phone: ${this.escapeHtml(order.phone || 'N/A')}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">DELIVERY DETAILS:</div>
            <div style="font-size: 12px; color: #475569; max-width: 250px; margin-top: 4px;">${this.escapeHtml(order.address || 'Standard Delivery')}</div>
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
              <td style="padding: 12px; text-align: right; font-weight: 900; font-size: 14px; color: #064e3b;">₹${(Number(order.total) || 0).toFixed(2)}</td>
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
      const imgUrl = product.imageUrl || 'images/farm_fresh_media_01.jpeg';

      const badges = Array.isArray(product.badges) ? product.badges : [];

      return `
        <div class="admin-card p-4 flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
          <div>
            <!-- Image & Stock Badge -->
            <div class="relative h-44 rounded-xl overflow-hidden bg-slate-100 mb-3">
              <img src="${imgUrl}" alt="${this.escapeHtml(product.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
              
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
            <button onclick="AdminCore.editProduct('${product.id}')" class="admin-btn admin-btn-secondary flex-1 text-xs py-2">
              <span class="material-symbols-outlined text-sm">edit</span>
              <span>Edit</span>
            </button>
            <button onclick="AdminCore.toggleProductStock('${product.id}')" 
                    class="admin-btn ${isOutOfStock ? 'admin-btn-primary' : 'admin-btn-secondary'} text-xs p-2"
                    title="${isOutOfStock ? 'Mark In Stock' : 'Mark Out of Stock'}">
              <span class="material-symbols-outlined text-sm">${isOutOfStock ? 'check_circle' : 'block'}</span>
            </button>
            <button onclick="AdminCore.deleteProduct('${product.id}')" class="admin-btn admin-btn-danger text-xs p-2" title="Delete Product">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  openAddProductModal() {
    document.getElementById('product-form')?.reset();
    document.getElementById('product-form-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Add New Fresh Produce';
    document.getElementById('product-image-preview').src = 'images/farm_fresh_media_01.jpeg';
    this.openModal('product-modal');
  },

  editProduct(productId) {
    const p = this.products.find(item => item.id === productId);
    if (!p) return;

    document.getElementById('product-modal-title').textContent = 'Edit Produce Details';
    document.getElementById('product-form-id').value = p.id;
    document.getElementById('product-form-name').value = p.name || '';
    document.getElementById('product-form-category').value = p.category || 'everyday';
    document.getElementById('product-form-price').value = p.price || '';
    document.getElementById('product-form-discount').value = p.discountPrice || '';
    document.getElementById('product-form-unit').value = p.unit || 'KG';
    document.getElementById('product-form-stock').value = p.stock || 500;
    document.getElementById('product-form-sku').value = p.sku || p.id || '';
    document.getElementById('product-form-desc').value = p.description || '';
    document.getElementById('product-form-image-url').value = p.imageUrl || '';
    document.getElementById('product-form-origin').value = p.origin || '';
    document.getElementById('product-form-shelflife').value = p.shelfLife || '';

    // Badges checkboxes
    const badges = Array.isArray(p.badges) ? p.badges : [];
    document.querySelectorAll('.product-badge-checkbox').forEach(cb => {
      cb.checked = badges.includes(cb.value);
    });

    document.getElementById('product-image-preview').src = p.imageUrl || 'images/farm_fresh_media_01.jpeg';
    this.openModal('product-modal');
  },

  async handleProductFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('product-form-id').value.trim();
    const name = document.getElementById('product-form-name').value.trim();
    const category = document.getElementById('product-form-category').value;
    const price = Number(document.getElementById('product-form-price').value) || 0;
    const discountPrice = Number(document.getElementById('product-form-discount').value) || null;
    const unit = document.getElementById('product-form-unit').value;
    const stock = Number(document.getElementById('product-form-stock').value) || 0;
    const sku = document.getElementById('product-form-sku').value.trim() || `AFF-${Date.now().toString().slice(-4)}`;
    const description = document.getElementById('product-form-desc').value.trim();
    const imageUrl = document.getElementById('product-form-image-url').value.trim() || 'images/farm_fresh_media_01.jpeg';
    const origin = document.getElementById('product-form-origin').value.trim();
    const shelfLife = document.getElementById('product-form-shelflife').value.trim();

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
        // Update
        if (window.FirebaseApp && window.FirebaseApp.isReady()) {
          await window.FirebaseApp.updateProduct(id, productData);
        }
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
          this.products[index] = { ...this.products[index], ...productData };
        }
        this.showToast('Product updated successfully!', 'success');
      } else {
        // Create
        let newId = `prod_${Date.now()}`;
        if (window.FirebaseApp && window.FirebaseApp.isReady()) {
          newId = await window.FirebaseApp.addProduct(productData) || newId;
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
    const p = this.products.find(item => item.id === productId);
    if (!p) return;

    const isCurrentlyOut = Number(p.stock) === 0 || p.status === 'out_of_stock';
    const newStock = isCurrentlyOut ? 200 : 0;
    const newStatus = isCurrentlyOut ? 'available' : 'out_of_stock';

    p.stock = newStock;
    p.status = newStatus;

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.updateProduct(productId, { stock: newStock, status: newStatus });
    }

    this.showToast(`${p.name} marked as ${isCurrentlyOut ? 'In Stock' : 'Out of Stock'}`, 'info');
    this.renderProductsTab();
  },

  async deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this produce item from the catalogue?')) return;

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.deleteProduct(productId);
    }

    this.products = this.products.filter(p => p.id !== productId);
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
            <button onclick="AdminCore.editCategory('${cat.id}')" class="p-2 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-slate-100" title="Edit Category">
              <span class="material-symbols-outlined text-lg">edit</span>
            </button>
            <button onclick="AdminCore.deleteCategory('${cat.id}')" class="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100" title="Delete Category">
              <span class="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  openAddCategoryModal() {
    document.getElementById('category-form')?.reset();
    document.getElementById('category-form-id').value = '';
    document.getElementById('category-modal-title').textContent = 'Add Product Category';
    this.openModal('category-modal');
  },

  editCategory(catId) {
    const cat = this.categories.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('category-modal-title').textContent = 'Edit Category';
    document.getElementById('category-form-id').value = cat.id;
    document.getElementById('category-form-name').value = cat.name || '';
    document.getElementById('category-form-icon').value = cat.icon || 'eco';
    document.getElementById('category-form-subtitle').value = cat.subtitle || '';
    document.getElementById('category-form-order').value = cat.order || 1;

    this.openModal('category-modal');
  },

  async handleCategoryFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('category-form-id').value.trim() || `cat_${Date.now()}`;
    const name = document.getElementById('category-form-name').value.trim();
    const icon = document.getElementById('category-form-icon').value.trim() || 'eco';
    const subtitle = document.getElementById('category-form-subtitle').value.trim();
    const order = Number(document.getElementById('category-form-order').value) || 1;

    const catData = { id, name, icon, subtitle, order };

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.addCategory(catData);
    }

    const index = this.categories.findIndex(c => c.id === id);
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

    this.categories = this.categories.filter(c => c.id !== catId);
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
              <select onchange="AdminCore.updateInquiryStatus('${inq.id}', this.value)"
                      class="admin-input text-xs py-1.5 px-2.5 rounded-lg font-bold bg-slate-50">
                <option value="unread" ${inq.status === 'unread' ? 'selected' : ''}>Unread</option>
                <option value="contacted" ${inq.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                <option value="resolved" ${inq.status === 'resolved' ? 'selected' : ''}>Resolved</option>
              </select>
              <button onclick="AdminCore.deleteInquiry('${inq.id}')" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Delete lead">
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
              <a href="mailto:${inq.email}?subject=Abhis%20Farm%20Fresh%20Inquiry%20Response" 
                 class="admin-btn admin-btn-secondary text-xs py-2 px-3">
                <span class="material-symbols-outlined text-base">mail</span>
                <span>Send Email</span>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  async updateInquiryStatus(inquiryId, status) {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.updateInquiryStatus(inquiryId, status);
    }
    const inq = this.inquiries.find(i => i.id === inquiryId);
    if (inq) inq.status = status;

    this.showToast(`Inquiry marked as ${status}`, 'success');
    this.renderInquiriesKPIs();
  },

  async deleteInquiry(inquiryId) {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.deleteInquiry(inquiryId);
    }
    this.inquiries = this.inquiries.filter(i => i.id !== inquiryId);
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
    const enabled = document.getElementById('banner-form-enabled').checked;
    const text = document.getElementById('banner-form-text').value.trim();
    const code = document.getElementById('banner-form-code').value.trim();
    const linkText = document.getElementById('banner-form-link-text').value.trim();
    const linkUrl = document.getElementById('banner-form-link-url').value.trim();
    const theme = document.getElementById('banner-form-theme').value;

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

    // Firebase Diagnostics
    const statsContainer = document.getElementById('settings-firebase-stats');
    if (statsContainer && window.FirebaseApp) {
      statsContainer.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span> Checking database status...`;
      const stats = await window.FirebaseApp.getDatabaseStats();
      
      if (stats.connected) {
        statsContainer.innerHTML = `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="p-3 bg-slate-50 rounded-xl">
              <div class="text-[10px] font-bold text-slate-400 uppercase">Products</div>
              <div class="text-xl font-extrabold text-slate-900">${stats.products}</div>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl">
              <div class="text-[10px] font-bold text-slate-400 uppercase">Orders</div>
              <div class="text-xl font-extrabold text-slate-900">${stats.orders}</div>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl">
              <div class="text-[10px] font-bold text-slate-400 uppercase">Customers</div>
              <div class="text-xl font-extrabold text-slate-900">${stats.customers}</div>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl">
              <div class="text-[10px] font-bold text-slate-400 uppercase">Inquiries</div>
              <div class="text-xl font-extrabold text-slate-900">${stats.inquiries}</div>
            </div>
          </div>
        `;
      } else {
        statsContainer.innerHTML = `
          <div class="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center gap-2">
            <span class="material-symbols-outlined text-base">info</span>
            <span>Firestore operates in offline/local mock mode (API keys not provided). Connect live Firebase credentials in <code>js/firebase-config.js</code></span>
          </div>
        `;
      }
    }
  },

  async handleSettingsFormSubmit(e) {
    e.preventDefault();
    const cloudName = document.getElementById('settings-cloudinary-name').value.trim();
    const uploadPreset = document.getElementById('settings-cloudinary-preset').value.trim();
    const folder = document.getElementById('settings-cloudinary-folder').value.trim();

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
    if (!confirm('Seed default Grade A vegetable produce into Firestore?')) return;
    if (window.FirebaseApp && window.FirebaseApp.isReady() && window.DEFAULT_PRODUCTS) {
      const count = await window.FirebaseApp.seedDefaultProducts(window.DEFAULT_PRODUCTS);
      this.showToast(`Successfully seeded ${count} produce items to Firestore!`, 'success');
      await this.loadAllData();
      this.renderProductsTab();
    } else {
      this.showToast('Firestore not connected yet.', 'info');
    }
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

      // Upload via Cloudinary
      if (window.CloudinaryService) {
        this.showToast('Uploading produce image to Cloudinary...', 'info');
        const url = await window.CloudinaryService.uploadImage(file);
        if (url) {
          if (urlInput) urlInput.value = url;
          if (previewImg) previewImg.src = url;
          this.showToast('Image uploaded successfully!', 'success');
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
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
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
  },

  getMockOrders() {
    return [
      {
        id: "AFF-20260822-101",
        orderNumber: "AFF-20260822-101",
        name: "Suresh Kumar",
        shopName: "Hotel Saravana Grand",
        phone: "9876543210",
        address: "12/4 North Main Road, Thanjavur",
        paymentMethod: "UPI (Google Pay)",
        status: "pending",
        total: 1450,
        createdAt: new Date(),
        items: [
          { name: "Fresh Tomato (Hybrid)", price: 35, quantity: 20, unit: "KG" },
          { name: "Red Onion (Nasik)", price: 32, quantity: 20, unit: "KG" },
          { name: "Green Capsicum", price: 45, quantity: 2, unit: "KG" }
        ]
      },
      {
        id: "AFF-20260822-102",
        orderNumber: "AFF-20260822-102",
        name: "Anand R.",
        shopName: "Greenleaf Organic Kitchen",
        phone: "6380710362",
        address: "Plot 88, Near New Bus Stand, Thanjavur",
        paymentMethod: "Bank NEFT Transfer",
        status: "processing",
        total: 2800,
        createdAt: new Date(Date.now() - 3600000),
        items: [
          { name: "Baby Spinach", price: 60, quantity: 10, unit: "KG" },
          { name: "Butterhead Lettuce", price: 120, quantity: 10, unit: "KG" },
          { name: "Genovese Basil", price: 240, quantity: 4, unit: "KG" }
        ]
      },
      {
        id: "AFF-20260821-089",
        orderNumber: "AFF-20260821-089",
        name: "Priya V.",
        shopName: "Home Kitchen",
        phone: "9443210987",
        address: "Flat 4B, Kaveri Apartments, Medical College Rd",
        paymentMethod: "UPI (PhonePe)",
        status: "delivered",
        total: 580,
        createdAt: new Date(Date.now() - 86400000),
        items: [
          { name: "Fresh Carrot", price: 55, quantity: 4, unit: "KG" },
          { name: "Fresh Potato", price: 28, quantity: 5, unit: "KG" },
          { name: "Green Chilli", price: 80, quantity: 2, unit: "KG" }
        ]
      }
    ];
  },

  getMockInquiries() {
    return [
      {
        id: "inq_001",
        name: "Chef Rajesh Raman",
        phone: "9840123456",
        email: "rajesh@grandpalacerestaurant.in",
        message: "We need 50kg Tomatoes, 40kg Onions, and 20kg Capsicum delivered daily by 5:30 AM for our hotel buffet prep. Please share bulk tier quotation.",
        status: "unread",
        createdAt: new Date()
      },
      {
        id: "inq_002",
        name: "Karthik Catering Services",
        phone: "9789012345",
        email: "karthik.catering@gmail.com",
        message: "Looking for marriage catering vegetable supply for upcoming 500-guest event this weekend.",
        status: "contacted",
        createdAt: new Date(Date.now() - 172800000)
      }
    ];
  }
};

window.AdminCore = AdminCore;

document.addEventListener('DOMContentLoaded', () => {
  AdminCore.init();
});
