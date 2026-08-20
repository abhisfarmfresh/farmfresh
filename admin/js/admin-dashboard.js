/**
 * Abhis Farm Fresh - Admin Dashboard Controller
 * Real-time stats calculation, recent orders table, and stock overview
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();
});

async function loadDashboardData() {
  let orders = [];
  let products = [];
  let customers = [];

  if (window.FirebaseApp && window.FirebaseApp.isReady()) {
    try {
      [orders, products, customers] = await Promise.all([
        window.FirebaseApp.getAllOrders(),
        window.FirebaseApp.getAllProducts(),
        window.FirebaseApp.getAllCustomers()
      ]);
    } catch (e) {
      console.warn('Error fetching live dashboard metrics:', e);
    }
  }

  // Fallback if no database orders yet
  if (!orders || orders.length === 0) {
    orders = [
      {
        id: 'ord_demo_1',
        orderNumber: 'AFF-20260820-001',
        customerName: 'John Varma',
        shopName: 'Sri Lakshmi Hotel',
        phone: '6380710362',
        grandTotal: 221,
        status: 'pending',
        createdAt: new Date(),
        items: [{ productName: 'Tomato', quantity: 2, totalPrice: 70 }, { productName: 'Onion', quantity: 3, totalPrice: 96 }, { productName: 'Carrot', quantity: 1, totalPrice: 55 }]
      },
      {
        id: 'ord_demo_2',
        orderNumber: 'AFF-20260820-002',
        customerName: 'Chef Arvind',
        shopName: 'Green Leaf Restaurant',
        phone: '6380710362',
        grandTotal: 1850,
        status: 'confirmed',
        createdAt: new Date(Date.now() - 3600000),
        items: [{ productName: 'Butterhead Lettuce', quantity: 10, totalPrice: 1200 }, { productName: 'Capsicum', quantity: 10, totalPrice: 450 }]
      }
    ];
  }

  if (!products || products.length === 0) {
    products = window.DEFAULT_PRODUCTS || [];
  }

  renderKPIs(orders);
  renderRecentOrders(orders);
  renderProductOverview(products);
}

function renderKPIs(orders) {
  const today = new Date().toDateString();

  const todayOrders = orders.filter(o => {
    if (!o.createdAt) return false;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return d.toDateString() === today;
  }).length;

  const pending = orders.filter(o => o.status === 'pending').length;
  const confirmed = orders.filter(o => o.status === 'confirmed').length;
  const rejected = orders.filter(o => o.status === 'rejected').length;

  const totalSales = orders
    .filter(o => o.status !== 'rejected' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);

  const todayEl = document.getElementById('kpi-today-orders');
  const pendingEl = document.getElementById('kpi-pending-orders');
  const confirmedEl = document.getElementById('kpi-confirmed-orders');
  const rejectedEl = document.getElementById('kpi-rejected-orders');
  const salesEl = document.getElementById('kpi-total-sales');

  if (todayEl) todayEl.textContent = todayOrders || orders.length;
  if (pendingEl) pendingEl.textContent = pending;
  if (confirmedEl) confirmedEl.textContent = confirmed;
  if (rejectedEl) rejectedEl.textContent = rejected;
  if (salesEl) salesEl.textContent = Utils.formatCurrency(totalSales);
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('dash-orders-tbody');
  if (!tbody) return;

  const recent = orders.slice(0, 8);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">No orders received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(o => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td class="py-3 px-4 font-extrabold text-slate-900 font-mono">${o.orderNumber || o.id}</td>
      <td class="py-3 px-4">
        <div class="font-bold text-slate-800">${Utils.escapeHtml(o.customerName || '—')}</div>
        <div class="text-[11px] text-slate-400">${Utils.escapeHtml(o.shopName || '')}</div>
      </td>
      <td class="py-3 px-4 text-slate-600 font-mono">${o.phone || '—'}</td>
      <td class="py-3 px-4 text-slate-500 text-[11px]">${Utils.formatDateTime(o.createdAt)}</td>
      <td class="py-3 px-4 font-extrabold text-slate-900">${Utils.formatCurrency(o.grandTotal)}</td>
      <td class="py-3 px-4">${Utils.getStatusBadge(o.status || 'pending')}</td>
      <td class="py-3 px-4 text-right">
        <a href="orders.html?orderId=${o.id}" class="admin-btn admin-btn-secondary text-[11px] py-1 px-2.5">
          Manage &rarr;
        </a>
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
