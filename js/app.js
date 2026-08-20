/**
 * Abhis Farm Fresh - Senior UI/UX App Controller (Vanilla JS)
 * Mobile-First Ordering, Stepper Controls, Slide-Over Quote Drawer & WhatsApp Inquirer
 */

let cartState = [];
let activeCategory = 'all';
let currentSort = 'default';

document.addEventListener('DOMContentLoaded', () => {
    initCategoryTabs();
    renderCatalog();
    renderAdminDashboard();
    setupEventListeners();
});

function initCategoryTabs() {
    const tabContainer = document.getElementById('category-tabs');
    if (!tabContainer || !APP_DATA.categories) return;

    tabContainer.innerHTML = APP_DATA.categories.map(cat => `
        <button onclick="filterCategory('${cat.id}')" 
                id="cat-tab-${cat.id}"
                class="category-btn whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${cat.id === 'all' ? 'bg-emerald-800 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
            <span class="material-symbols-outlined text-sm">${cat.icon}</span>
            ${cat.name}
        </button>
    `).join('');
}

function filterCategory(catId) {
    activeCategory = catId;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.className = "category-btn whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all bg-white text-slate-700 hover:bg-slate-100 border border-slate-200";
    });

    const selectedBtn = document.getElementById(`cat-tab-${catId}`);
    if (selectedBtn) {
        selectedBtn.className = "category-btn whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all bg-emerald-800 text-white shadow-md";
    }

    renderCatalog();
}

