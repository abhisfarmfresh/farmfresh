/**
 * Abhis Farm Fresh — WhatsApp Message Builder
 * Generates pre-filled WhatsApp messages for customer orders and admin-to-customer communication
 */

const WhatsAppService = {
  /**
   * Build customer-to-admin order message (used during checkout / order-success)
   */
  buildOrderMessage(order) {
    const itemLines = (order.items || []).map(item => 
      `• ${item.productName || item.name} — ${item.quantity} ${item.unit || 'KG'} — ₹${item.totalPrice || (item.price * item.quantity)}`
    ).join('\n');

    const message = `🌱 *New Order — Abhis Farm Fresh*

📋 *Order ID:*
${order.orderNumber || order.id}

👤 *Customer:*
${order.customerName || 'Valued Customer'}

🏪 *Shop:*
${order.shopName || '—'}

📞 *Phone:*
${order.phone || '—'}

📧 *Email:*
${order.email || '—'}

📍 *Delivery Address:*
${order.deliveryAddress || '—'}

━━━━━━━━━━━━━━━━━━
🛒 *Order Items:*

${itemLines}

━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ₹${order.grandTotal}

📌 *Status:* ${order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Pending Confirmation'}`;

    return this._createWhatsAppUrl(message, window.AFF_CONFIG?.contact?.whatsapp || '916380710362');
  },

  /**
   * Build Admin-to-Customer notification message (used in Admin CRM)
   * Formatted exactly as specified in requirements
   */
  buildAdminToCustomerMessage(order) {
    const itemLines = (order.items || []).map(item => {
      const name = item.productName || item.name;
      const qty = item.quantity;
      const unit = item.unit || 'KG';
      return `- ${name} — ${qty} ${unit}`;
    }).join('\n');

    const statusTitle = order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Reviewed';

    const message = `Hello ${order.customerName || 'Customer'},

This is Abhis Farm Fresh.

Order ID: ${order.orderNumber || order.id}

Shop:
${order.shopName || '—'}

Your order has been reviewed.

Products:
${itemLines}

Total:
₹${order.grandTotal}

Order Status:
${statusTitle}

Thank you,
Abhis Farm Fresh`;

    return message;
  },

  /**
   * Build a single product inquiry message
   */
  buildInquiryMessage(productName, price, unit) {
    const message = `Hi Abhis Farm Fresh! 🌱

I'm interested in ordering:
*${productName}* — ₹${price}/${unit}

Please share availability and delivery details.`;

    return this._createWhatsAppUrl(message, window.AFF_CONFIG?.contact?.whatsapp || '916380710362');
  },

  /**
   * Open WhatsApp to send customer order details to Admin desk
   */
  openOrderWhatsApp(order) {
    const url = this.buildOrderMessage(order);
    window.open(url, '_blank');
  },

  /**
   * Open WhatsApp to message a specific Customer about their order
   * Uses the customer's phone number saved with that order
   */
  openCustomerWhatsApp(order) {
    if (!order) return;
    const phone = Utils.normalizePhone(order.phone);
    if (!phone) {
      if (window.Utils) {
        Utils.showToast('Customer phone number is unavailable or invalid.', 'error');
      } else {
        alert('Customer phone number is unavailable or invalid.');
      }
      return;
    }

    const message = this.buildAdminToCustomerMessage(order);
    const url = this._createWhatsAppUrl(message, phone);
    window.open(url, '_blank');
  },

  /**
   * Open WhatsApp with product inquiry
   */
  openInquiryWhatsApp(productName, price, unit) {
    const url = this.buildInquiryMessage(productName, price, unit);
    window.open(url, '_blank');
  },

  /**
   * Create wa.me URL with encoded message and target phone
   * @private
   */
  _createWhatsAppUrl(message, targetPhone) {
    const phone = targetPhone ? targetPhone.replace(/\D/g, '') : '916380710362';
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
};

window.WhatsAppService = WhatsAppService;
