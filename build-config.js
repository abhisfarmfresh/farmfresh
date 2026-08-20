/**
 * Abhis Farm Fresh — Cloudflare Pages Build Script
 * Generates js/firebase-config.js and js/cloudinary.config.js from secure Environment Variables
 * This keeps GitHub 100% clean with NO secrets committed to git.
 */

const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'js');
if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
}

// 1. Read Firebase Environment Variables (with safe fallbacks)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY_HERE",
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

const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

window.FirebaseService = {
  isConfigured() {
    return firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY_HERE";
  },
  
  init() {
    if (typeof firebase !== 'undefined' && this.isConfigured()) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        window.firebaseAuth = firebase.auth();
        window.firebaseDb = firebase.firestore();
        console.log("🔥 Live Firebase initialized for project:", firebaseConfig.projectId);
      } catch (err) {
        console.warn("Firebase Init Warning:", err);
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
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || "abhisfarmfresh",
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
