/**
 * Abhis Farm Fresh - Cart State Management
 * Persistent localStorage cart with strict MOQ = 1 KG validation
 */

const Cart = {
  STORAGE_KEY: 'aff_cart_items',

  /**
   * Get all items currently in the cart
   * @returns {Array} Array of cart items { id, name, price, unit, imageUrl, quantity, minQty, category }
   */
  getItems() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading cart from localStorage:', e);
      return [];
    }
  },

  /**
   * Save items array to localStorage and sync UI
   */
  save(items) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
      this.syncUI();
      // Dispatch custom event for pages listening to cart changes
      window.dispatchEvent(new CustomEvent('aff_cart_updated', { detail: { items } }));
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  },

  /**
   * Add a product to cart (or update quantity if already exists)
   * Enforces minimum 1 KG rule
   */
  addItem(product, qty = 1) {
    if (!product || !product.id) return;
    
    // Strict MOQ 1 KG enforcement
    const validQty = Math.max(1, parseInt(qty, 10) || 1);
    const items = this.getItems();
    const existingIndex = items.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      items[existingIndex].quantity += validQty;
      items[existingIndex].price = Number(product.price); // update to latest price
    } else {
      items.push({
        id: product.id,
        name: product.name,
        slug: product.slug || Utils.slugify(product.name),
        price: Number(product.price),
        unit: product.unit || 'KG',
        imageUrl: product.imageUrl || '../images/farm_fresh_media_01.jpeg',
        category: product.category || 'everyday',
        quantity: validQty,
        minQty: 1
      });
    }

    this.save(items);
    if (window.Utils) {
      Utils.showToast(`Added ${validQty} KG ${product.name} to cart ✓`, 'success');
    }
  },

  /**
   * Set exact quantity for an item (enforces min 1 KG)
   */
  setQuantity(productId, qty) {
    const items = this.getItems();
    const item = items.find(i => i.id === productId);
    if (!item) return;

    const validQty = Math.max(1, parseInt(qty, 10) || 1);
    item.quantity = validQty;
    this.save(items);
  },

  /**
   * Increment or decrement item quantity
   */
  updateQuantity(productId, delta) {
    const items = this.getItems();
    const item = items.find(i => i.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
      // If decreased below 1, prompt or remove
      this.removeItem(productId);
    } else {
      item.quantity = newQty;
      this.save(items);
    }
  },

  /**
   * Remove an item from the cart
   */
  removeItem(productId) {
    let items = this.getItems();
    const removedItem = items.find(i => i.id === productId);
    items = items.filter(i => i.id !== productId);
    this.save(items);

    if (removedItem && window.Utils) {
      Utils.showToast(`Removed ${removedItem.name} from cart`, 'info');
    }
  },

  /**
   * Clear all items from the cart
   */
  clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.syncUI();
      window.dispatchEvent(new CustomEvent('aff_cart_updated', { detail: { items: [] } }));
    } catch (e) {
      console.error('Error clearing cart:', e);
    }
  },

  /**
   * Get total unique items count
   */
  getTotalItems() {
    return this.getItems().length;
  },

  /**
   * Get total quantity in KG
   */
  getTotalQuantity() {
    return this.getItems().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  },

  /**
   * Get subtotal amount in INR
   */
  getSubtotal() {
    return this.getItems().reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  },

  /**
   * Get grand total (offline payment, no extra fees)
   */
  getGrandTotal() {
    return this.getSubtotal();
  },

  /**
   * Synchronize badge counts and sticky bars across the DOM
   */
  syncUI() {
    const totalItems = this.getTotalItems();
    const totalQty = this.getTotalQuantity();
    const grandTotal = this.getGrandTotal();

    // Desktop header badge
    const headerBadge = document.getElementById('header-cart-badge');
    if (headerBadge) {
      headerBadge.textContent = totalItems;
      headerBadge.style.display = totalItems > 0 ? 'inline-flex' : 'none';
    }

    // Mobile bottom navigation badge
    const mobileBadge = document.getElementById('mobile-cart-badge');
    if (mobileBadge) {
      mobileBadge.textContent = totalItems;
      mobileBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Sticky mobile/desktop cart preview bar
    const stickyBar = document.getElementById('sticky-cart-bar');
    const stickyQtyEl = document.getElementById('sticky-cart-qty');
    const stickyTotalEl = document.getElementById('sticky-cart-total');

    if (stickyBar) {
      if (totalItems > 0) {
        stickyBar.classList.remove('hidden');
        stickyBar.style.display = 'flex';
        if (stickyQtyEl) stickyQtyEl.textContent = `${totalItems} Item${totalItems > 1 ? 's' : ''} (${totalQty} KG)`;
        if (stickyTotalEl) stickyTotalEl.textContent = Utils.formatCurrency(grandTotal);
      } else {
        stickyBar.classList.add('hidden');
        stickyBar.style.display = 'none';
      }
    }
  }
};

window.Cart = Cart;

// Sync UI as soon as DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Cart.syncUI();
});
