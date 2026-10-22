/**
 * Abhis Farm Fresh — Cloudflare Pages Build Script
 * Generates js/firebase-config.js and js/cloudinary.config.js from secure Environment Variables
 * This keeps GitHub 100% clean with NO secrets committed to git.
 */

const fs = require('fs');
const path = require('path');

// Zero-dependency local .env and .env.local loader
function loadLocalEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
        console.log(`📄 Loaded local environment variables from ${file}`);
      } catch (err) {
        console.warn(`Could not read ${file}:`, err.message);
      }
    }
  }
}

loadLocalEnv();

const jsDir = path.join(__dirname, 'js');
if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
}

// 1. Read Firebase Environment Variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "abhisfarmfresh-3e7d3.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "abhisfarmfresh-3e7d3",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "abhisfarmfresh-3e7d3.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "763350925496",
  appId: process.env.FIREBASE_APP_ID || "1:763350925496:web:3750a3eee35a3d8085b44d",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-XEXNM98B50"
};

const firebaseConfigFileContent = `/**
 * Abhis Farm Fresh - Generated Firebase Configuration
 * Generated automatically at build time from Cloudflare Environment Variables
 */

const baseFirebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

// Support dynamic override from localStorage for local dev without rebuilding
const savedLocalApiKey = (typeof localStorage !== 'undefined') ? localStorage.getItem('aff_firebase_api_key') : null;
const firebaseConfig = {
  ...baseFirebaseConfig,
  apiKey: (savedLocalApiKey || baseFirebaseConfig.apiKey || '').trim()
};

window.FirebaseService = {
  isConfigured() {
    return Boolean(firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('AIzaSyD-AbhisFarmFreshWebProd'));
  },
  
  init() {
    if (typeof firebase !== 'undefined') {
      if (this.isConfigured()) {
        try {
          if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
          }
          window.firebaseAuth = firebase.auth();
          window.firebaseDb = firebase.firestore();
          console.log("🔥 Live Firebase initialized for project:", firebaseConfig.projectId);
        } catch (err) {
          console.error("Firebase Init Error:", err);
        }
      } else {
        console.log("⚡ Firebase Web API Key is not set; operating in direct high-performance Firestore REST mode.");
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.FirebaseService.init();
});
`;

fs.writeFileSync(path.join(jsDir, 'firebase-config.js'), firebaseConfigFileContent, 'utf8');
console.log('✅ Successfully generated js/firebase-config.js from environment variables');

// 2. Read Cloudinary Environment Variables
const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || "jpnbyoak",
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "jpnbyoak",
  folder: process.env.CLOUDINARY_FOLDER || "abhis/farmfresh"
};

const cloudinaryConfigFileContent = `/**
 * Abhis Farm Fresh - Generated Cloudinary Upload Service
 */

const CLOUDINARY_CONFIG = ${JSON.stringify(cloudinaryConfig, null, 2)};

window.CloudinaryService = {
  async uploadImage(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
    formData.append("folder", CLOUDINARY_CONFIG.folder);

    try {
      const res = await fetch(\`https://api.cloudinary.com/v1_1/\${CLOUDINARY_CONFIG.cloudName}/image/upload\`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        console.log("☁️ Image uploaded to Cloudinary:", data.secure_url);
        return data.secure_url;
      } else {
        console.warn("Cloudinary Response:", data);
        return null;
      }
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      return null;
    }
  }
};
`;

fs.writeFileSync(path.join(jsDir, 'cloudinary.config.js'), cloudinaryConfigFileContent, 'utf8');
console.log('✅ Successfully generated js/cloudinary.config.js from environment variables');
