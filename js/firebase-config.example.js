/**
 * Abhis Farm Fresh - Firebase Configuration Template
 * 
 * Instructions:
 * 1. Copy this file and rename it to 'firebase-config.js' (located in js/firebase-config.js)
 * 2. Replace the placeholder values below with your actual Firebase Project keys from:
 *    Firebase Console -> Project Settings -> General -> Your Apps -> Web App
 * 3. Include 'js/firebase-config.js' in your HTML files before 'js/app.js'
 */

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "abhisfarmfresh.firebaseapp.com",
  projectId: "abhisfarmfresh",
  storageBucket: "abhisfarmfresh.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase App & Services
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  window.firebaseAuth = firebase.auth();
  window.firebaseDb = firebase.firestore();
  console.log("Firebase initialized successfully.");
}
