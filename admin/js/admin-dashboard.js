/**
 * Abhis Farm Fresh - Admin Dashboard Controller
 * Dynamic Date/Month Filtering (Current Month default), Real-time KPI metrics, and Live Firestore Data
 */

let allDashboardOrders = [];
let allDashboardProducts = [];
let activePreset = 'current-month'; // 'current-month' | 'previous-month' | 'custom'
let activeDateRange = null;

document.addEventListener('DOMContentLoaded', async () => {
  initDateFilter();
  updateConnectionStatus();
  await loadDashboardData();

  if (window.FirebaseApp && typeof window.FirebaseApp.subscribeToOrders === 'function') {
    window.FirebaseApp.subscribeToOrders((updatedOrders) => {
      allDashboardOrders = updatedOrders || [];
      recalculateAndRenderDashboard();
    });
  }
});

/**
 * Update the live Firebase Connection indicator
 */
function updateConnectionStatus() {
  if (window.FirebaseApp) {
    window.FirebaseApp.updateConnectionBadge();
  }
}

/**
 * Initialize Date Filter controls with Current Month as default
 */
function initDateFilter() {
  activeDateRange = Utils.getCurrentMonthRange();
  updateDateFilterUI();

  const startDateInput = document.getElementById('dash-start-date');
  const endDateInput = document.getElementById('dash-end-date');

  if (startDateInput && endDateInput) {
    const toISODate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    startDateInput.value = toISODate(activeDateRange.start);
    endDateInput.value = toISODate(activeDateRange.end);

    const handleCustomChange = () => {
      if (startDateInput.value && endDateInput.value) {
        const start = new Date(`${startDateInput.value}T00:00:00.000`);
        const end = new Date(`${endDateInput.value}T23:59:59.999`);
        if (start > end) {
          Utils.showToast('Start date cannot be after end date', 'warning');
          return;
        }
        activePreset = 'custom';
        activeDateRange = {
          start,
          end,
          label: 'Custom Range',
          formattedRange: `${Utils.formatDate(start)} – ${Utils.formatDate(end)}`
        };
        updateDateFilterUI();
        recalculateAndRenderDashboard();
      }
    };

    startDateInput.addEventListener('change', handleCustomChange);
    endDateInput.addEventListener('change', handleCustomChange);
  }
}

/**
 * Select a predefined Date Filter Preset
 */
function selectDashboardPreset(preset) {
  activePreset = preset;

  if (preset === 'current-month') {
    activeDateRange = Utils.getCurrentMonthRange();
  } else if (preset === 'previous-month') {
    activeDateRange = Utils.getPreviousMonthRange();
  }

  const customContainer = document.getElementById('dash-custom-date-container');
  const startDateInput = document.getElementById('dash-start-date');
  const endDateInput = document.getElementById('dash-end-date');

  if (preset === 'custom') {
    if (customContainer) customContainer.classList.remove('hidden');
    return;
  } else {
    if (customContainer) customContainer.classList.add('hidden');
    if (startDateInput && endDateInput && activeDateRange) {
      const toISODate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      startDateInput.value = toISODate(activeDateRange.start);
      endDateInput.value = toISODate(activeDateRange.end);
    }
  }

  updateDateFilterUI();
  recalculateAndRenderDashboard();
}

function updateDateFilterUI() {
  const currentBtn = document.getElementById('filter-btn-current-month');
  const prevBtn = document.getElementById('filter-btn-prev-month');
  const customBtn = document.getElementById('filter-btn-custom');
  const rangeLabel = document.getElementById('dash-active-range-label');

  const activeClass = "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all bg-emerald-800 text-white shadow-sm";
  const inactiveClass = "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all bg-white text-slate-700 hover:bg-slate-100 border border-slate-200";

  if (currentBtn) currentBtn.className = activePreset === 'current-month' ? activeClass : inactiveClass;
  if (prevBtn) prevBtn.className = activePreset === 'previous-month' ? activeClass : inactiveClass;
  if (customBtn) customBtn.className = activePreset === 'custom' ? activeClass : inactiveClass;

  if (rangeLabel && activeDateRange) {
    rangeLabel.textContent = `${activeDateRange.formattedRange} (${activeDateRange.label})`;
  }
}

