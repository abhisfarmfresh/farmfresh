/**
 * Abhis Farm Fresh - Customer App Global Controller
 * Manages navigation, header state, mobile bottom bar, and global helpers
 */

// Fallback products in case Firestore is not populated yet or offline
if (!window.DEFAULT_PRODUCTS || window.DEFAULT_PRODUCTS.length === 0) {
  window.DEFAULT_PRODUCTS = [
  {
    id: "prod_tomato",
    name: "Fresh Tomato",
    slug: "fresh-tomato",
    category: "everyday",
    description: "Firm, juicy hybrid tomatoes. Perfect for curries, gravies, salads and commercial kitchen prep. Grade A morning harvest.",
    imageUrl: "../images/farm_fresh_media_01.jpeg",
    price: 35,
    unit: "KG",
    minQty: 1,
    stock: 500,
    status: "available",
    isActive: true
  },
  {
    id: "prod_capsicum",
    name: "Green Capsicum",
    slug: "green-capsicum",
    category: "everyday",
    description: "Crisp, fresh bell peppers with thick walls. Ideal for stir-fries, stuffings, and continental gravies. Grade A quality.",
    imageUrl: "../images/farm_fresh_media_02.jpeg",
    price: 45,
    unit: "KG",
    minQty: 1,
    stock: 300,
    status: "available",
    isActive: true
  },
  {
    id: "prod_lettuce",
    name: "Butterhead Lettuce",
    slug: "butterhead-lettuce",
    category: "leafy",
    description: "Tender, buttery leaves with delicate crunch. Hydroponically grown fresh produce. Chef-grade salad base.",
    imageUrl: "../images/farm_fresh_media_03.jpeg",
    price: 120,
    unit: "KG",
    minQty: 1,
    stock: 80,
    status: "available",
    isActive: true
  },
  {
    id: "prod_onion",
    name: "Red Onion (Nasik)",
    slug: "red-onion",
    category: "everyday",
    description: "Premium Nasik red onions, medium to large size (55mm+). Essential kitchen staple with excellent shelf life.",
    imageUrl: "../images/farm_fresh_media_05.jpeg",
    price: 32,
    unit: "KG",
    minQty: 1,
    stock: 1000,
    status: "available",
    isActive: true
  },
  {
    id: "prod_spinach",
    name: "Baby Spinach",
    slug: "baby-spinach",
    category: "leafy",
    description: "Tender, farm-fresh baby spinach leaves. Rich in iron, crisp texture, washed and sorted for instant use.",
    imageUrl: "../images/farm_fresh_media_07.jpeg",
    price: 60,
    unit: "KG",
    minQty: 1,
    stock: 120,
    status: "available",
    isActive: true
  },
  {
    id: "prod_cucumber",
    name: "English Cucumber",
    slug: "english-cucumber",
    category: "everyday",
    description: "Crisp, thin-skinned English cucumbers from polyhouse cultivation. Perfect for salads, raita, and cold prep.",
    imageUrl: "../images/farm_fresh_media_10.jpeg",
    price: 36,
    unit: "KG",
    minQty: 1,
    stock: 400,
    status: "available",
    isActive: true
  },
  {
    id: "prod_sweetcorn",
    name: "Sweet Corn Cobs",
    slug: "sweet-corn",
    category: "seasonal",
    description: "Golden sweet corn cobs, shucked and freshly picked. High sugar content, ideal for continental soups and grilling.",
    imageUrl: "../images/farm_fresh_media_12.jpeg",
    price: 40,
    unit: "KG",
    minQty: 1,
    stock: 300,
    status: "available",
    isActive: true
  },
  {
    id: "prod_carrot",
    name: "Fresh Carrot",
    slug: "fresh-carrot",
    category: "root",
    description: "Sweet, crunchy orange carrots. Rich in beta-carotene, ideal for daily restaurant cooking and fresh juice bars.",
    imageUrl: "../images/farm_fresh_media_14.jpeg",
    price: 55,
    unit: "KG",
    minQty: 1,
    stock: 350,
    status: "available",
    isActive: true
  },
  {
    id: "prod_potato",
    name: "Fresh Potato",
    slug: "fresh-potato",
    category: "root",
    description: "Clean, firm medium-grade potatoes with smooth skin. Low sugar, high starch, versatile for curries and frying.",
    imageUrl: "../images/farm_fresh_media_15.jpeg",
    price: 28,
    unit: "KG",
    minQty: 1,
    stock: 800,
    status: "available",
    isActive: true
  },
  {
    id: "prod_chilli",
    name: "Green Chilli",
    slug: "green-chilli",
    category: "everyday",
    description: "Fresh, medium-hot green chillies. Sharp heat, bright green color, harvested daily for aromatic seasoning.",
    imageUrl: "../images/farm_fresh_media_17.jpeg",
    price: 80,
    unit: "KG",
    minQty: 1,
    stock: 100,
    status: "available",
    isActive: true
  },
  {
    id: "prod_basil",
    name: "Genovese Basil",
    slug: "genovese-basil",
    category: "exotic",
    description: "Authentic Italian sweet basil. Hydroponically grown for intense aroma and deep flavor in artisan pesto and sauces.",
    imageUrl: "../images/farm_fresh_media_09.jpeg",
    price: 240,
    unit: "KG",
    minQty: 1,
    stock: 40,
    status: "available",
    isActive: true
  },
  {
    id: "prod_broccoli",
    name: "Fresh Broccoli",
    slug: "broccoli",
    category: "exotic",
    description: "Dense, deep green broccoli crowns with tight florets. Premium grade, ideal for healthy gourmet dishes.",
    imageUrl: "../images/farm_fresh_media_20.jpeg",
    price: 90,
    unit: "KG",
    minQty: 1,
    stock: 150,
    status: "available",
    isActive: true
  }
];
}

document.addEventListener('DOMContentLoaded', () => {
  highlightActiveNav();
  if (window.Cart) {
    window.Cart.syncUI();
  }
});

/**
 * Automatically highlight the active navigation item
 */
function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  // Desktop links
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('text-emerald-800', 'font-extrabold');
      link.classList.remove('text-slate-700');
    }
  });

  // Mobile bottom navigation items
  document.querySelectorAll('.mobile-nav-item').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
