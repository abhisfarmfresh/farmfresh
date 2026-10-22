/**
 * Abhis Farm Fresh — Traffic Control, Rate Limiter & Bot Protection Engine
 * Protects high-traffic vegetable ordering workflows against bot spam, DDoS spikes,
 * duplicate order double-clicks, and Firestore read/write quota exhaustion.
 */

const TrafficControl = {
  // In-flight execution locks to prevent double-submitting
  _activeLocks: new Set(),

  // Storage keys for rate limiting
  _ORDER_TIMESTAMPS_KEY: 'aff_traffic_order_timestamps',
  _INQUIRY_TIMESTAMPS_KEY: 'aff_traffic_inquiry_timestamps',

  // Configurable thresholds for high-volume vegetable shop
  CONFIG: {
    orderMinCooldownMs: 6000,       // 6 seconds between consecutive order placements
    orderMaxPerWindow: 5,           // Maximum 5 orders allowed per 10 minutes per device
    orderWindowMs: 10 * 60 * 1000,  // 10 minutes window

    inquiryMinCooldownMs: 15000,    // 15 seconds between inquiries
    inquiryMaxPerWindow: 4,         // Maximum 4 inquiries per 10 minutes
    inquiryWindowMs: 10 * 60 * 1000 // 10 minutes window
  },

  /**
   * Acquire a lock for a key. Returns true if lock acquired, false if already busy.
   */
  acquireLock(key) {
    if (this._activeLocks.has(key)) return false;
    this._activeLocks.add(key);
    return true;
  },

  /**
   * Release an acquired lock
   */
  releaseLock(key) {
    this._activeLocks.delete(key);
  },

  /**
   * Execute an async function with an automatic lock
   */
  async withLock(key, asyncFn) {
    if (!this.acquireLock(key)) {
      console.warn(`[TrafficControl] Action "${key}" blocked: operation already in flight.`);
      return { success: false, inFlight: true };
    }
    try {
      const result = await asyncFn();
      return { success: true, result };
    } finally {
      this.releaseLock(key);
    }
  },

  /**
   * Retrieve and prune timestamp records for a given storage key
   */
  _getCleanTimestamps(storageKey, windowMs) {
    try {
      const raw = localStorage.getItem(storageKey);
      const list = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const cutoff = now - windowMs;
      const valid = list.filter(ts => typeof ts === 'number' && ts > cutoff);
      localStorage.setItem(storageKey, JSON.stringify(valid));
      return valid;
    } catch (e) {
      return [];
    }
  },

  /**
   * Check if an order placement is permitted under current traffic rules
   */
  canSubmitOrder() {
    const now = Date.now();
    const timestamps = this._getCleanTimestamps(this._ORDER_TIMESTAMPS_KEY, this.CONFIG.orderWindowMs);

    // 1. Min cooldown check
    if (timestamps.length > 0) {
      const last = timestamps[timestamps.length - 1];
      const elapsed = now - last;
      if (elapsed < this.CONFIG.orderMinCooldownMs) {
        const remaining = Math.ceil((this.CONFIG.orderMinCooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          remainingSeconds: remaining,
          message: `Order submitted just now. Please wait ${remaining} second${remaining > 1 ? 's' : ''} to prevent duplicate billing.`
        };
      }
    }

    // 2. Window quota check
    if (timestamps.length >= this.CONFIG.orderMaxPerWindow) {
      const oldest = timestamps[0];
      const waitTime = Math.ceil((this.CONFIG.orderWindowMs - (now - oldest)) / 1000);
      return {
        allowed: false,
        remainingSeconds: waitTime,
        message: `High traffic queue active. You have placed ${timestamps.length} orders recently. Please wait ${Math.ceil(waitTime / 60)} min before placing another.`
      };
    }

    return { allowed: true };
  },

  /**
   * Record a completed order placement timestamp
   */
  recordOrderSubmission() {
    try {
      const timestamps = this._getCleanTimestamps(this._ORDER_TIMESTAMPS_KEY, this.CONFIG.orderWindowMs);
      timestamps.push(Date.now());
      localStorage.setItem(this._ORDER_TIMESTAMPS_KEY, JSON.stringify(timestamps));
    } catch (e) {}
  },

  /**
   * Check if a contact inquiry is permitted
   */
  canSubmitInquiry() {
    const now = Date.now();
    const timestamps = this._getCleanTimestamps(this._INQUIRY_TIMESTAMPS_KEY, this.CONFIG.inquiryWindowMs);

    if (timestamps.length > 0) {
      const last = timestamps[timestamps.length - 1];
      const elapsed = now - last;
      if (elapsed < this.CONFIG.inquiryMinCooldownMs) {
        const remaining = Math.ceil((this.CONFIG.inquiryMinCooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          remainingSeconds: remaining,
          message: `Inquiry submitted. Please wait ${remaining} seconds before sending another.`
        };
      }
    }

    if (timestamps.length >= this.CONFIG.inquiryMaxPerWindow) {
      return {
        allowed: false,
        remainingSeconds: 60,
        message: 'Maximum inquiries reached for this session. Please call or WhatsApp directly on 6380710362.'
      };
    }

    return { allowed: true };
  },

  /**
   * Record a completed inquiry timestamp
   */
  recordInquirySubmission() {
    try {
      const timestamps = this._getCleanTimestamps(this._INQUIRY_TIMESTAMPS_KEY, this.CONFIG.inquiryWindowMs);
      timestamps.push(Date.now());
      localStorage.setItem(this._INQUIRY_TIMESTAMPS_KEY, JSON.stringify(timestamps));
    } catch (e) {}
  },

  /**
   * Anti-bot honeypot evaluation
   * Returns true if bot behavior detected (honeypot field filled or submitted unnaturally fast)
   */
  isBotDetected(honeypotVal, formLoadedTimestamp, minFormFillMs = 1200) {
    if (honeypotVal && String(honeypotVal).trim().length > 0) {
      console.warn('[TrafficControl] Bot detected via honeypot trap.');
      return true;
    }
    if (formLoadedTimestamp && (Date.now() - formLoadedTimestamp < minFormFillMs)) {
      console.warn('[TrafficControl] Bot detected via sub-second submission speed.');
      return true;
    }
    return false;
  }
};

if (typeof window !== 'undefined') {
  window.TrafficControl = TrafficControl;
}
