/**
 * Abhis Farm Fresh - Admin Product & Daily Price Controller
 * Full CRUD, quick daily price editing, stock status toggling, and Cloudinary image upload
 */

let allAdminProducts = [];
let activeAdminCategory = 'all';
let currentProductSearch = '';

document.addEventListener('DOMContentLoaded', async () => {
  setupProductSearch();
  await loadAdminProducts();
});

function setupProductSearch() {
  const searchInput = document.getElementById('product-admin-search');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      currentProductSearch = e.target.value.toLowerCase().trim();
      renderAdminProductsTable();
    }, 200));
  }
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

async function loadAdminProducts() {
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="admin-loading">Fetching vegetable products...</td></tr>`;

  try {
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      allAdminProducts = await window.FirebaseApp.getAllProducts();
    }
  } catch (err) {
    console.warn('Error fetching products from Firestore:', err);
  }

  if (!allAdminProducts || allAdminProducts.length === 0) {
    allAdminProducts = window.DEFAULT_PRODUCTS ? [...window.DEFAULT_PRODUCTS] : [];
  }

  renderAdminProductsTable();
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
      p.name.toLowerCase().includes(currentProductSearch) ||
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
          <div class="text-xs text-slate-400 mt-0.5">Click "+ Add Vegetable" to create your first product.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isAvailable = p.status === 'available';

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors" id="row-${p.id}">
        <!-- Thumbnail & Name -->
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${p.imageUrl}" 
                 alt="${Utils.escapeHtml(p.name)}" 
                 onerror="this.src='../images/farm_fresh_media_01.jpeg'"
                 class="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200">
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
          1 ${p.unit || 'KG'} (Standard)
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
  if (prod) {
    prod.price = newPrice;
  }

  if (window.FirebaseApp && window.FirebaseApp.isReady()) {
    await window.FirebaseApp.updateProduct(productId, { price: newPrice });
  }

  Utils.showToast(`Updated price for ${prod?.name || 'product'} to ₹${newPrice}/KG ✓`, 'success');
}

/**
 * Toggle stock status between 'available' and 'out_of_stock'
 */
async function toggleProductStock(productId) {
  const prod = allAdminProducts.find(p => p.id === productId);
  if (!prod) return;

  const nextStatus = prod.status === 'available' ? 'out_of_stock' : 'available';
  prod.status = nextStatus;

  if (window.FirebaseApp && window.FirebaseApp.isReady()) {
    await window.FirebaseApp.updateProduct(productId, { status: nextStatus });
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
    }
  } else {
    modalTitle.textContent = 'Add New Fresh Vegetable';
    document.getElementById('prod-category').value = 'everyday';
    document.getElementById('prod-status').value = 'available';
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

  if (!imageUrl) {
    imageUrl = '../images/farm_fresh_media_01.jpeg';
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
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      await window.FirebaseApp.updateProduct(editId, payload);
    }
    const idx = allAdminProducts.findIndex(p => p.id === editId);
    if (idx > -1) allAdminProducts[idx] = { id: editId, ...payload };
    Utils.showToast(`Updated ${name} successfully!`, 'success');
  } else {
    // Create
    let newDocId = `prod_${Date.now()}`;
    if (window.FirebaseApp && window.FirebaseApp.isReady()) {
      newDocId = await window.FirebaseApp.addProduct(payload);
    }
    allAdminProducts.unshift({ id: newDocId, ...payload });
    Utils.showToast(`Added ${name} to catalogue!`, 'success');
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
