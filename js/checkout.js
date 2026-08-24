/**
 * Abhis Farm Fresh - Checkout Controller
 * Form validation, order review, Firestore persistence, and customer upsert
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutOrderReview();
  setupCheckoutForm();
});

/**
 * Render order items review inside checkout
 */
function renderCheckoutOrderReview() {
  const itemsContainer = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const totalQtyEl = document.getElementById('checkout-total-qty');
  const grandTotalEl = document.getElementById('checkout-grand-total');

  const items = Cart.getItems();

  if (!itemsContainer) return;

  if (items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="text-center py-8">
        <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">remove_shopping_cart</span>
        <h4 class="font-bold text-slate-800 text-sm">Your cart is empty</h4>
        <p class="text-xs text-slate-500 mt-1 mb-4">Please add fresh vegetables to your cart before proceeding to checkout.</p>
        <a href="products.html" class="btn btn-primary btn-sm">Browse Vegetables</a>
      </div>
    `;
    const submitBtn = document.getElementById('place-order-btn');
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  itemsContainer.innerHTML = items.map(item => {
    const itemTotal = Number(item.price) * Number(item.quantity);
    return `
      <div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
        <div class="flex items-center gap-3">
          <img src="${item.imageUrl}" 
               alt="${Utils.escapeHtml(item.name)}" 
               onerror="this.src='images/farm_fresh_media_01.jpeg'"
               class="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200">
          <div>
            <div class="font-bold text-xs text-slate-900">${Utils.escapeHtml(item.name)}</div>
            <div class="text-[11px] text-slate-500">${Utils.formatCurrency(item.price)} / ${item.unit || 'KG'} × ${item.quantity} ${item.unit || 'KG'}</div>
          </div>
        </div>
        <div class="font-extrabold text-xs text-slate-900 text-right">
          ${Utils.formatCurrency(itemTotal)}
        </div>
      </div>
    `;
  }).join('');

  const subtotal = Cart.getSubtotal();
  const totalQty = Cart.getTotalQuantity();

  if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency(subtotal);
  if (totalQtyEl) totalQtyEl.textContent = `${totalQty} KG`;
  if (grandTotalEl) grandTotalEl.textContent = Utils.formatCurrency(subtotal);
}

/**
 * Setup checkout form submission and event handlers
 */
function setupCheckoutForm() {
  const form = document.getElementById('checkout-form');
  const sameAddressCheckbox = document.getElementById('same-address-check');
  const businessAddressInput = document.getElementById('business-address');
  const deliveryAddressInput = document.getElementById('delivery-address');

  if (sameAddressCheckbox && businessAddressInput && deliveryAddressInput) {
    sameAddressCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        deliveryAddressInput.value = businessAddressInput.value;
        deliveryAddressInput.readOnly = true;
        deliveryAddressInput.classList.add('bg-slate-50');
        Validator.clearFieldError('delivery-address');
      } else {
        deliveryAddressInput.readOnly = false;
        deliveryAddressInput.classList.remove('bg-slate-50');
      }
    });

    businessAddressInput.addEventListener('input', () => {
      if (sameAddressCheckbox.checked) {
        deliveryAddressInput.value = businessAddressInput.value;
      }
    });
  }

  if (form) {
    form.addEventListener('submit', handleOrderSubmit);
  }
}

/**
 * Handle order submission
 */
async function handleOrderSubmit(e) {
  e.preventDefault();

  const items = Cart.getItems();
  if (items.length === 0) {
    Utils.showToast('Please add items to your cart first.', 'warning');
    return;
  }

  const fields = {
    customerName: document.getElementById('customer-name')?.value || '',
    shopName: document.getElementById('shop-name')?.value || '',
    phone: document.getElementById('customer-phone')?.value || '',
    email: document.getElementById('customer-email')?.value || '',
    businessAddress: document.getElementById('business-address')?.value || '',
    deliveryAddress: document.getElementById('delivery-address')?.value || ''
  };

  // 1. Validate Form Fields
  Validator.clearAllErrors();
  const { valid, errors } = Validator.validateCheckout(fields);

  if (!valid) {
    for (const [fieldKey, errorMsg] of Object.entries(errors)) {
      const elId = fieldKey === 'customerName' ? 'customer-name' :
                   fieldKey === 'shopName' ? 'shop-name' :
                   fieldKey === 'phone' ? 'customer-phone' :
                   fieldKey === 'email' ? 'customer-email' :
                   fieldKey === 'businessAddress' ? 'business-address' :
                   'delivery-address';
      Validator.showFieldError(elId, errorMsg);
    }
    Utils.showToast('Please fix the errors in the form.', 'error');
    return;
  }

  const submitBtn = document.getElementById('place-order-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      <span>Securing & Placing Order...</span>
    `;
  }

  try {
    // 2. Build Order Payload
    const orderNumber = window.AFF_CONFIG ? window.AFF_CONFIG.generateOrderNumber() : `AFF-${Date.now().toString().slice(-8)}`;
    const subtotal = Cart.getSubtotal();
    const totalQty = Cart.getTotalQuantity();

    const orderItems = items.map(item => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const name = item.name || 'Fresh Produce';
      return {
        productId: item.id || '',
        id: item.id || '',
        productName: name,
        name: name,
        quantity: qty,
        qty: qty,
        unit: item.unit || 'KG',
        unitPrice: price,
        price: price,
        totalPrice: price * qty,
        total: price * qty,
        imageUrl: item.imageUrl || 'images/farm_fresh_media_01.jpeg'
      };
    });

    const orderData = {
      orderNumber,
      customerName: fields.customerName.trim(),
      name: fields.customerName.trim(),
      shopName: fields.shopName.trim(),
      phone: fields.phone.trim(),
      email: fields.email.trim(),
      businessAddress: fields.businessAddress.trim(),
      deliveryAddress: fields.deliveryAddress.trim(),
      address: fields.deliveryAddress.trim(),
      items: orderItems,
      subtotal: subtotal,
      totalQuantity: totalQty,
      grandTotal: subtotal,
      total: subtotal,
      totalAmount: subtotal,
      paymentMethod: 'UPI / Online',
      status: 'pending',
      adminNotes: '',
      rejectionReason: '',
      confirmedAt: null,
      rejectedAt: null
    };

    // 3. Save to Dual-Layer Persistence (Cloud Firestore + OrderStorage)
    let orderDocId = null;
    if (window.FirebaseApp) {
      orderDocId = await window.FirebaseApp.createOrder(orderData);
      
      // 4. Upsert Customer Record (Non-blocking)
      try {
        await window.FirebaseApp.upsertCustomer({
          name: fields.customerName.trim(),
          shopName: fields.shopName.trim(),
          phone: fields.phone.trim(),
          email: fields.email.trim(),
          address: fields.deliveryAddress.trim(),
          orderTotal: subtotal
        });
      } catch (custErr) {
        console.warn('Customer upsert note:', custErr);
      }
    } else if (window.OrderStorage) {
      orderDocId = `local_${Date.now()}`;
      window.OrderStorage.upsert({
        id: orderDocId,
        ...orderData
      });
    }

    // Cache order in sessionStorage for immediate instant rendering on order-success page
    sessionStorage.setItem('aff_last_order', JSON.stringify({
      id: orderDocId || `order_${Date.now()}`,
      ...orderData
    }));

    // 5. Clear Cart
    Cart.clear();

    // 6. Redirect to Success Page
    const redirectUrl = `order-success.html?orderId=${encodeURIComponent(orderDocId || 'success')}&orderNumber=${encodeURIComponent(orderNumber)}`;
    window.location.href = redirectUrl;

  } catch (err) {
    console.error('Error placing order:', err);
    Utils.showToast("We couldn't place your order right now. Please try again or contact us on WhatsApp.", 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Confirm & Place Order</span><span class="material-symbols-outlined text-base">arrow_forward</span>`;
    }
  }
}
