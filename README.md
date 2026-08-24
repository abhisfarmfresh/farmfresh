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
- **Deployment**: Cloudflare Pages / Static Hosting

---

## 📁 Project Structure

```text
Farm Fresh/
├── index.html                    # Customer Homepage (Hero, Category filters, Products & WhatsApp CTAs)
├── products.html                 # Complete Vegetable Catalogue with search, sort & 1 KG MOQ steppers
├── cart.html                     # Persistent Shopping Cart with subtotal & grand total calculation
├── checkout.html                 # Customer & business info collection + Firestore order creation
├── order-success.html            # Order confirmation summary + WhatsApp order dispatcher
├── about.html                    # Farm sourcing standards & 5 AM morning picking & shipping
├── contact.html                  # Phone (6380710362), WhatsApp & Instagram (@abhisfarmfresh)
├── css/
│   ├── global.css                # Design tokens & color system
│   ├── components.css            # Cards, steppers, buttons, chips, modals
│   └── responsive.css            # Breakpoints (mobile-first)
├── js/
│   ├── app.js                    # Global nav highlighter & fallback dataset
│   ├── products.js               # Catalogue fetching, search & filtering
│   ├── cart.js                   # LocalStorage cart state & strict MOQ = 1 KG validation
│   ├── checkout.js               # Form validation & Firestore order creation
│   └── order-success.js          # Order summary & WhatsApp message generator
│
├── admin/                        # Dedicated Admin CRM Operations Application
│   ├── login.html                # Secure admin login (Firebase Auth / session guard)
│   ├── index.html                # Executive Dashboard with Current Month date filter & KPIs
│   ├── orders.html               # Orders inspection modal, WhatsApp messaging, confirm/reject
│   ├── products.html             # Vegetable CRUD & Quick Daily Price Update inline editor
│   ├── customers.html            # Customer accounts directory & lifetime spend metrics
│   ├── css/
│   │   └── admin.css             # Admin dashboard dark sidebar & table layout
│   └── js/
│       ├── admin-auth.js         # Authentication guard & route protection
│       ├── admin-dashboard.js    # Dashboard stats & month date filter calculations
│       ├── admin-orders.js       # Order status filtering & modal inspector
│       ├── admin-products.js     # Product CRUD & daily price update logic
│       └── admin-customers.js    # Customer directory & history
│
├── shared/                       # Shared modules
│   └── js/
│       ├── config.js             # Brand constants (phone, WhatsApp, order prefix)
│       ├── firebase-init.js      # Central Firebase app, Firestore & Auth CRUD helper
│       ├── validation.js         # Form validation rules & inline error renderer
│       ├── whatsapp.js           # WhatsApp message formatter & encoder
│       └── utils.js              # Currency formatters, date formatters, toasts, skeletons
│
├── images/                       # Logo and produce media
├── firestore.rules               # Firestore security rules
├── robots.txt                    # Search crawler rules (blocks /admin/)
├── sitemap.xml                   # XML Sitemap for SEO
├── build-config.js               # Cloudflare Pages build script for safe secret injection
├── wrangler.jsonc                # Cloudflare Wrangler configuration
└── .gitignore                    # Strict secrets hygiene protection
```

---

## 🚀 Running Locally

```bash
# Start a local static HTTP server
python3 -m http.server 8543

# Open Customer Website (Zero redirects)
http://localhost:8543/index.html

# Open Admin CRM Portal
http://localhost:8543/admin/login.html
```

---

## 🔐 Access & Support

- **Admin Login**: Requires registered administrator account via Firebase Authentication
- **WhatsApp Support**: `+91 6380710362`
- **Instagram**: `@abhisfarmfresh`