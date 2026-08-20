/**
 * Abhis Farm Fresh - Admin Orders Management Controller
 * Reliable Order Inspection Modal, Confirm & Reject Workflows, Customer WhatsApp Direct Actions
 */

let allAdminOrders = [];
let activeStatusFilter = 'all';
let currentSearchQuery = '';
let currentActiveOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupOrderFiltersAndSearch();
  updateConnectionStatus();
  await loadAdminOrders();
  updateConnectionStatus();
  
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get('orderId');
  if (targetId) {
    setTimeout(() => openOrderModal(targetId), 300);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOrderModal();
      closeConfirmDialog();
      closeRejectDialog();
    }
  });
});

function updateConnectionStatus() {
  const badge = document.getElementById('firebase-connection-badge');
  if (!badge) return;

  const isConfigured = typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY_HERE';
  const isReady = window.FirebaseApp && window.FirebaseApp.isReady();

  if (isReady || (isConfigured && typeof firebase !== 'undefined')) {
    const projectId = (typeof firebaseConfig !== 'undefined') ? firebaseConfig.projectId : 'abhisfarmfresh-3e7d3';
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Firestore Live: ${projectId}</span>`;
  } else {
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>Connecting to Firestore...</span>`;
  }
}

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
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-loading">Loading orders from database...</td></tr>`;
  }

  try {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      allAdminOrders = await window.FirebaseApp.getAllOrders();
    } else {
      allAdminOrders = [];
    }
  } catch (err) {
    console.warn('Error loading orders from Firestore:', err);
    allAdminOrders = [];
  }

  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-tbody');
  const countLabel = document.getElementById('orders-total-count');
  if (!tbody) return;

  let filtered = [...allAdminOrders];

  if (activeStatusFilter !== 'all') {
    filtered = filtered.filter(o => (o.status || 'pending').toLowerCase() === activeStatusFilter);
  }

  if (currentSearchQuery) {
    filtered = filtered.filter(o => 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(currentSearchQuery)) ||
      (o.customerName && o.customerName.toLowerCase().includes(currentSearchQuery)) ||
      (o.shopName && o.shopName.toLowerCase().includes(currentSearchQuery)) ||
      (o.phone && o.phone.includes(currentSearchQuery)) ||
      (o.id && o.id.toLowerCase().includes(currentSearchQuery))
    );
  }

  if (countLabel) countLabel.textContent = `Showing ${filtered.length} of ${allAdminOrders.length} Orders`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-12 text-slate-400">
          <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">receipt_long</span>
          <div class="font-bold text-slate-700 text-sm">No orders found</div>
          <div class="text-xs text-slate-400 mt-0.5">When customers place orders on your website, they will appear here live.</div>
        </td>
      </tr>
    `;
    return;
  }

  // Sort newest first
  const sorted = [...filtered].sort((a, b) => {
    const da = Utils.parseDate(a.createdAt)?.getTime() || 0;
    const db = Utils.parseDate(b.createdAt)?.getTime() || 0;
    return db - da;
  });

  tbody.innerHTML = sorted.map(order => {
    const status = (order.status || 'pending').toLowerCase();
    const isPending = status === 'pending';

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors" id="order-row-${order.id}">
        <!-- Order ID -->
        <td class="py-3.5 px-4 font-mono font-extrabold text-xs text-slate-900">
          ${order.orderNumber || order.id}
        </td>

        <!-- Customer -->
        <td class="py-3.5 px-4">
          <div class="font-bold text-xs text-slate-900">${Utils.escapeHtml(order.customerName || '—')}</div>
          <div class="text-[11px] text-slate-500">${Utils.escapeHtml(order.email || '')}</div>
        </td>

        <!-- Shop -->
        <td class="py-3.5 px-4 font-bold text-xs text-emerald-800">
          ${Utils.escapeHtml(order.shopName || '—')}
        </td>

        <!-- Phone -->
        <td class="py-3.5 px-4 font-mono text-xs text-slate-700">
          ${order.phone || '—'}
        </td>

        <!-- Amount -->
        <td class="py-3.5 px-4 font-extrabold text-xs text-slate-900">
          ${Utils.formatCurrency(order.grandTotal)}
        </td>

        <!-- Order Date -->
        <td class="py-3.5 px-4 text-xs text-slate-500">
          ${Utils.formatDateTime(order.createdAt)}
        </td>

        <!-- Status Badge -->
        <td class="py-3.5 px-4" id="order-status-badge-${order.id}">
          ${Utils.getStatusBadge(order.status || 'pending')}
        </td>

        <!-- Actions -->
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            
            <!-- WhatsApp Action -->
            <button type="button" 
                    onclick="handleOrderWhatsApp('${order.id}')" 
                    class="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" 
                    title="Send WhatsApp to ${order.customerName || 'Customer'} (${order.phone || 'N/A'})">
              <span class="material-symbols-outlined text-lg">chat</span>
            </button>

            <!-- View / Inspect Button -->
            <button type="button" 
                    onclick="openOrderModal('${order.id}')" 
                    class="admin-btn admin-btn-secondary text-xs py-1 px-2.5 rounded-lg flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">visibility</span>
              <span>View</span>
            </button>

            <!-- Quick Confirm if pending -->
            ${isPending ? `
              <button type="button" 
                      onclick="showConfirmDialog('${order.id}')" 
                      class="admin-btn admin-btn-primary text-xs py-1 px-2.5 rounded-lg shadow-sm"
                      title="Confirm Order">
                <span>Confirm</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Open the complete Order Details inspection modal
 */
