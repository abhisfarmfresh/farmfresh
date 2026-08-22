/**
 * Abhis Farm Fresh - Admin Product & Daily Price Controller
 * Full CRUD, quick daily price editing, stock status toggling, and Cloudinary image upload
 */

let allAdminProducts = [];
let activeAdminCategory = 'all';
let currentProductSearch = '';

document.addEventListener('DOMContentLoaded', async () => {
  setupProductSearch();
  setupImagePreviewListeners();
  updateConnectionStatus();
  await loadAdminProducts();
});

/**
 * Update the live Firebase Connection indicator
 */
function updateConnectionStatus() {
  const badge = document.getElementById('firebase-connection-badge');
  if (!badge) return;

  const isReady = window.FirebaseApp && window.FirebaseApp.isReady();

  if (isReady) {
    const projectId = (typeof firebaseConfig !== 'undefined') ? firebaseConfig.projectId : 'abhisfarmfresh-3e7d3';
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm cursor-pointer hover:bg-emerald-200 transition-colors';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Firestore Live: ${projectId}</span>`;
    badge.onclick = openFirebaseKeyModal;
  } else {
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm cursor-pointer hover:bg-amber-200 transition-colors';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>⚠️ Offline Mode (Click to Connect Cloud)</span>`;
    badge.onclick = openFirebaseKeyModal;
  }
}

function openFirebaseKeyModal() {
  const modal = document.getElementById('firebase-key-modal');
  const input = document.getElementById('input-firebase-key');
  if (input) {
    input.value = localStorage.getItem('aff_firebase_api_key') || '';
  }
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeFirebaseKeyModal() {
  const modal = document.getElementById('firebase-key-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

async function saveFirebaseApiKeyFromModal() {
  const input = document.getElementById('input-firebase-key');
  if (!input) return;

  const key = input.value.trim();
  if (!key) {
    Utils.showToast('Please enter your Firebase API Key', 'warning');
    return;
  }

  if (!key.startsWith('AIza')) {
    Utils.showToast('Invalid key. Firebase Web API keys start with "AIza..."', 'error');
    return;
  }

  if (window.FirebaseApp) {
    const success = window.FirebaseApp.setApiKey(key);
    if (success) {
      Utils.showToast('🔥 Connected to Live Google Cloud Firestore! ✓', 'success');
      closeFirebaseKeyModal();
      updateConnectionStatus();
      await loadAdminProducts();
    } else {
      Utils.showToast('Connected key saved. Initializing...', 'info');
      closeFirebaseKeyModal();
      window.location.reload();
    }
  }
}

function setupProductSearch() {
  const searchInput = document.getElementById('product-admin-search');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      currentProductSearch = e.target.value.toLowerCase().trim();
      renderAdminProductsTable();
    }, 200));
  }
}

/**
 * Setup Real-time Image Preview Listeners
 */
function setupImagePreviewListeners() {
  const fileInput = document.getElementById('prod-image-file');
  const urlInput = document.getElementById('prod-image-url');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          Utils.showToast('Please select a valid image file', 'warning');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          updateImagePreview(event.target.result, file.name, 'File selected for upload');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (urlInput) {
    urlInput.addEventListener('input', Utils.debounce((e) => {
      const val = e.target.value.trim();
      if (val) {
        let previewSrc = val;
        if (!val.startsWith('http') && !val.startsWith('data:') && !val.startsWith('../') && !val.startsWith('/')) {
          previewSrc = `../${val}`;
        }
        updateImagePreview(previewSrc, 'Custom URL', 'URL entered');
      } else {
        const file = fileInput?.files?.[0];
        if (!file) {
          updateImagePreview('../images/farm_fresh_media_01.jpeg', 'Default Harvest', 'Ready');
        }
      }
    }, 250));
  }
}

/**
 * Update Image Preview Box in Modal
 */
function updateImagePreview(src, title = 'Selected Image Preview', statusText = 'Ready') {
  const previewImg = document.getElementById('modal-image-preview');
  const titleEl = document.getElementById('preview-img-title');
  const subtitleEl = document.getElementById('preview-img-subtitle');
  const statusBadge = document.getElementById('preview-status-badge');

  if (previewImg) {
    previewImg.src = src;
  }
  if (titleEl) {
    titleEl.textContent = title;
  }
  if (subtitleEl) {
    subtitleEl.textContent = typeof src === 'string' && src.startsWith('data:') ? 'Local preview loaded' : (src || 'No image URL');
  }
  if (statusBadge) {
    statusBadge.textContent = statusText;
    statusBadge.className = 'text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200';
  }
}

/**
 * Reset / Clear Image Preview
 */