function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    const searchInput = document.getElementById('catalog-search');
    const sortSelect = document.getElementById('catalog-sort');
    if (!grid || !APP_DATA.products) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    let filtered = APP_DATA.products;

    if (activeCategory !== 'all') {
        filtered = filtered.filter(p => p.category === activeCategory);
    }

    if (query !== '') {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.origin.toLowerCase().includes(query) ||
            p.grade.toLowerCase().includes(query)
        );
    }

    if (sortSelect) {
        const sortVal = sortSelect.value;
        if (sortVal === 'price-low') filtered.sort((a, b) => a.price - b.price);
        if (sortVal === 'price-high') filtered.sort((a, b) => b.price - a.price);
        if (sortVal === 'moq-low') filtered.sort((a, b) => a.moq - b.moq);
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
                <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">search_off</span>
                <h3 class="font-bold text-slate-800 text-base">No produce matching your search</h3>
                <p class="text-xs text-slate-500 mt-1 mb-4">Try clearing filters or search for another item like Tomato, Capsicum, or Eggs.</p>
                <button onclick="resetCatalogFilters()" class="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg">Reset Filters</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const cartItem = cartState.find(c => c.id === item.id);
        const currentQty = cartItem ? cartItem.quantity : item.moq;
        const inCart = Boolean(cartItem);

        return `
            <div class="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                    <!-- Image & Badges -->
                    <div class="h-48 w-full relative bg-slate-100 overflow-hidden">
                        <img src="${item.image}" 
                             onerror="this.src='${item.fallbackImage}'" 
                             alt="${item.name}" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        
                        <div class="absolute top-3 left-3 flex flex-col gap-1.5">
                            <span class="chip chip-success">${item.status}</span>
                            <span class="chip bg-slate-900/80 text-white backdrop-blur-md">${item.grade}</span>
                        </div>

                        <button onclick="openWhatsAppModal('${item.name}', '${item.price}', '${item.unit}')"
                                class="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
                                title="Inquire on WhatsApp">
                            <span class="material-symbols-outlined text-sm">chat</span>
                        </button>
                    </div>

                    <!-- Details Body -->
                    <div class="p-4">
                        <div class="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-0.5">${item.origin}</div>
                        <h3 class="font-bold text-slate-900 text-base group-hover:text-emerald-800 transition-colors leading-snug">${item.name}</h3>
                        
                        <div class="mt-3 flex items-baseline justify-between">
                            <div>
                                <span class="text-xl font-extrabold text-slate-900">₹${item.price.toFixed(2)}</span>
                                <span class="text-xs text-slate-500 font-medium">/ ${item.unit}</span>
                            </div>
                            <div class="text-right">
                                <span class="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                                    ${item.crateSize}
                                </span>
                            </div>
                        </div>

                        <!-- Contract Tier Pricing Banner -->
                        <div class="mt-2.5 p-2 bg-emerald-50/60 rounded-lg border border-emerald-100 text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs">payments</span>
                            <span>${item.tierPrice}</span>
                        </div>

                        <div class="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                            <span>MOQ: <strong>${item.moq} ${item.unit}</strong></span>
                            <span>Freshness: <strong>${item.harvestDate}</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Card Footer & Mobile Stepper -->
                <div class="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100">
                    <div class="flex items-center gap-2">
                        <!-- Quantity Stepper -->
                        <div class="flex items-center border border-slate-200 rounded-lg bg-white p-1">
                            <button class="stepper-btn" onclick="updateItemQty('${item.id}', -1, ${item.moq})">-</button>
                            <span class="px-2 text-xs font-bold text-slate-800 w-10 text-center">${currentQty}</span>
                            <button class="stepper-btn" onclick="updateItemQty('${item.id}', 1, ${item.moq})">+</button>
                        </div>

                        <!-- Add/Update Button -->
                        <button onclick="addToQuoteDirect('${item.id}', ${currentQty})"
                                class="flex-1 ${inCart ? 'bg-slate-800 hover:bg-slate-900' : 'bg-emerald-800 hover:bg-emerald-900'} text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-98">
                            <span class="material-symbols-outlined text-base">${inCart ? 'check_circle' : 'add_shopping_cart'}</span>
                            ${inCart ? 'Updated in Quote' : 'Add to Quote'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function resetCatalogFilters() {
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) searchInput.value = '';
    filterCategory('all');
}

function updateItemQty(productId, delta, moq) {
    const item = cartState.find(c => c.id === productId);
    const product = APP_DATA.products.find(p => p.id === productId);
    const step = moq > 10 ? 10 : 1;

    if (item) {
        item.quantity = Math.max(moq, item.quantity + (delta * step));
    } else if (product) {
        addToQuoteDirect(productId, Math.max(moq, moq + (delta * step)));
        return;
    }
    updateCartUI();
    renderCatalog();
}

function addToQuoteDirect(productId, qty) {
    const product = APP_DATA.products.find(p => p.id === productId);
    if (!product) return;

    const existing = cartState.find(c => c.id === productId);
    if (existing) {
        existing.quantity = qty;
    } else {
        cartState.push({
            id: product.id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            crateSize: product.crateSize,
            quantity: qty
        });
    }

    showToast(`Added ${product.name} (${qty} ${product.unit}) to Quote`);
    updateCartUI();
    renderCatalog();
}

function updateCartUI() {
    const totalCount = cartState.length;
    const totalQtyKg = cartState.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = cartState.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    // Update Amazon / Flipkart mobile bottom nav badge
    const mobileBadge = document.getElementById('mobile-cart-badge');
    if (mobileBadge) mobileBadge.innerText = totalCount;

    // Floating Bottom Bar (Mobile & Desktop sticky bar)
    const floatBar = document.getElementById('floating-quote-bar');
    const floatCount = document.getElementById('float-quote-count');
    const floatTotal = document.getElementById('float-quote-total');

    if (floatCount) floatCount.innerText = `${totalCount} Produce Items (${totalQtyKg} kg Total)`;
    if (floatTotal) floatTotal.innerText = `₹${totalPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

    if (floatBar) {
        if (totalCount > 0) {
            floatBar.classList.remove('hidden');
            floatBar.classList.add('flex');
        } else {
            floatBar.classList.add('hidden');
            floatBar.classList.remove('flex');
        }
    }

    renderQuoteSummaryList();
}

function renderQuoteSummaryList() {
    const list = document.getElementById('quote-items-list');
    const totalEl = document.getElementById('quote-grand-total');
    const drawerList = document.getElementById('drawer-items-list');
    const drawerTotal = document.getElementById('drawer-grand-total');

    const totalPrice = cartState.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const emptyHTML = `
        <div class="text-center py-8">
            <span class="material-symbols-outlined text-3xl text-slate-300 mb-1">shopping_basket</span>
            <p class="text-xs text-slate-500 font-medium">No produce selected yet. Tap '+' on any item to build your quote.</p>
        </div>
    `;

    if (cartState.length === 0) {
        if (list) list.innerHTML = emptyHTML;
        if (drawerList) drawerList.innerHTML = emptyHTML;
        if (totalEl) totalEl.innerText = "₹0.00";
        if (drawerTotal) drawerTotal.innerText = "₹0.00";
        return;
    }

    const itemsHTML = cartState.map((item, idx) => {
        const itemTotal = item.price * item.quantity;
        return `
            <div class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                <div class="pr-2">
                    <div class="font-bold text-xs text-slate-900">${item.name}</div>
                    <div class="text-[11px] text-slate-500">₹${item.price.toFixed(2)} / ${item.unit}</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-100">
                        ${item.quantity} ${item.unit}
                    </span>
                    <span class="font-extrabold text-xs text-slate-900">₹${itemTotal.toLocaleString('en-IN')}</span>
                    <button onclick="removeQuoteItem(${idx})" class="text-slate-400 hover:text-red-600 transition-colors p-1" title="Remove">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (list) list.innerHTML = itemsHTML;
    if (drawerList) drawerList.innerHTML = itemsHTML;

    const formattedTotal = `₹${totalPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    if (totalEl) totalEl.innerText = formattedTotal;
    if (drawerTotal) drawerTotal.innerText = formattedTotal;
}

function removeQuoteItem(idx) {
    const item = cartState[idx];
    cartState.splice(idx, 1);
    if (item) showToast(`Removed ${item.name} from Quote`);
    updateCartUI();
    renderCatalog();
}

function toggleQuoteDrawer() {
    const drawer = document.getElementById('quote-drawer');
    if (!drawer) return;

    if (drawer.classList.contains('hidden')) {
        drawer.classList.remove('hidden');
    } else {
        drawer.classList.add('hidden');
    }
}

function openWhatsAppModal(itemName, price, unit) {
    const msg = encodeURIComponent(`Hi Abhis Farm Fresh! I am interested in ordering ${itemName} (₹${price}/${unit}). Please share availability & delivery slots.`);
    const waUrl = `https://wa.me/916380710362?text=${msg}`;
    window.open(waUrl, '_blank');
}

function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'fixed bottom-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-slide-up';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="material-symbols-outlined text-emerald-400 text-base">check_circle</span> ${message}`;
    toast.style.display = 'flex';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 2800);
}

function renderAdminDashboard() {
    const tbody = document.getElementById('admin-quotes-tbody');
    if (!tbody || !APP_DATA.quotes) return;

    tbody.innerHTML = APP_DATA.quotes.map(q => `
        <tr class="border-b border-slate-200/70 hover:bg-slate-50 transition-colors">
            <td class="py-3.5 px-4 font-bold text-xs text-slate-900">${q.id}</td>
            <td class="py-3.5 px-4 text-xs font-semibold text-slate-800">${q.clientName}</td>
            <td class="py-3.5 px-4 text-xs text-slate-500">${q.date}</td>
            <td class="py-3.5 px-4 text-xs font-extrabold text-slate-900">₹${q.totalEstimate.toLocaleString('en-IN')}</td>
            <td class="py-3.5 px-4">
                <span class="chip ${q.status === 'Approved' ? 'chip-success' : 'chip-warning'}">${q.status}</span>
            </td>
            <td class="py-3.5 px-4 flex gap-2">
                <button onclick="approveQuote('${q.id}')" class="bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors">Approve</button>
            </td>
        </tr>
    `).join('');
}

function approveQuote(id) {
    const q = APP_DATA.quotes.find(item => item.id === id);
    if (q) {
        q.status = "Approved";
        renderAdminDashboard();
        showToast(`Quote ${id} status updated to Approved!`);
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderCatalog());
    }

    const sortSelect = document.getElementById('catalog-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => renderCatalog());
    }

    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (cartState.length === 0) {
                alert("Please add produce items to your quote first.");
                return;
            }
            const rfqId = `RFQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
            alert(`🎉 Success! Wholesale RFQ ${rfqId} submitted. Our B2B Account Manager will call you within 2 hours.`);
            cartState = [];
            updateCartUI();
            renderCatalog();
            const drawer = document.getElementById('quote-drawer');
            if (drawer) drawer.classList.add('hidden');
        });
    }
}
