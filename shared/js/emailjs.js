/**
 * Abhis Farm Fresh - Transactional Email Service
 * Uses EmailJS SDK for order confirmation & rejection emails sent to the customer's submitted email
 */

const EmailService = {
  _initialized: false,

  init() {
    if (this._initialized) return;

    if (typeof emailjs !== 'undefined' && typeof EMAILJS_CONFIG !== 'undefined' && EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
      try {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        this._initialized = true;
        console.log('📧 EmailJS initialized');
      } catch (err) {
        console.warn('EmailJS initialization warning:', err);
      }
    }
  },

  /**
   * Send Order Confirmation Email to Customer
   * @param {Object} order - Full order object
   */
  async sendOrderConfirmation(order) {
    if (!order || !order.email) {
      console.warn('Cannot send confirmation email: No customer email provided.');
      return false;
    }

    const itemsSummary = (order.items || []).map(i => 
      `${i.productName} (${i.quantity} ${i.unit || 'KG'}) - ₹${i.totalPrice}`
    ).join('\n');

    const templateParams = {
      to_email: order.email,
      customer_name: order.customerName || 'Valued Customer',
      shop_name: order.shopName || '',
      order_number: order.orderNumber || order.id,
      order_items: itemsSummary,
      grand_total: `₹${order.grandTotal}`,
      delivery_address: order.deliveryAddress || '',
      contact_phone: '6380710362',
      status: 'Confirmed for Delivery'
    };

    console.log('📧 Sending Order Confirmation to:', order.email, templateParams);

    if (typeof emailjs !== 'undefined' && typeof EMAILJS_CONFIG !== 'undefined' && EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
      try {
        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.templates.orderConfirmation,
          templateParams
        );
        console.log('✅ Confirmation email sent successfully to:', order.email);
        return true;
      } catch (err) {
        console.error('Failed to send confirmation email via EmailJS:', err);
        return false;
      }
    } else {
      console.log('ℹ️ EmailJS running in simulated mode. (Configure EmailJS keys to send live emails).');
      return true;
    }
  },

  /**
   * Send Order Rejection Email to Customer
   * @param {Object} order - Full order object
   * @param {string} reason - Rejection reason
   */
  async sendOrderRejection(order, reason) {
    if (!order || !order.email) {
      console.warn('Cannot send rejection email: No customer email provided.');
      return false;
    }

    const templateParams = {
      to_email: order.email,
      customer_name: order.customerName || 'Valued Customer',
      shop_name: order.shopName || '',
      order_number: order.orderNumber || order.id,
      rejection_reason: reason || 'Selected produce is temporarily out of harvest stock.',
      contact_phone: '6380710362',
      status: 'Order Declined'
    };

    console.log('📧 Sending Order Rejection to:', order.email, templateParams);

    if (typeof emailjs !== 'undefined' && typeof EMAILJS_CONFIG !== 'undefined' && EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
      try {
        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.templates.orderRejection,
          templateParams
        );
        console.log('✅ Rejection email sent successfully to:', order.email);
        return true;
      } catch (err) {
        console.error('Failed to send rejection email via EmailJS:', err);
        return false;
      }
    } else {
      console.log('ℹ️ EmailJS running in simulated mode.');
      return true;
    }
  }
};

window.EmailService = EmailService;

document.addEventListener('DOMContentLoaded', () => {
  EmailService.init();
});
