/**
 * Abhis Farm Fresh - Products Catalogue Controller
 * Handles fetching, category filtering, search, sorting, and direct one-tap cart steppers
 */

let allProducts = [];
let activeCategory = 'all';
let currentSearch = '';
let currentSort = 'default';

document.addEventListener('DOMContentLoaded', async () => {
  initCategoryPills();
  setupSearchAndSort();
  window.addEventListener('aff_cart_updated', () => {
    // Only re-render if products are already loaded to avoid blanking
    if (allProducts.length > 0) {
      renderProductsGrid();
    }
  });
  await loadProducts();
});

/**
 * Initialize category filter pills
 */
function initCategoryPills() {
  const container = document.getElementById('category-filter-container');
  if (!container || !window.AFF_CONFIG) return;

  container.innerHTML = window.AFF_CONFIG.categories.map(cat => `
    <button type="button"
            onclick="setProductCategory('${cat.id}')"
            id="cat-pill-${cat.id}"
            class="cat-pill px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${cat.id === 'all' ? 'bg-emerald-800 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
      <span class="material-symbols-outlined text-sm">${cat.icon}</span>
      ${cat.name}
    </button>
  `).join('');
}

/**
 * Filter by category
 */
function setProductCategory(catId) {
  activeCategory = catId;

  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.className = "cat-pill px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all bg-white text-slate-700 hover:bg-slate-100 border border-slate-200";
  });

  const selectedBtn = document.getElementById(`cat-pill-${catId}`);
  if (selectedBtn) {
    selectedBtn.className = "cat-pill px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all bg-emerald-800 text-white shadow-sm";
  }

  renderProductsGrid();
}

/**
 * Setup search and sort event listeners
 */
function setupSearchAndSort() {
  const searchInput = document.getElementById('product-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderProductsGrid();
    }, 250));
  }

  const sortSelect = document.getElementById('product-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderProductsGrid();
    });
  }
}

/**
 * Load products from Firestore (or local persistent storage fallback)
 */
async function loadProducts() {
  const grid = document.getElementById('products-grid') || document.getElementById('featured-products-grid');
  if (!grid) return;

  grid.innerHTML = Utils.createSkeleton(8);

  try {
    let fetched = [];
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      fetched = await window.FirebaseApp.getProducts();
    }

    if (fetched && fetched.length > 0) {
      allProducts = fetched;
      if (window.ProductStorage) window.ProductStorage.saveAll(fetched);
    } else {
      allProducts = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
    }
  } catch (err) {
    console.warn('Could not fetch from Firestore, using local persistent storage:', err);
    allProducts = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
  }

  // Filter only active items for customer
  allProducts = allProducts.filter(p => p.isActive !== false && p.status !== 'inactive');

  renderProductsGrid();
}

/**
 * Filter and sort products, then render cards to DOM
 */
