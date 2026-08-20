/**
 * Abhis Farm Fresh - EmailJS Configuration Template
 * Copy this file to shared/config/emailjs.config.js and add your real keys.
 * (shared/config/*.config.js is ignored by git)
 */

const EMAILJS_CONFIG = {
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId: "service_abhisfarmfresh",
  templates: {
    orderConfirmation: "template_order_confirmed",
    orderRejection: "template_order_rejected"
  }
};
