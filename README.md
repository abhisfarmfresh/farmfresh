# Abhis Farm Fresh — Fresh Vegetable E-Commerce & B2B Ordering Platform

Premium fresh vegetables delivered to restaurants, hotels, catering businesses, retailers, and homes.

## 🌿 Tech Stack & Architecture

- **Customer Frontend**: HTML5, Modern CSS (Tailwind CDN + Vanilla CSS System), Modular Vanilla JavaScript
- **Admin CRM**: Desktop-first responsive dashboard with Firebase Auth, Order Verification & Product/Price CRUD
- **Database**: Google Firebase Firestore (`abhisfarmfresh-3e7d3`)
- **Authentication**: Firebase Authentication
- **Media CDN**: Cloudinary Unsigned Upload (Preset: `jpnbyoak`, Folder: `abhis/farmfresh`)
- **Messaging**: Pre-filled WhatsApp direct ordering (`6380710362`)
- **Transactional Emails**: EmailJS SDK integration for Order Confirmation & Rejection notifications

---

## 📁 Project Structure

```text
Farm Fresh/
├── index.html                    # Root redirect to customer/index.html
├── customer/                     # Complete Customer-Facing E-Commerce Application
│   ├── index.html                # Homepage with hero, categories, featured grid & mobile nav
│   ├── products.html             # Product catalogue with search, sort & MOQ 1 KG steppers
│   ├── cart.html                 # Persistent cart with subtotal & grand total calculation
│   ├── checkout.html             # Customer & business info collection + Firestore order creation
│   ├── order-success.html        # Order confirmation summary + WhatsApp order dispatcher
│   ├── about.html                # Farm sourcing standards & 5 AM morning delivery slots
│   ├── contact.html              # Phone (6380710362), WhatsApp & Instagram (@abhisfarmfresh)
│   ├── css/
│   │   ├── global.css            # Design tokens & color system
│   │   ├── components.css        # Cards, steppers, buttons, chips, modals
│   │   └── responsive.css        # Breakpoints (mobile-first)
│   └── js/
│       ├── app.js                # Global nav highlighter & fallback dataset
│       ├── products.js           # Catalogue fetching, search & filtering
│       ├── cart.js               # LocalStorage cart state & strict MOQ = 1 KG validation
│       ├── checkout.js           # Form validation & Firestore order creation
│       └── order-success.js      # Order summary & WhatsApp message generator
│
├── admin/                        # Dedicated Admin CRM Operations Application
│   ├── login.html                # Secure admin login (Firebase Auth / session guard)
│   ├── index.html                # Executive Dashboard with 5 KPI metrics & recent orders
│   ├── orders.html               # Orders inspection, confirmation & rejection workflows
│   ├── products.html             # Vegetable CRUD & Quick Daily Price Update inline editor
│   ├── customers.html            # Customer accounts directory & lifetime spend metrics
│   ├── css/
│   │   └── admin.css             # Admin dashboard dark sidebar & table layout
│   └── js/
│       ├── admin-auth.js         # Authentication guard & route protection
│       ├── admin-dashboard.js    # Dashboard stats calculation
│       ├── admin-orders.js       # Order status filtering & modal inspector
│       ├── admin-products.js     # Product CRUD & daily price update logic
│       └── admin-customers.js    # Customer directory & history
│
├── shared/                       # Shared modules
│   ├── js/
│   │   ├── config.js             # Brand constants (phone, WhatsApp, order prefix)
│   │   ├── firebase-init.js      # Central Firebase app, Firestore & Auth CRUD helper
│   │   ├── validation.js         # Form validation rules & inline error renderer
│   │   ├── whatsapp.js           # WhatsApp message formatter & encoder
│   │   ├── utils.js              # Currency formatters, date formatters, toasts, skeletons
│   │   └── emailjs.js            # EmailJS transactional email sender
│   └── config/
│       └── emailjs.config.example.js
│
├── js/
│   ├── firebase-config.js        # 🔒 Real Firebase keys (gitignored)
│   ├── firebase-config.example.js# Committed template
│   ├── cloudinary.config.js      # 🔒 Real Cloudinary config (gitignored)
│   └── cloudinary.config.example.js
│
├── images/                       # Logo and produce media
├── firestore.rules               # Firestore security rules
├── robots.txt                    # Search crawler rules (blocks /admin/)
├── sitemap.xml                   # XML Sitemap for SEO
└── .gitignore                    # Secrets hygiene protection
```

---

## 🚀 Running Locally

```bash
# Start a local static HTTP server
python3 -m http.server 8543

# Open Customer Website
http://localhost:8543/customer/index.html

# Open Admin CRM Portal
http://localhost:8543/admin/login.html
```

---

## 🔐 Credentials & Access

- **Admin Login**: `admin@abhisfarmfresh.com` / `admin123` (or any Firebase Auth registered user)
- **WhatsApp Support**: `+91 6380710362`
- **Instagram**: `@abhisfarmfresh`