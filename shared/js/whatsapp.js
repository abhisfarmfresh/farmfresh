/**
 * Abhis Farm Fresh — WhatsApp Message Builder
 * Generates pre-filled WhatsApp messages for orders and inquiries
 */

const WhatsAppService = {
  /**
   * Build a complete order message for WhatsApp
   * @param {Object} order - { orderNumber, customerName, shopName, phone, email, deliveryAddress, items, grandTotal, status }
   * @returns {string} The encoded WhatsApp URL
   */
  buildOrderMessage(order) {
    const itemLines = order.items.map(item => 
      `• ${item.productName} — ${item.quantity} ${item.unit || 'KG'} — ₹${item.totalPrice}`
    ).join('\n');

    const message = `🌱 *New Order — Abhis Farm Fresh*

📋 *Order ID:*
${order.orderNumber}

👤 *Customer:*
${order.customerName}

🏪 *Shop:*
${order.shopName}

📞 *Phone:*
${order.phone}

📧 *Email:*
${order.email}

📍 *Delivery Address:*
${order.deliveryAddress}

━━━━━━━━━━━━━━━━━━
🛒 *Order Items:*

${itemLines}

━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ₹${order.grandTotal}

📌 *Status:* ${order.status || 'Pending Confirmation'}`;

    return this._createWhatsAppUrl(message);
  },

  /**
   * Build a single product inquiry message
   */
  buildInquiryMessage(productName, price, unit) {
    const message = `Hi Abhis Farm Fresh! 🌱

I'm interested in ordering:
*${productName}* — ₹${price}/${unit}

Please share availability and delivery details.`;

    return this._createWhatsAppUrl(message);
  },

  /**
   * Open WhatsApp with pre-filled message
   */
  openOrderWhatsApp(order) {
    const url = this.buildOrderMessage(order);
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
   * Create wa.me URL with encoded message
   * @private
   */
  _createWhatsAppUrl(message) {
    const phone = window.AFF_CONFIG ? window.AFF_CONFIG.contact.whatsapp : '916380710362';
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
};

window.WhatsAppService = WhatsAppService;