function clearImagePreview() {
  const fileInput = document.getElementById('prod-image-file');
  const urlInput = document.getElementById('prod-image-url');

  if (fileInput) fileInput.value = '';
  if (urlInput) urlInput.value = '';

  updateImagePreview('../images/farm_fresh_media_01.jpeg', 'Default Produce Image', 'Reset to default');
}

function filterAdminCategory(cat) {
  activeAdminCategory = cat;

  document.querySelectorAll('.admin-cat-pill').forEach(btn => {
    btn.className = "admin-cat-pill px-3 py-1 rounded-full text-xs font-bold transition-all bg-white text-slate-700 hover:bg-slate-100 border border-slate-200";
  });

  const activeBtn = document.getElementById(`admin-cat-${cat}`);
  if (activeBtn) {
    activeBtn.className = "admin-cat-pill px-3 py-1 rounded-full text-xs font-bold transition-all bg-emerald-800 text-white shadow-sm";
  }

  renderAdminProductsTable();
}

/**
 * Load all products for admin
 */
async function loadAdminProducts() {
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="admin-loading py-8 text-center text-slate-500 font-semibold">Fetching vegetable products...</td></tr>`;

  try {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      const live = await window.FirebaseApp.getAllProducts();
      if (live && live.length > 0) {
        allAdminProducts = live;
        if (window.ProductStorage) window.ProductStorage.saveAll(live);
      } else {
        allAdminProducts = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
      }
    } else {
      allAdminProducts = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
    }
  } catch (err) {
    console.warn('Error fetching products from Firestore:', err);
    allAdminProducts = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
  }

  if (!allAdminProducts || allAdminProducts.length === 0) {
    allAdminProducts = window.ProductStorage ? window.ProductStorage.resetToDefaults() : [];
  }

  renderAdminProductsTable();
}

/**
 * Seed / Import default produce into database
 */
async function seedDefaultProduceToDatabase() {
  const defaults = window.ProductStorage ? window.ProductStorage.getAll() : (window.DEFAULT_PRODUCTS || []);
  if (!defaults || defaults.length === 0) {
    Utils.showToast('No default produce items available to import.', 'warning');
    return;
  }

  if (window.ProductStorage) {
    window.ProductStorage.saveAll(defaults);
  }

  if (!window.FirebaseApp || !window.FirebaseApp.isReady()) {
    Utils.showToast('Produce synced to local storage (Offline Mode)! ✓', 'success');
    allAdminProducts = defaults;
    renderAdminProductsTable();
    return;
  }

  const btn = document.getElementById('btn-seed-produce');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined text-base animate-spin">sync</span><span>Syncing...</span>`;
  }

  Utils.showToast(`Syncing ${defaults.length} vegetables to Firestore...`, 'info');
  const count = await window.FirebaseApp.seedDefaultProducts(defaults);

  if (count > 0) {
    Utils.showToast(`Successfully synced ${count} fresh vegetables to database! ✓`, 'success');
    await loadAdminProducts();
  } else {
    Utils.showToast('Synced to local storage. (Firestore offline)', 'info');
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined text-base">sync</span><span>Sync Produce</span>`;
  }
}

/**
 * Resolve display image URL in Admin (relative to /admin/)
 */
function getAdminDisplayImageUrl(url) {
  return Utils.resolveImageUrl(url, true);
}

