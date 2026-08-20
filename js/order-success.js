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

  // 1. Try to load from sessionStorage (fastest & reliable for immediate redirect)
  try {
    const cached = sessionStorage.getItem('aff_last_order');
    if (cached) {
      order = JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Could not read cached order:', e);
  }

  // 2. If not found in cache and we have orderId from Firestore, fetch from DB
  if (!order && orderId && orderId !== 'success' && window.FirebaseApp && window.FirebaseApp.isReady()) {
    try {
      order = await window.FirebaseApp.getOrder(orderId);
    } catch (e) {
      console.warn('Could not fetch order from DB:', e);
    }
  }

  // 3. Fallback dummy if directly accessed
  if (!order) {
    order = {
      orderNumber: orderNumberParam || 'AFF-20260820-001',
      customerName: 'Valued Customer',
      shopName: 'B2B Client',
      phone: '6380710362',
      email: 'orders@abhisfarmfresh.com',
      deliveryAddress: 'Doorstep Delivery Location',
      items: [
        { productName: 'Fresh Tomato', quantity: 2, unit: 'KG', unitPrice: 35, totalPrice: 70 },
        { productName: 'Red Onion', quantity: 3, unit: 'KG', unitPrice: 32, totalPrice: 96 }
      ],
      subtotal: 166,
      grandTotal: 166,
      status: 'pending'
    };
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
