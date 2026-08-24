/**
 * Abhis Farm Fresh - Order Success Page Controller
 * Displays order details, status, and generates pre-filled WhatsApp message
 */

document.addEventListener('DOMContentLoaded', async () => {
  await renderOrderSuccessPage();
});

async function renderOrderSuccessPage() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const orderNumberParam = params.get('orderNumber');

  let order = null;

  // 1. Load from sessionStorage (passed right after checkout, 0 Firestore read queries required)
  try {
    const cached = sessionStorage.getItem('aff_last_order');
    if (cached) {
      order = JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Could not read cached order:', e);
  }

  // 2. If not in session, fetch from Firestore / OrderStorage using URL parameters
  if (!order && (orderId || orderNumberParam)) {
    if (window.FirebaseApp) {
      try {
        order = await window.FirebaseApp.getOrder(orderId || orderNumberParam);
      } catch (err) {
        console.warn('Could not fetch order from database:', err);
      }
    }
  }

  // 3. If still no order found, show empty/direct-access state without mock fallback
  if (!order) {
    const container = document.querySelector('.max-w-2xl');
    if (container) {
      container.innerHTML = `
        <div class="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 text-center">
          <div class="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
            <span class="material-symbols-outlined">receipt_long</span>
          </div>
          <h1 class="text-2xl font-black text-slate-900 mb-2">Order Completed</h1>
          <p class="text-sm text-slate-500 mb-6">
            ${orderNumberParam ? `Your order <strong>${Utils.escapeHtml(orderNumberParam)}</strong> has been registered.` : 'Thank you for placing an order with Abhis Farm Fresh.'}
            Our dispatch team will contact you directly via WhatsApp / Phone to confirm dispatch.
          </p>
          <a href="products.html" class="inline-flex items-center gap-2 bg-emerald-800 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors">
            <span class="material-symbols-outlined text-lg">storefront</span> Return to Catalog
          </a>
        </div>
      `;
    }
    return;
  }

  // Render Order Number and Status
  const orderNumEl = document.getElementById('success-order-number');
  const statusBadgeEl = document.getElementById('success-order-status');
  const customerNameEl = document.getElementById('success-customer-name');
  const shopNameEl = document.getElementById('success-shop-name');
  const phoneEl = document.getElementById('success-phone');
  const addressEl = document.getElementById('success-address');
  const itemsContainer = document.getElementById('success-items-list');
  const totalAmountEl = document.getElementById('success-total-amount');

  if (orderNumEl) orderNumEl.textContent = order.orderNumber;
  if (statusBadgeEl) statusBadgeEl.innerHTML = Utils.getStatusBadge(order.status || 'pending');
  if (customerNameEl) customerNameEl.textContent = order.customerName;
  if (shopNameEl) shopNameEl.textContent = order.shopName;
  if (phoneEl) phoneEl.textContent = order.phone;
  if (addressEl) addressEl.textContent = order.deliveryAddress;
  if (totalAmountEl) totalAmountEl.textContent = Utils.formatCurrency(order.grandTotal);

  if (itemsContainer && order.items) {
    itemsContainer.innerHTML = order.items.map(item => `
      <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
        <div>
          <span class="font-bold text-slate-900">${Utils.escapeHtml(item.productName)}</span>
          <span class="text-slate-500 text-[11px] ml-1">(${item.quantity} ${item.unit || 'KG'})</span>
        </div>
        <span class="font-extrabold text-slate-900">${Utils.formatCurrency(item.totalPrice)}</span>
      </div>
    `).join('');
  }

  // Wire up WhatsApp Button
  const waBtn = document.getElementById('whatsapp-order-btn');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      WhatsAppService.openOrderWhatsApp(order);
    });
  }
}
