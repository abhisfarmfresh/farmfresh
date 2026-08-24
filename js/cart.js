/**
 * Abhis Farm Fresh - Cart State Management
 * Persistent localStorage cart with strict MOQ = 1 KG validation
 */

const Cart = {
  STORAGE_KEY: 'aff_cart_items',

  /**
   * Get all items currently in the cart
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
    
    const validQty = Math.max(1, parseInt(qty, 10) || 1);
    const sId = String(product.id);
    const items = this.getItems();
    const existingIndex = items.findIndex(item => String(item.id) === sId);

    if (existingIndex > -1) {
      items[existingIndex].quantity += validQty;
      items[existingIndex].price = Number(product.price);
    } else {
      items.push({
        id: sId,
        name: product.name,
        slug: product.slug || Utils.slugify(product.name),
        price: Number(product.price),
        unit: product.unit || 'KG',
        imageUrl: product.imageUrl || 'images/farm_fresh_media_01.jpeg',
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
    if (!productId) return;
    const sId = String(productId);
    const items = this.getItems();
    const item = items.find(i => String(i.id) === sId);
    if (!item) return;

    const validQty = Math.max(1, parseInt(qty, 10) || 1);
    item.quantity = validQty;
    this.save(items);
  },

  /**
   * Increment or decrement item quantity
   */
  updateQuantity(productId, delta) {
    if (!productId) return;
    const sId = String(productId);
    const items = this.getItems();
    const item = items.find(i => String(i.id) === sId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.removeItem(sId);
    } else {
      item.quantity = newQty;
      this.save(items);
    }
  },

  /**
   * Remove an item from the cart
   */
  removeItem(productId) {
    if (!productId) return;
    const sId = String(productId);
    let items = this.getItems();
    const removedItem = items.find(i => String(i.id) === sId);
    items = items.filter(i => String(i.id) !== sId);
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

  getTotalItems() {
    return this.getItems().length;
  },

  getTotalQuantity() {
    return this.getItems().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  },

  getSubtotal() {
    return this.getItems().reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  },

  getGrandTotal() {
    return this.getSubtotal();
  },

  syncUI() {
    const totalItems = this.getTotalItems();
    const totalQty = this.getTotalQuantity();
    const grandTotal = this.getGrandTotal();

    // Desktop Header Badge
    const headerBadge = document.getElementById('header-cart-badge');
    if (headerBadge) {
      headerBadge.textContent = totalItems;
      headerBadge.style.display = totalItems > 0 ? 'inline-flex' : 'none';
    }

    // Mobile Top Header Badge
    const mobileHeaderBadge = document.getElementById('mobile-header-cart-badge');
    if (mobileHeaderBadge) {
      mobileHeaderBadge.textContent = totalItems;
      mobileHeaderBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Mobile Bottom Nav Badge
    const mobileBadge = document.getElementById('mobile-cart-badge');
    if (mobileBadge) {
      mobileBadge.textContent = totalItems;
      mobileBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Generic badges
    document.querySelectorAll('.cart-badge-count').forEach(el => {
      el.textContent = totalItems;
      el.style.display = totalItems > 0 ? 'inline-flex' : 'none';
    });

    const stickyBar = document.getElementById('sticky-cart-bar');
    const stickyQtyEl = document.getElementById('sticky-cart-qty');
    const stickyTotalEl = document.getElementById('sticky-cart-total');

    if (stickyBar) {
      if (totalItems > 0) {
        stickyBar.classList.remove('hidden');
        stickyBar.style.display = 'flex';
        if (stickyQtyEl) stickyQtyEl.textContent = `${totalItems} Item${totalItems > 1 ? 's' : ''} (${totalQty} KG)`;
        if (stickyTotalEl && window.Utils) stickyTotalEl.textContent = Utils.formatCurrency(grandTotal);
      } else {
        stickyBar.classList.add('hidden');
        stickyBar.style.display = 'none';
      }
    }
  }
};

window.Cart = Cart;

document.addEventListener('DOMContentLoaded', () => {
  Cart.syncUI();
});
