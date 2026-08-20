/**
 * Abhis Farm Fresh - Admin Dashboard Controller
 * Dynamic Date/Month Filtering (Current Month default), Real-time KPI metrics, and Order summaries
 */

let allDashboardOrders = [];
let allDashboardProducts = [];
let activePreset = 'current-month'; // 'current-month' | 'previous-month' | 'custom'
let activeDateRange = null;

document.addEventListener('DOMContentLoaded', async () => {
  initDateFilter();
  await loadDashboardData();
});

/**
 * Initialize Date Filter controls with Current Month as default
 */
function initDateFilter() {
  activeDateRange = Utils.getCurrentMonthRange();
  updateDateFilterUI();

  // Setup Custom Date inputs if changed
  const startDateInput = document.getElementById('dash-start-date');
  const endDateInput = document.getElementById('dash-end-date');

  if (startDateInput && endDateInput) {
    // Format YYYY-MM-DD for date inputs
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
 * @param {'current-month' | 'previous-month' | 'custom'} preset
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
    return; // Wait for user to pick dates
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

/**
 * Update the visual buttons and range label
 */
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
 * Load raw data from Firestore (or fallback defaults)
 */
async function loadDashboardData() {
  showDashboardSkeletons();

  try {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      const [orders, products] = await Promise.all([
        window.FirebaseApp.getAllOrders(),
        window.FirebaseApp.getAllProducts()
      ]);
      allDashboardOrders = orders || [];
      allDashboardProducts = products || [];
    }
  } catch (e) {
    console.warn('Error fetching live dashboard metrics from Firestore:', e);
  }

  // If no DB orders yet, provide fallback demo data with current dates
  if (!allDashboardOrders || allDashboardOrders.length === 0) {
    const now = new Date();
    allDashboardOrders = [
      {
        id: 'ord_demo_1',
        orderNumber: 'AFF-20260820-001',
        customerName: 'John Varma',
        shopName: 'Sri Lakshmi Hotel',
        phone: '6380710362',
        grandTotal: 221,
        status: 'pending',
        createdAt: now,
        items: [
          { productName: 'Fresh Tomato', quantity: 2, unit: 'KG', totalPrice: 70 },
          { productName: 'Red Onion', quantity: 3, unit: 'KG', totalPrice: 96 },
          { productName: 'Fresh Carrot', quantity: 1, unit: 'KG', totalPrice: 55 }
        ]
      },
      {
        id: 'ord_demo_2',
        orderNumber: 'AFF-20260820-002',
        customerName: 'Chef Arvind',
        shopName: 'Green Leaf Restaurant',
        phone: '6380710362',
        grandTotal: 1850,
        status: 'confirmed',
        createdAt: new Date(now.getTime() - 3600000 * 4),
        items: [
          { productName: 'Butterhead Lettuce', quantity: 10, unit: 'KG', totalPrice: 1200 },
          { productName: 'Green Capsicum', quantity: 10, unit: 'KG', totalPrice: 450 }
        ]
      }
    ];
  }

  if (!allDashboardProducts || allDashboardProducts.length === 0) {
    allDashboardProducts = window.DEFAULT_PRODUCTS || [];
  }

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

  renderKPIs(filteredOrders, allDashboardOrders.length);
  renderRecentOrders(filteredOrders);
  renderProductOverview(allDashboardProducts);
}

/**
 * Render KPI Cards based on the filtered orders
 */
function renderKPIs(orders, totalAllTimeOrders) {
  const pending = orders.filter(o => o.status === 'pending').length;
  const confirmed = orders.filter(o => o.status === 'confirmed').length;
  const rejected = orders.filter(o => o.status === 'rejected').length;

  // Total sales: sum of valid orders (excluding rejected/cancelled)
  const totalSales = orders
    .filter(o => o.status !== 'rejected' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

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
    countLabel.textContent = `${orders.length} Order${orders.length === 1 ? '' : 's'} in selected period`;
  }

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-10 text-slate-400">
          <span class="material-symbols-outlined text-3xl mb-1 text-slate-300">event_busy</span>
          <div class="font-bold text-slate-700 text-xs">No orders found in this date range</div>
          <div class="text-[11px] text-slate-400 mt-0.5">Try selecting a different month or viewing all orders.</div>
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
        <div class="font-bold text-xs text-slate-800">${Utils.escapeHtml(o.customerName || '—')}</div>
        <div class="text-[11px] text-emerald-800 font-semibold">${Utils.escapeHtml(o.shopName || '')}</div>
      </td>
      <td class="py-3 px-4 text-slate-600 font-mono text-xs">${o.phone || '—'}</td>
      <td class="py-3 px-4 text-slate-500 text-[11px]">${Utils.formatDateTime(o.createdAt)}</td>
      <td class="py-3 px-4 font-extrabold text-slate-900 text-xs">${Utils.formatCurrency(o.grandTotal)}</td>
      <td class="py-3 px-4">${Utils.getStatusBadge(o.status || 'pending')}</td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1">
          <button type="button" 
                  onclick="WhatsAppService.openCustomerWhatsApp(${JSON.stringify(o).replace(/"/g, '&quot;')})" 
                  class="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" 
                  title="WhatsApp Customer (${o.phone || 'N/A'})">
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