/**
 * Load raw data from Firestore
 */
async function loadDashboardData() {
  showDashboardSkeletons();

  try {
    if (window.FirebaseApp) {
      const [orders, products] = await Promise.all([
        window.FirebaseApp.getAllOrders(),
        window.FirebaseApp.getAllProducts()
      ]);
      allDashboardOrders = orders || [];
      allDashboardProducts = products || [];
    } else {
      allDashboardOrders = window.OrderStorage ? window.OrderStorage.getAll() : [];
      allDashboardProducts = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
    }
  } catch (e) {
    console.warn('Error fetching dashboard data:', e);
    allDashboardOrders = window.OrderStorage ? window.OrderStorage.getAll() : [];
    allDashboardProducts = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
  }

  if (allDashboardProducts.length === 0 && window.DEFAULT_PRODUCTS) {
    allDashboardProducts = window.DEFAULT_PRODUCTS;
  }

  updateConnectionStatus();
  recalculateAndRenderDashboard();
}

/**
 * Filter orders by currently selected date range and render all widgets
 */
function recalculateAndRenderDashboard() {
  if (!activeDateRange) {
    activeDateRange = Utils.getCurrentMonthRange();
  }

  const { start, end } = activeDateRange;

  // Filter orders strictly within the date range
  const filteredOrders = allDashboardOrders.filter(order => {
    const orderDate = Utils.parseDate(order.createdAt);
    if (!orderDate) return false;
    return orderDate >= start && orderDate <= end;
  });

  renderKPIs(filteredOrders);
  renderRecentOrders(filteredOrders);
  renderProductOverview(allDashboardProducts);
}

/**
 * Render KPI Cards based on filtered orders
 */
function renderKPIs(orders) {
  const pending = orders.filter(o => (o.status || 'pending').toLowerCase() === 'pending').length;
  const confirmed = orders.filter(o => (o.status || '').toLowerCase() === 'confirmed').length;
  const rejected = orders.filter(o => (o.status || '').toLowerCase() === 'rejected').length;

  const totalSales = orders
    .filter(o => {
      const s = (o.status || '').toLowerCase();
      return s !== 'rejected' && s !== 'cancelled';
    })
    .reduce((sum, o) => sum + Utils.getOrderTotal(o), 0);

  const salesEl = document.getElementById('kpi-total-sales');
  const totalOrdersEl = document.getElementById('kpi-total-orders');
  const pendingEl = document.getElementById('kpi-pending-orders');
  const confirmedEl = document.getElementById('kpi-confirmed-orders');
  const rejectedEl = document.getElementById('kpi-rejected-orders');

  if (salesEl) salesEl.textContent = Utils.formatCurrency(totalSales);
  if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
  if (pendingEl) pendingEl.textContent = pending;
  if (confirmedEl) confirmedEl.textContent = confirmed;
  if (rejectedEl) rejectedEl.textContent = rejected;
}

/**
 * Render Recent Orders Table for the selected month/date range
 */
