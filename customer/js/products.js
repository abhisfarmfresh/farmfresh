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
    if (allProducts.length > 0) {
      renderProductsGrid();
    }
  });
  await loadProducts();
});

/**
 * Initialize category filter pills and showcase cards
 */
function initCategoryPills() {
  const container = document.getElementById('category-filter-container');
  const showcaseGrid = document.getElementById('homepage-category-grid');

  if (showcaseGrid && window.AFF_CONFIG) {
    showcaseGrid.innerHTML = window.AFF_CONFIG.categories.map(cat => `
      <div onclick="setProductCategory('${cat.id}')"
           id="cat-card-${cat.id}"
           class="category-showcase-card cursor-pointer group p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between ${cat.id === activeCategory ? 'active' : ''}">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${cat.iconBg} border flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-xl sm:text-2xl">${cat.icon}</span>
          </div>
          <span class="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
            ${cat.tag}
          </span>
        </div>
        <div>
          <h3 class="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-900 transition-colors">${cat.name}</h3>
          <p class="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-1">${cat.subtitle}</p>
        </div>
      </div>
    `).join('');
  }

  if (container && window.AFF_CONFIG) {
    container.innerHTML = window.AFF_CONFIG.categories.map(cat => `
      <button type="button"
              onclick="setProductCategory('${cat.id}')"
              id="cat-pill-${cat.id}"
              class="cat-pill ${cat.id === activeCategory ? 'active' : ''}">
        <span class="material-symbols-outlined text-base">${cat.icon}</span>
        <span>${cat.name}</span>
      </button>
    `).join('');
  }
}

/**
 * Filter by category
 */
function setProductCategory(catId) {
  activeCategory = catId;

  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.remove('active');
  });

  const selectedBtn = document.getElementById(`cat-pill-${catId}`);
  if (selectedBtn) {
    selectedBtn.classList.add('active');
    try {
      selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } catch (e) {}
  }

  document.querySelectorAll('.category-showcase-card').forEach(card => {
    card.classList.remove('active');
  });

  const selectedCard = document.getElementById(`cat-card-${catId}`);
  if (selectedCard) {
    selectedCard.classList.add('active');
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

    const displayImage = Utils.resolveImageUrl(product.imageUrl, true);

    return `
      <div class="product-card group bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-950/5 transition-all duration-300 flex flex-col justify-between" id="card-${product.id}">
        <div>
          <!-- Clean Product Image Wrap (No text overlay) -->
          <div class="product-card-img-wrap relative h-52 w-full bg-slate-50 overflow-hidden">
            <img src="${displayImage}" 
                 alt="${Utils.escapeHtml(product.name)}"
                 loading="lazy"
                 onerror="this.src='../images/farm_fresh_media_01.jpeg'"
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out">
            
            ${isOutOfStock ? `
              <div class="absolute top-3 left-3 z-10">
                <span class="chip chip-danger text-[10px] shadow-sm">Out of Stock</span>
              </div>
            ` : ''}

            <!-- WhatsApp Direct Inquiry -->
            <button type="button"
                    onclick="WhatsAppService.openInquiryWhatsApp('${Utils.escapeHtml(product.name)}', ${product.price}, '${product.unit || 'KG'}')"
                    class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-emerald-600 text-slate-700 hover:text-white backdrop-blur-md flex items-center justify-center shadow-md transition-all active:scale-90 z-10 group/btn"
                    title="Inquire about ${Utils.escapeHtml(product.name)} on WhatsApp">
              <span class="material-symbols-outlined text-sm">chat</span>
            </button>
          </div>

          <!-- Product Details -->
          <div class="p-5">
            <div class="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 mb-1">
              <span class="capitalize bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md">${product.category || 'everyday'} • Grade A</span>
              <span class="text-slate-400 font-semibold lowercase">min. 1 ${product.unit || 'KG'}</span>
            </div>

            <h3 class="font-extrabold text-slate-900 text-base group-hover:text-emerald-800 transition-colors leading-snug">
              ${Utils.escapeHtml(product.name)}
            </h3>
            
            <p class="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed h-8">
              ${Utils.escapeHtml(product.description || 'Farm-fresh premium produce delivered directly to your doorstep.')}
            </p>

            <div class="mt-4 flex items-baseline justify-between pt-3 border-t border-slate-100">
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-extrabold text-slate-950 tracking-tight">${Utils.formatCurrency(product.price)}</span>
                <span class="text-xs text-slate-400 font-medium">/ ${product.unit || 'KG'}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/80">
                  Daily Fresh
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Add to Cart / Quantity Stepper Action -->
        <div class="p-5 pt-0 bg-white">
          <div class="pt-2 border-t border-slate-100">
            ${isOutOfStock ? `
              <button type="button" disabled class="btn w-full opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200">
                Unavailable
              </button>
            ` : inCart ? `
              <div class="card-stepper">
                <button type="button" 
                        class="card-stepper-btn" 
                        onclick="Cart.updateQuantity('${product.id}', -1)" 
                        aria-label="Decrease quantity of ${Utils.escapeHtml(product.name)}">
                  <span class="material-symbols-outlined text-base">remove</span>
                </button>
                <span class="card-stepper-val">${currentQty} KG</span>
                <button type="button" 
                        class="card-stepper-btn" 
                        onclick="Cart.updateQuantity('${product.id}', 1)" 
                        aria-label="Increase quantity of ${Utils.escapeHtml(product.name)}">
                  <span class="material-symbols-outlined text-base">add</span>
                </button>
              </div>
            ` : `
              <button type="button"
                      onclick="handleDirectAdd('${product.id}')"
                      class="btn btn-primary w-full py-2.5 px-4 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/10 hover:shadow-lg hover:shadow-emerald-900/20 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-base">add_shopping_cart</span>
                <span>Add to Cart</span>
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
