/**
 * Abhis Farm Fresh - Admin Orders Management Controller
 * Handles order listing, status filtering, order details modal, confirmation & rejection workflows
 */

let allAdminOrders = [];
let activeStatusFilter = 'all';
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  setupOrderFiltersAndSearch();
  await loadAdminOrders();
  
  // Check if a specific orderId was passed in URL query
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get('orderId');
  if (targetId) {
    setTimeout(() => openOrderModal(targetId), 400);
  }
});

function setupOrderFiltersAndSearch() {
  const searchInput = document.getElementById('order-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      renderOrdersTable();
    }, 200));
  }
}

function filterOrdersByStatus(status) {
  activeStatusFilter = status;

  document.querySelectorAll('.order-status-pill').forEach(btn => {
    btn.className = "order-status-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all bg-white text-slate-700 hover:bg-slate-100 border border-slate-200";
  });

  const activeBtn = document.getElementById(`status-pill-${status}`);
  if (activeBtn) {
    activeBtn.className = "order-status-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all bg-emerald-800 text-white shadow-sm";
  }

  renderOrdersTable();
}

async function loadAdminOrders() {
  const tbody = document.getElementById('orders-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="admin-loading">Loading orders from database...</td></tr>`;

  try {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      allAdminOrders = await window.FirebaseApp.getAllOrders();
    }
  } catch (err) {
    console.warn('Error loading orders from Firestore:', err);
  }

  // Fallback demo orders if database empty
  if (!allAdminOrders || allAdminOrders.length === 0) {
    allAdminOrders = [
      {
        id: 'ord_demo_1',
        orderNumber: 'AFF-20260820-001',
        customerName: 'John Varma',
        shopName: 'Sri Lakshmi Hotel',
        phone: '6380710362',
        email: 'customer@gmail.com',
        businessAddress: '14/B Main Road, Thanjavur - 613001',
        deliveryAddress: 'Sri Lakshmi Hotel Kitchen Gate 2, Thanjavur',
        grandTotal: 221,
        totalQuantity: 6,
        status: 'pending',
        createdAt: new Date(),
        items: [
          { productName: 'Fresh Tomato', quantity: 2, unit: 'KG', unitPrice: 35, totalPrice: 70 },
          { productName: 'Red Onion', quantity: 3, unit: 'KG', unitPrice: 32, totalPrice: 96 },
          { productName: 'Fresh Carrot', quantity: 1, unit: 'KG', unitPrice: 55, totalPrice: 55 }
        ]
      },
      {
        id: 'ord_demo_2',
        orderNumber: 'AFF-20260820-002',
        customerName: 'Chef Arvind',
        shopName: 'Green Leaf Fine Dining',
        phone: '6380710362',
        email: 'arvind@greenleaf.com',
        businessAddress: 'Plot 4, Madhapur, Hyderabad',
        deliveryAddress: 'Green Leaf Kitchen Dock, Madhapur',
        grandTotal: 1850,
        totalQuantity: 25,
        status: 'confirmed',
        confirmedAt: new Date(Date.now() - 3600000),
        createdAt: new Date(Date.now() - 7200000),
        items: [
          { productName: 'Butterhead Lettuce', quantity: 10, unit: 'KG', unitPrice: 120, totalPrice: 1200 },
          { productName: 'Green Capsicum', quantity: 10, unit: 'KG', unitPrice: 45, totalPrice: 450 },
          { productName: 'Genovese Basil', quantity: 5, unit: 'KG', unitPrice: 240, totalPrice: 1200 }
        ]
      }
    ];
  }

  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-tbody');
  const countLabel = document.getElementById('orders-total-count');
  if (!tbody) return;

  let filtered = [...allAdminOrders];

  if (activeStatusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === activeStatusFilter);
  }

  if (currentSearchQuery) {
    filtered = filtered.filter(o => 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(currentSearchQuery)) ||
      (o.customerName && o.customerName.toLowerCase().includes(currentSearchQuery)) ||
      (o.shopName && o.shopName.toLowerCase().includes(currentSearchQuery)) ||
      (o.phone && o.phone.includes(currentSearchQuery))
    );
  }

  if (countLabel) countLabel.textContent = `Showing ${filtered.length} of ${allAdminOrders.length} Orders`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-12 text-slate-400">
          <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">search_off</span>
          <div class="font-bold text-slate-700 text-sm">No orders found</div>
          <div class="text-xs text-slate-400 mt-0.5">No orders match the current filter or search query.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(order => `
    <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
      <td class="py-3.5 px-4 font-mono font-extrabold text-xs text-slate-900">${order.orderNumber || order.id}</td>
      <td class="py-3.5 px-4">
        <div class="font-bold text-xs text-slate-900">${Utils.escapeHtml(order.customerName || '—')}</div>
        <div class="text-[11px] text-emerald-800 font-semibold">${Utils.escapeHtml(order.shopName || '')}</div>
      </td>
      <td class="py-3.5 px-4 font-mono text-xs text-slate-700">${order.phone || '—'}</td>
      <td class="py-3.5 px-4 text-xs font-bold text-slate-700">${order.totalQuantity || 0} KG</td>
      <td class="py-3.5 px-4 font-extrabold text-xs text-slate-900">${Utils.formatCurrency(order.grandTotal)}</td>
      <td class="py-3.5 px-4 text-xs text-slate-500">${Utils.formatDateTime(order.createdAt)}</td>
      <td class="py-3.5 px-4">${Utils.getStatusBadge(order.status || 'pending')}</td>
      <td class="py-3.5 px-4 text-right">
        <button onclick="openOrderModal('${order.id}')" class="admin-btn admin-btn-primary text-xs py-1.5 px-3">
          <span>View</span>
          <span class="material-symbols-outlined text-sm">visibility</span>
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Open the complete Order Details inspection & action modal
 */
function openOrderModal(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId);
  if (!order) return;

  const modal = document.getElementById('order-details-modal');
  if (!modal) return;

  document.getElementById('modal-order-number').textContent = order.orderNumber || order.id;
  document.getElementById('modal-order-status').innerHTML = Utils.getStatusBadge(order.status || 'pending');
  document.getElementById('modal-order-date').textContent = Utils.formatDateTime(order.createdAt);
  
  document.getElementById('modal-customer-name').textContent = order.customerName || '—';
  document.getElementById('modal-shop-name').textContent = order.shopName || '—';
  document.getElementById('modal-phone').textContent = order.phone || '—';
  document.getElementById('modal-email').textContent = order.email || '—';
  document.getElementById('modal-business-address').textContent = order.businessAddress || '—';
  document.getElementById('modal-delivery-address').textContent = order.deliveryAddress || '—';
  document.getElementById('modal-admin-notes').value = order.adminNotes || '';

  const itemsTbody = document.getElementById('modal-items-tbody');
  if (itemsTbody && order.items) {
    itemsTbody.innerHTML = order.items.map(item => `
      <tr class="border-b border-slate-100 text-xs">
        <td class="py-2.5 px-3 font-bold text-slate-900">${Utils.escapeHtml(item.productName)}</td>
        <td class="py-2.5 px-3 text-center font-semibold">${item.quantity} ${item.unit || 'KG'}</td>
        <td class="py-2.5 px-3 text-center">${Utils.formatCurrency(item.unitPrice)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold text-slate-900">${Utils.formatCurrency(item.totalPrice)}</td>
      </tr>
    `).join('');
  }

  document.getElementById('modal-grand-total').textContent = Utils.formatCurrency(order.grandTotal);

  // Configure action buttons
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const rejectBtn = document.getElementById('modal-reject-btn');

  if (confirmBtn) {
    confirmBtn.onclick = () => handleConfirmOrder(order.id);
    confirmBtn.style.display = order.status === 'confirmed' ? 'none' : 'inline-flex';
  }

  if (rejectBtn) {
    rejectBtn.onclick = () => handleRejectOrder(order.id);
    rejectBtn.style.display = order.status === 'rejected' ? 'none' : 'inline-flex';
  }

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeOrderModal() {
  const modal = document.getElementById('order-details-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

/**
 * Confirm Order Action
 */
async function handleConfirmOrder(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId);
  if (!order) return;

  const notes = document.getElementById('modal-admin-notes')?.value || '';

  if (window.FirebaseApp && window.FirebaseApp.isReady()) {
    await window.FirebaseApp.updateOrderStatus(orderId, 'confirmed', { adminNotes: notes });
  }

  order.status = 'confirmed';
  order.adminNotes = notes;
  order.confirmedAt = new Date();

  // Send Confirmation Email if EmailJS configured
  if (window.EmailService && order.email) {
    window.EmailService.sendOrderConfirmation(order);
  }

  Utils.showToast(`Order ${order.orderNumber} confirmed! Notification sent to ${order.email || 'customer'}.`, 'success');
  closeOrderModal();
  renderOrdersTable();
}

/**
 * Reject Order Action with Reason
 */
async function handleRejectOrder(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId);
  if (!order) return;

  const reason = prompt('Please enter the rejection reason (e.g. "Produce unavailable for tomorrow" or "Delivery location out of zone"):', 'Produce temporarily out of stock for tomorrow morning.');
  if (reason === null) return; // cancelled prompt

  const notes = document.getElementById('modal-admin-notes')?.value || '';

  if (window.FirebaseApp && window.FirebaseApp.isReady()) {
    await window.FirebaseApp.updateOrderStatus(orderId, 'rejected', { 
      adminNotes: notes,
      rejectionReason: reason 
    });
  }

  order.status = 'rejected';
  order.adminNotes = notes;
  order.rejectionReason = reason;
  order.rejectedAt = new Date();

  // Send Rejection Email if EmailJS configured
  if (window.EmailService && order.email) {
    window.EmailService.sendOrderRejection(order, reason);
  }

  Utils.showToast(`Order ${order.orderNumber} marked as rejected.`, 'info');
  closeOrderModal();
  renderOrdersTable();
}

window.filterOrdersByStatus = filterOrdersByStatus;
window.openOrderModal = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.handleConfirmOrder = handleConfirmOrder;
window.handleRejectOrder = handleRejectOrder;