async function openOrderModal(orderId) {
  let order = allAdminOrders.find(o => o.id === orderId || o.orderNumber === orderId);

  if (!order && window.FirebaseApp && window.FirebaseApp.isReady()) {
    try {
      order = await window.FirebaseApp.getOrder(orderId);
    } catch (e) {
      console.warn('Could not fetch single order:', e);
    }
  }

  if (!order) {
    Utils.showToast('Order details could not be found.', 'error');
    return;
  }

  currentActiveOrderId = order.id || order.orderNumber;

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
  const items = order.items || [];

  if (itemsTbody) {
    if (items.length === 0) {
      itemsTbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">No items listed.</td></tr>`;
    } else {
      itemsTbody.innerHTML = items.map(item => {
        const name = item.productName || item.name;
        const qty = item.quantity || 0;
        const unit = item.unit || 'KG';
        const unitPrice = Number(item.unitPrice || item.price) || 0;
        const lineTotal = Number(item.totalPrice) || (unitPrice * qty);

        return `
          <tr class="border-b border-slate-100 text-xs hover:bg-slate-50/60">
            <td class="py-2.5 px-3 font-bold text-slate-900">${Utils.escapeHtml(name)}</td>
            <td class="py-2.5 px-3 text-center font-semibold">${qty} ${unit}</td>
            <td class="py-2.5 px-3 text-center">${Utils.formatCurrency(unitPrice)}</td>
            <td class="py-2.5 px-3 text-right font-extrabold text-slate-900">${Utils.formatCurrency(lineTotal)}</td>
          </tr>
        `;
      }).join('');
    }
  }

  const subtotal = order.subtotal || order.grandTotal || 0;
  const totalQty = order.totalQuantity || (items.reduce((s, i) => s + (Number(i.quantity) || 0), 0));
  const grandTotal = order.grandTotal || subtotal;

  const totalItemsEl = document.getElementById('modal-total-items');
  const totalQtyEl = document.getElementById('modal-total-qty');
  const subtotalEl = document.getElementById('modal-subtotal');
  const grandTotalEl = document.getElementById('modal-grand-total');

  if (totalItemsEl) totalItemsEl.textContent = `${items.length} Items`;
  if (totalQtyEl) totalQtyEl.textContent = `${totalQty} KG`;
  if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency(subtotal);
  if (grandTotalEl) grandTotalEl.textContent = Utils.formatCurrency(grandTotal);

  const status = (order.status || 'pending').toLowerCase();
  const actionContainer = document.getElementById('modal-actions-container');

  if (actionContainer) {
    if (status === 'pending') {
      actionContainer.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-center gap-3 w-full">
          <button type="button" 
                  onclick="showRejectDialog('${order.id}')" 
                  class="admin-btn admin-btn-danger w-full sm:w-auto text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-base">cancel</span>
            <span>Reject Order</span>
          </button>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button type="button" 
                    onclick="handleOrderWhatsApp('${order.id}')" 
                    class="btn-whatsapp text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm">
              <span class="material-symbols-outlined text-base">chat</span>
              <span>WhatsApp Customer</span>
            </button>

            <button type="button" 
                    onclick="showConfirmDialog('${order.id}')" 
                    class="admin-btn admin-btn-primary text-xs py-2.5 px-5 rounded-xl shadow-md flex items-center gap-1.5">
              <span class="material-symbols-outlined text-base">check_circle</span>
              <span>Confirm Order</span>
            </button>
          </div>
        </div>
      `;
    } else if (status === 'confirmed') {
      actionContainer.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-center gap-3 w-full bg-emerald-50 p-3 rounded-xl border border-emerald-200">
          <div class="flex items-center gap-2 text-emerald-900 font-bold text-xs">
            <span class="material-symbols-outlined text-emerald-700 text-lg">verified</span>
            <span>✓ Order Confirmed for Delivery</span>
            ${order.confirmedAt ? `<span class="text-[10px] text-emerald-700 font-normal">(${Utils.formatDateTime(order.confirmedAt)})</span>` : ''}
          </div>
          <button type="button" 
                  onclick="handleOrderWhatsApp('${order.id}')" 
                  class="btn-whatsapp text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm">
            <span class="material-symbols-outlined text-base">chat</span>
            <span>Message Customer</span>
          </button>
        </div>
      `;
    } else if (status === 'rejected') {
      actionContainer.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-center gap-3 w-full bg-red-50 p-3 rounded-xl border border-red-200">
          <div class="text-xs space-y-0.5">
            <div class="flex items-center gap-1.5 text-red-900 font-bold">
              <span class="material-symbols-outlined text-red-600 text-lg">cancel</span>
              <span>✕ Order Rejected</span>
            </div>
            ${order.rejectionReason ? `<div class="text-[11px] text-red-700">Reason: ${Utils.escapeHtml(order.rejectionReason)}</div>` : ''}
          </div>
          <button type="button" 
                  onclick="handleOrderWhatsApp('${order.id}')" 
                  class="btn-whatsapp text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm">
            <span class="material-symbols-outlined text-base">chat</span>
            <span>Notify Customer</span>
          </button>
        </div>
      `;
    }
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

function handleOrderWhatsApp(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) {
    Utils.showToast('Order record not found.', 'error');
    return;
  }

  WhatsAppService.openCustomerWhatsApp(order);
}

function showConfirmDialog(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return;

  const dialog = document.getElementById('confirm-order-dialog');
  if (!dialog) return;

  document.getElementById('confirm-dialog-ordernum').textContent = order.orderNumber || order.id;
  document.getElementById('confirm-dialog-customer').textContent = `${order.customerName || 'Customer'} (${order.shopName || '—'})`;
  document.getElementById('confirm-dialog-total').textContent = Utils.formatCurrency(order.grandTotal);

  const confirmBtn = document.getElementById('confirm-dialog-submit-btn');
  confirmBtn.onclick = () => executeOrderConfirmation(order.id);

  dialog.classList.remove('hidden');
  dialog.style.display = 'flex';
}

function closeConfirmDialog() {
  const dialog = document.getElementById('confirm-order-dialog');
  if (dialog) {
    dialog.classList.add('hidden');
    dialog.style.display = 'none';
  }
}

async function executeOrderConfirmation(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return;

  const btn = document.getElementById('confirm-dialog-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Confirming...`;
  }

  const notes = document.getElementById('modal-admin-notes')?.value || order.adminNotes || '';

  try {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.updateOrderStatus(order.id, 'confirmed', { 
        adminNotes: notes,
        confirmedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    order.status = 'confirmed';
    order.adminNotes = notes;
    order.confirmedAt = new Date();

    if (window.EmailService && order.email) {
      window.EmailService.sendOrderConfirmation(order);
    }

    Utils.showToast(`Order ${order.orderNumber || order.id} confirmed successfully.`, 'success');
    closeConfirmDialog();
    renderOrdersTable();

    if (currentActiveOrderId === order.id || currentActiveOrderId === order.orderNumber) {
      openOrderModal(order.id);
    }

  } catch (err) {
    console.error('Error confirming order:', err);
    Utils.showToast('Unable to confirm this order. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>Confirm Order</span>`;
    }
  }
}

function showRejectDialog(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return;

  const dialog = document.getElementById('reject-order-dialog');
  if (!dialog) return;

  document.getElementById('reject-dialog-ordernum').textContent = order.orderNumber || order.id;
  document.getElementById('reject-dialog-customer').textContent = `${order.customerName || 'Customer'} (${order.shopName || '—'})`;

  const reasonSelect = document.getElementById('reject-reason-select');
  const customReasonInput = document.getElementById('reject-custom-reason');
  if (reasonSelect) reasonSelect.value = 'Product unavailable';
  if (customReasonInput) customReasonInput.value = '';

  const submitBtn = document.getElementById('reject-dialog-submit-btn');
  submitBtn.onclick = () => executeOrderRejection(order.id);

  dialog.classList.remove('hidden');
  dialog.style.display = 'flex';
}

function closeRejectDialog() {
  const dialog = document.getElementById('reject-order-dialog');
  if (dialog) {
    dialog.classList.add('hidden');
    dialog.style.display = 'none';
  }
}

async function executeOrderRejection(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return;

  const btn = document.getElementById('reject-dialog-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Rejecting...`;
  }

  const reasonSelect = document.getElementById('reject-reason-select');
  const customReasonInput = document.getElementById('reject-custom-reason');
  
  let finalReason = reasonSelect ? reasonSelect.value : 'Product unavailable';
  if (finalReason === 'Other' && customReasonInput && customReasonInput.value.trim()) {
    finalReason = customReasonInput.value.trim();
  }

  const notes = document.getElementById('modal-admin-notes')?.value || order.adminNotes || '';

  try {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.updateOrderStatus(order.id, 'rejected', { 
        adminNotes: notes,
        rejectionReason: finalReason,
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    order.status = 'rejected';
    order.adminNotes = notes;
    order.rejectionReason = finalReason;
    order.rejectedAt = new Date();

    if (window.EmailService && order.email) {
      window.EmailService.sendOrderRejection(order, finalReason);
    }

    Utils.showToast(`Order ${order.orderNumber || order.id} rejected.`, 'info');
    closeRejectDialog();
    renderOrdersTable();

    if (currentActiveOrderId === order.id || currentActiveOrderId === order.orderNumber) {
      openOrderModal(order.id);
    }

  } catch (err) {
    console.error('Error rejecting order:', err);
    Utils.showToast('Unable to reject this order. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>Reject Order</span>`;
    }
  }
}

window.filterOrdersByStatus = filterOrdersByStatus;
window.openOrderModal = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.handleOrderWhatsApp = handleOrderWhatsApp;
window.showConfirmDialog = showConfirmDialog;
window.closeConfirmDialog = closeConfirmDialog;
window.showRejectDialog = showRejectDialog;
window.closeRejectDialog = closeRejectDialog;
