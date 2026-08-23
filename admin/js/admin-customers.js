/**
 * Abhis Farm Fresh - Admin Customer Accounts Controller
 * Customer directory listing, order history inspection, and metrics
 */

let allAdminCustomers = [];
let currentCustomerSearch = '';

document.addEventListener('DOMContentLoaded', async () => {
  setupCustomerSearch();
  if (window.FirebaseApp) {
    window.FirebaseApp.updateConnectionBadge();
  }
  await loadAdminCustomers();
});

function setupCustomerSearch() {
  const searchInput = document.getElementById('customer-admin-search');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      currentCustomerSearch = e.target.value.toLowerCase().trim();
      renderCustomersTable();
    }, 200));
  }
}

async function loadAdminCustomers() {
  const tbody = document.getElementById('admin-customers-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="admin-loading">Fetching customer directory...</td></tr>`;

  try {
    if (window.FirebaseApp) {
      allAdminCustomers = await window.FirebaseApp.getAllCustomers();
    }
  } catch (err) {
    console.warn('Error fetching customers from Firestore:', err);
  }

  // If no dedicated customer docs exist yet in Firestore, derive directory dynamically from real placed orders
  if (!allAdminCustomers || allAdminCustomers.length === 0) {
    const orders = window.OrderStorage ? window.OrderStorage.getAll() : [];
    const customerMap = new Map();
    orders.forEach(o => {
      const cleanPhone = (o.phone || '').replace(/\D/g, '');
      if (cleanPhone) {
        if (customerMap.has(cleanPhone)) {
          const existing = customerMap.get(cleanPhone);
          existing.totalOrders += 1;
          existing.totalAmount += (Number(o.grandTotal ?? o.total ?? o.subtotal ?? 0) || 0);
        } else {
          customerMap.set(cleanPhone, {
            id: cleanPhone,
            name: o.customerName || o.name || 'Customer',
            shopName: o.shopName || '',
            phone: o.phone || cleanPhone,
            email: o.email || '',
            address: o.deliveryAddress || o.businessAddress || o.address || '',
            totalOrders: 1,
            totalAmount: (Number(o.grandTotal ?? o.total ?? o.subtotal ?? 0) || 0),
            lastOrderDate: o.createdAt || new Date()
          });
        }
      }
    });
    allAdminCustomers = Array.from(customerMap.values());
  }

  renderCustomersTable();
}

function renderCustomersTable() {
  const tbody = document.getElementById('admin-customers-tbody');
  const countLabel = document.getElementById('customers-count-label');
  if (!tbody) return;

  let filtered = [...allAdminCustomers];

  if (currentCustomerSearch) {
    filtered = filtered.filter(c => 
      (c.name && c.name.toLowerCase().includes(currentCustomerSearch)) ||
      (c.shopName && c.shopName.toLowerCase().includes(currentCustomerSearch)) ||
      (c.phone && c.phone.includes(currentCustomerSearch)) ||
      (c.email && c.email.toLowerCase().includes(currentCustomerSearch))
    );
  }

  if (countLabel) countLabel.textContent = `${filtered.length} of ${allAdminCustomers.length} Accounts`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-slate-400">
          <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">group_off</span>
          <div class="font-bold text-slate-700 text-sm">No customer accounts found</div>
          <div class="text-xs text-slate-400 mt-0.5">Customers are automatically created when orders are placed.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
      <td class="py-3.5 px-4">
        <div class="font-bold text-xs text-slate-900">${Utils.escapeHtml(c.name || '—')}</div>
        <div class="text-[11px] text-slate-500">${Utils.escapeHtml(c.email || '')}</div>
      </td>
      <td class="py-3.5 px-4 font-bold text-xs text-emerald-800">
        ${Utils.escapeHtml(c.shopName || '—')}
      </td>
      <td class="py-3.5 px-4 font-mono text-xs text-slate-700">${c.phone || '—'}</td>
      <td class="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate" title="${Utils.escapeHtml(c.address || '')}">
        ${Utils.escapeHtml(c.address || '—')}
      </td>
      <td class="py-3.5 px-4 text-center font-bold text-xs text-slate-800">
        ${c.totalOrders || 1}
      </td>
      <td class="py-3.5 px-4 text-right font-extrabold text-xs text-slate-900">
        ${Utils.formatCurrency(c.totalAmount || 0)}
      </td>
      <td class="py-3.5 px-4 text-xs text-slate-500">
        ${Utils.formatDate(c.lastOrderDate)}
      </td>
    </tr>
  `).join('');
}