function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-tbody');
  const countLabel = document.getElementById('products-count-label');
  if (!tbody) return;

  let filtered = [...allAdminProducts];

  if (activeAdminCategory !== 'all') {
    filtered = filtered.filter(p => p.category === activeAdminCategory);
  }

  if (currentProductSearch) {
    filtered = filtered.filter(p => 
      (p.name && p.name.toLowerCase().includes(currentProductSearch)) ||
      (p.category && p.category.toLowerCase().includes(currentProductSearch))
    );
  }

  if (countLabel) countLabel.textContent = `${filtered.length} of ${allAdminProducts.length} Vegetables`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-slate-400">
          <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">inventory_2</span>
          <div class="font-bold text-slate-700 text-sm">No vegetable products found</div>
          <div class="text-xs text-slate-400 mt-1 mb-3">Click "+ Add Vegetable" or sync the default catalogue.</div>
          <button type="button" onclick="seedDefaultProduceToDatabase()" class="admin-btn admin-btn-secondary text-xs inline-flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">sync</span>
            <span>Import Default Vegetables</span>
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isAvailable = p.status === 'available';
    const displayImg = getAdminDisplayImageUrl(p.imageUrl);

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors" id="row-${p.id}">
        <!-- Thumbnail & Name -->
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${displayImg}" 
                 alt="${Utils.escapeHtml(p.name)}" 
                 onerror="this.src='../images/farm_fresh_media_01.jpeg'"
                 class="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0">
            <div>
              <div class="font-bold text-xs text-slate-900">${Utils.escapeHtml(p.name)}</div>
              <div class="text-[11px] text-slate-400 capitalize">${p.category || 'everyday'}</div>
            </div>
          </div>
        </td>

        <!-- Daily Price Quick Edit Column -->
        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-slate-500">₹</span>
            <input type="number" 
                   id="price-input-${p.id}" 
                   value="${p.price}" 
                   min="1" 
                   step="0.5" 
                   class="w-20 px-2 py-1 text-xs font-extrabold text-slate-900 border border-slate-200 rounded-lg bg-white focus:border-emerald-700 outline-none">
            <button onclick="saveDailyPrice('${p.id}')" 
                    class="p-1 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Save New Daily Price">
              <span class="material-symbols-outlined text-base">save</span>
            </button>
          </div>
        </td>

        <!-- Minimum Quantity Standard -->
        <td class="py-3 px-4 text-xs font-bold text-slate-700">
          ${p.minQty || 1} ${p.unit || 'KG'} (Standard)
        </td>

        <!-- Stock Count -->
        <td class="py-3 px-4 text-xs font-mono text-slate-600">
          ${p.stock || 0} ${p.unit || 'KG'}
        </td>

        <!-- Stock Availability Toggle -->
        <td class="py-3 px-4">
          <button onclick="toggleProductStock('${p.id}')" 
                  class="cursor-pointer transition-transform active:scale-95" 
                  title="Click to toggle status">
            ${Utils.getStatusBadge(p.status || 'available')}
          </button>
        </td>

        <!-- Actions -->
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1">
            <button onclick="openEditProductModal('${p.id}')" 
                    class="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100" 
                    title="Edit Product Details">
              <span class="material-symbols-outlined text-base">edit</span>
            </button>
            <button onclick="deleteProductPrompt('${p.id}')" 
                    class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50" 
                    title="Delete Product">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Save Daily Price Update
 */
async function saveDailyPrice(productId) {
  const priceInput = document.getElementById(`price-input-${productId}`);
  if (!priceInput) return;

  const newPrice = parseFloat(priceInput.value);
  if (isNaN(newPrice) || newPrice <= 0) {
    Utils.showToast('Please enter a valid price.', 'error');
    return;
  }

  const prod = allAdminProducts.find(p => p.id === productId);
  if (!prod) return;

  prod.price = newPrice;

  if (window.ProductStorage) {
    window.ProductStorage.upsert(prod);
  }

  if (window.FirebaseApp && window.FirebaseApp.isReady()) {
    await window.FirebaseApp.updateProduct(productId, { ...prod, price: newPrice });
  }

  Utils.showToast(`Updated price for ${prod.name} to ₹${newPrice}/KG ✓`, 'success');
}

/**
 * Toggle stock status between 'available' and 'out_of_stock'
 */
async function toggleProductStock(productId) {
  const prod = allAdminProducts.find(p => p.id === productId);
  if (!prod) return;

  const nextStatus = prod.status === 'available' ? 'out_of_stock' : 'available';
  prod.status = nextStatus;
  prod.isActive = nextStatus !== 'inactive';

  if (window.ProductStorage) {
    window.ProductStorage.upsert(prod);
  }

  if (window.FirebaseApp && window.FirebaseApp.isReady()) {
    await window.FirebaseApp.updateProduct(productId, { ...prod, status: nextStatus, isActive: prod.isActive });
  }

  Utils.showToast(`${prod.name} marked as ${nextStatus === 'available' ? 'Available' : 'Out of Stock'}`, 'info');
  renderAdminProductsTable();
}

/**
 * Open Add/Edit Product Modal
 */