function renderRecentOrders(orders) {
  const tbody = document.getElementById('dash-orders-tbody');
  const countLabel = document.getElementById('dash-orders-count');
  if (!tbody) return;

  if (countLabel) {
    countLabel.textContent = `${orders.length} Order${orders.length === 1 ? '' : 's'}`;
  }

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-10 text-slate-400">
          <span class="material-symbols-outlined text-3xl mb-1 text-slate-300">inbox</span>
          <div class="font-bold text-slate-700 text-xs">No orders in this period</div>
          <div class="text-[11px] text-slate-400 mt-0.5">Orders placed by customers will appear here in real-time.</div>
        </td>
      </tr>
    `;
    return;
  }

  // Sort newest first
  const sorted = [...orders].sort((a, b) => {
    const da = Utils.parseDate(a.createdAt)?.getTime() || 0;
    const db = Utils.parseDate(b.createdAt)?.getTime() || 0;
    return db - da;
  });

  const recent = sorted.slice(0, 10);

  tbody.innerHTML = recent.map(o => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td class="py-3 px-4 font-extrabold text-slate-900 font-mono text-xs">${o.orderNumber || o.id}</td>
      <td class="py-3 px-4">
        <div class="font-bold text-xs text-slate-900">${Utils.escapeHtml(o.customerName || '—')}</div>
        <div class="text-[11px] text-emerald-800 font-semibold">${Utils.escapeHtml(o.shopName || '')}</div>
      </td>
      <td class="py-3 px-4 text-slate-600 font-mono text-xs">${o.phone || '—'}</td>
      <td class="py-3 px-4 text-slate-500 text-[11px]">${Utils.formatDateTime(o.createdAt)}</td>
      <td class="py-3 px-4 font-extrabold text-slate-900 text-xs">${Utils.formatCurrency(Utils.getOrderTotal(o))}</td>
      <td class="py-3 px-4">${Utils.getStatusBadge(o.status || 'pending')}</td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1">
          <button type="button" 
                  data-order-id="${Utils.escapeHtml(o.id || o.orderNumber)}" 
                  class="btn-dash-wa p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" 
                  title="WhatsApp Customer">
            <span class="material-symbols-outlined text-base">chat</span>
          </button>
          <a href="orders.html?orderId=${encodeURIComponent(o.id || o.orderNumber)}" 
             class="admin-btn admin-btn-secondary text-[11px] py-1 px-2.5">
            Manage &rarr;
          </a>
        </div>
      </td>
    </tr>
  `).join('');

  if (!tbody._hasDashOrdersDelegation) {
    tbody._hasDashOrdersDelegation = true;
    tbody.addEventListener('click', (e) => {
      const waBtn = e.target.closest('.btn-dash-wa');
      if (waBtn && waBtn.dataset.orderId) {
        const order = allDashboardOrders.find(x => String(x.id) === waBtn.dataset.orderId || String(x.orderNumber) === waBtn.dataset.orderId);
        if (order) WhatsAppService.openCustomerWhatsApp(order);
      }
    });
  }
}

function renderProductOverview(products) {
  const container = document.getElementById('dash-products-overview');
  if (!container) return;

  const available = products.filter(p => p.status === 'available' || p.stock > 0).length;
  const outOfStock = products.filter(p => p.status === 'out_of_stock' || p.stock <= 0).length;

  container.innerHTML = `
    <div class="flex items-center justify-between text-xs py-2 border-b border-slate-100">
      <span class="text-slate-600">Total Vegetables in Database</span>
      <span class="font-bold text-slate-900">${products.length} Items</span>
    </div>
    <div class="flex items-center justify-between text-xs py-2 border-b border-slate-100">
      <span class="text-slate-600">In Stock & Active</span>
      <span class="font-bold text-emerald-700">${available} Available</span>
    </div>
    <div class="flex items-center justify-between text-xs py-2">
      <span class="text-slate-600">Out of Stock / Inactive</span>
      <span class="font-bold text-red-600">${outOfStock} Items</span>
    </div>
  `;
}

function showDashboardSkeletons() {
  const salesEl = document.getElementById('kpi-total-sales');
  const totalOrdersEl = document.getElementById('kpi-total-orders');
  const pendingEl = document.getElementById('kpi-pending-orders');
  const confirmedEl = document.getElementById('kpi-confirmed-orders');
  const rejectedEl = document.getElementById('kpi-rejected-orders');

  if (salesEl) salesEl.innerHTML = '<span class="inline-block w-16 h-6 bg-slate-200 animate-pulse rounded"></span>';
  if (totalOrdersEl) totalOrdersEl.innerHTML = '<span class="inline-block w-10 h-6 bg-slate-200 animate-pulse rounded"></span>';
  if (pendingEl) pendingEl.innerHTML = '<span class="inline-block w-10 h-6 bg-slate-200 animate-pulse rounded"></span>';
  if (confirmedEl) confirmedEl.innerHTML = '<span class="inline-block w-10 h-6 bg-slate-200 animate-pulse rounded"></span>';
  if (rejectedEl) rejectedEl.innerHTML = '<span class="inline-block w-10 h-6 bg-slate-200 animate-pulse rounded"></span>';
}

window.selectDashboardPreset = selectDashboardPreset;