function renderProductsGrid() {
  const grid = document.getElementById('products-grid') || document.getElementById('featured-products-grid');
  if (!grid) return;

  let filtered = [...allProducts];

  // 1. Filter by category
  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  // 2. Filter by search query
  if (currentSearch) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(currentSearch) ||
      (p.description && p.description.toLowerCase().includes(currentSearch)) ||
      (p.category && p.category.toLowerCase().includes(currentSearch))
    );
  }

  // 3. Sort
  if (currentSort === 'price-low') {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (currentSort === 'price-high') {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (currentSort === 'name-az') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Handle empty state
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <span class="material-symbols-outlined text-5xl text-slate-300 mb-2">search_off</span>
        <h3 class="font-bold text-slate-900 text-lg">No vegetables found</h3>
        <p class="text-xs text-slate-500 mt-1 mb-5">We couldn't find any produce matching "${Utils.escapeHtml(currentSearch || activeCategory)}". Try searching for Tomato, Onion, or Spinach.</p>
        <button onclick="resetCatalogueFilters()" class="btn btn-primary btn-sm">
          Clear Filters & View All
        </button>
      </div>
    `;
    return;
  }

  const cartItems = Cart.getItems();

  grid.innerHTML = filtered.map(product => {
    const isOutOfStock = product.status === 'out_of_stock' || product.stock <= 0;
    const cartItem = cartItems.find(c => c.id === product.id);
    const inCart = Boolean(cartItem && cartItem.quantity > 0);
    const currentQty = cartItem ? cartItem.quantity : 0;

    const displayImage = Utils.resolveImageUrl(product.imageUrl, false);

    return `
      <div class="card product-card group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between" id="card-${product.id}">
        <div>
          <!-- Image & Badges -->
          <div class="product-image-wrap relative h-48 w-full bg-slate-100 overflow-hidden">
            <img src="${displayImage}" 
                 alt="${Utils.escapeHtml(product.name)}"
                 loading="lazy"
                 onerror="this.src='images/farm_fresh_media_01.jpeg'"
                 class="product-image w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            
            <div class="absolute top-3 left-3 flex flex-col gap-1 z-10">
              ${isOutOfStock 
                ? '<span class="chip chip-danger">Out of Stock</span>' 
                : '<span class="chip chip-success">Fresh Daily Harvest</span>'}
              <span class="chip bg-slate-900/80 text-white backdrop-blur-md capitalize">${product.category}</span>
            </div>

            <!-- WhatsApp Direct Inquiry -->
            <button type="button"
                    onclick="WhatsAppService.openInquiryWhatsApp('${Utils.escapeHtml(product.name)}', ${product.price}, '${product.unit || 'KG'}')"
                    class="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md transition-transform active:scale-95 z-10"
                    title="Inquire about ${Utils.escapeHtml(product.name)} on WhatsApp">
              <span class="material-symbols-outlined text-sm">chat</span>
            </button>
          </div>

          <!-- Product Details -->
          <div class="p-4">
            <div class="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-0.5">
              Grade A • Min. 1 KG
            </div>
            <h3 class="font-bold text-slate-900 text-base group-hover:text-emerald-800 transition-colors leading-snug">
              ${Utils.escapeHtml(product.name)}
            </h3>
            
            <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              ${Utils.escapeHtml(product.description || 'Farm-fresh premium produce delivered directly to your doorstep.')}
            </p>

            <div class="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-100">
              <div>
                <span class="text-xl font-extrabold text-slate-900">${Utils.formatCurrency(product.price)}</span>
                <span class="text-xs text-slate-500 font-medium">/ ${product.unit || 'KG'}</span>
              </div>
              <div class="text-right">
                <span class="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Daily Fresh
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Direct One-Tap Add / Interactive Stepper Action -->
        <div class="p-4 pt-0 bg-white">
          <div class="pt-2 border-t border-slate-100">
            ${isOutOfStock ? `
              <button type="button" disabled class="btn w-full opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200">
                Out of Stock
              </button>
            ` : inCart ? `
              <div class="card-stepper">
                <button type="button" 
                        class="card-stepper-btn" 
                        onclick="Cart.updateQuantity('${product.id}', -1)" 
                        aria-label="Decrease quantity of ${Utils.escapeHtml(product.name)}">
                  <span class="material-symbols-outlined text-lg">remove</span>
                </button>
                <span class="card-stepper-qty">${currentQty} KG</span>
                <button type="button" 
                        class="card-stepper-btn" 
                        onclick="Cart.updateQuantity('${product.id}', 1)" 
                        aria-label="Increase quantity of ${Utils.escapeHtml(product.name)}">
                  <span class="material-symbols-outlined text-lg">add</span>
                </button>
              </div>
            ` : `
              <button type="button"
                      onclick="handleDirectAdd('${product.id}')"
                      class="btn btn-primary w-full py-2.5 px-4 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98">
                <span class="material-symbols-outlined text-base">add</span>
                <span>ADD</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Directly add 1 KG of product to cart
 */
function handleDirectAdd(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  Cart.addItem(product, 1);
}

/**
 * Reset filters helper
 */
function resetCatalogueFilters() {
  currentSearch = '';
  const searchInput = document.getElementById('product-search-input');
  if (searchInput) searchInput.value = '';
  setProductCategory('all');
}

window.setProductCategory = setProductCategory;
window.handleDirectAdd = handleDirectAdd;
window.resetCatalogueFilters = resetCatalogueFilters;