function openProductModal(productId = null) {
  const modal = document.getElementById('product-form-modal');
  const modalTitle = document.getElementById('product-modal-title');
  const form = document.getElementById('product-upsert-form');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('edit-product-id').value = productId || '';

  if (productId) {
    const prod = allAdminProducts.find(p => p.id === productId);
    if (prod) {
      modalTitle.textContent = `Edit Vegetable: ${prod.name}`;
      document.getElementById('prod-name').value = prod.name || '';
      document.getElementById('prod-category').value = prod.category || 'everyday';
      document.getElementById('prod-price').value = prod.price || '';
      document.getElementById('prod-stock').value = prod.stock || 100;
      document.getElementById('prod-description').value = prod.description || '';
      document.getElementById('prod-image-url').value = prod.imageUrl || '';
      document.getElementById('prod-status').value = prod.status || 'available';

      const displayImg = getAdminDisplayImageUrl(prod.imageUrl);
      updateImagePreview(displayImg, prod.name, 'Existing Image');
    }
  } else {
    modalTitle.textContent = 'Add New Fresh Vegetable';
    document.getElementById('prod-category').value = 'everyday';
    document.getElementById('prod-status').value = 'available';
    document.getElementById('prod-stock').value = '500';
    updateImagePreview('../images/farm_fresh_media_01.jpeg', 'Default Produce Harvest', 'Ready');
  }

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeProductModal() {
  const modal = document.getElementById('product-form-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

/**
 * Handle Add/Edit Product Form Submit
 */
async function handleProductFormSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('edit-product-id').value;
  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const price = parseFloat(document.getElementById('prod-price').value) || 0;
  const stock = parseInt(document.getElementById('prod-stock').value, 10) || 0;
  const description = document.getElementById('prod-description').value.trim();
  let imageUrl = document.getElementById('prod-image-url').value.trim();
  const status = document.getElementById('prod-status').value;

  // Handle Cloudinary Image File Upload if selected
  const fileInput = document.getElementById('prod-image-file');
  if (fileInput && fileInput.files.length > 0 && window.CloudinaryService) {
    Utils.showToast('Uploading image to Cloudinary...', 'info');
    const uploadedUrl = await window.CloudinaryService.uploadImage(fileInput.files[0]);
    if (uploadedUrl) {
      imageUrl = uploadedUrl;
    }
  }

  // Normalize image URL for multi-page compatibility
  if (!imageUrl) {
    imageUrl = 'images/farm_fresh_media_01.jpeg';
  } else if (imageUrl.startsWith('../images/')) {
    imageUrl = imageUrl.replace('../', '');
  }

  const payload = {
    name,
    slug: Utils.slugify(name),
    category,
    price,
    unit: 'KG',
    minQty: 1,
    stock,
    description,
    imageUrl,
    status,
    isActive: status !== 'inactive'
  };

  if (editId) {
    // Update
    payload.id = editId;

    if (window.ProductStorage) {
      window.ProductStorage.upsert(payload);
    }

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.updateProduct(editId, payload);
    }

    const idx = allAdminProducts.findIndex(p => p.id === editId);
    if (idx > -1) {
      allAdminProducts[idx] = { ...allAdminProducts[idx], ...payload };
    } else {
      allAdminProducts.unshift(payload);
    }

    Utils.showToast(`Updated ${name} successfully! ✓`, 'success');
  } else {
    // Create
    const newDocId = `prod_${Date.now()}`;
    payload.id = newDocId;

    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      const firestoreId = await window.FirebaseApp.addProduct(payload);
      if (firestoreId) {
        payload.id = firestoreId;
      }
    }

    if (window.ProductStorage) {
      window.ProductStorage.upsert(payload);
    }

    allAdminProducts.unshift(payload);
    Utils.showToast(`Added ${name} to catalogue! ✓`, 'success');
  }

  closeProductModal();
  renderAdminProductsTable();
}

/**
 * Delete product with confirmation
 */
async function deleteProductPrompt(productId) {
  const prod = allAdminProducts.find(p => p.id === productId);
  if (!prod) return;

  if (!confirm(`Are you sure you want to delete "${prod.name}" from the catalogue?`)) return;

  if (window.ProductStorage) {
    window.ProductStorage.delete(productId);
  }

  if (window.FirebaseApp && window.FirebaseApp.isReady()) {
    await window.FirebaseApp.deleteProduct(productId);
  }

  allAdminProducts = allAdminProducts.filter(p => p.id !== productId);
  Utils.showToast(`Deleted ${prod.name}`, 'info');
  renderAdminProductsTable();
}

window.filterAdminCategory = filterAdminCategory;
window.saveDailyPrice = saveDailyPrice;
window.toggleProductStock = toggleProductStock;
window.openProductModal = openProductModal;
window.openEditProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.handleProductFormSubmit = handleProductFormSubmit;
window.deleteProductPrompt = deleteProductPrompt;
window.openFirebaseKeyModal = openFirebaseKeyModal;
window.closeFirebaseKeyModal = closeFirebaseKeyModal;
window.saveFirebaseApiKeyFromModal = saveFirebaseApiKeyFromModal;
window.updateConnectionStatus = updateConnectionStatus;
window.clearImagePreview = clearImagePreview;
window.seedDefaultProduceToDatabase = seedDefaultProduceToDatabase;
window.updateImagePreview = updateImagePreview;
