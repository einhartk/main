// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyD712QGC5Ol5E0rGsqvo4rCOVymxiY1wZo",
  authDomain: "rrrwiki-34d77.firebaseapp.com",
  projectId: "rrrwiki-34d77",
  storageBucket: "rrrwiki-34d77.firebasestorage.app",
  messagingSenderId: "694359026181",
  appId: "1:694359026181:web:1fb05ad9979df3e1b84a6c"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!window.firebaseInitialized) {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
  
  // Set a flag to prevent reinitialization
  window.firebaseInitialized = true;
  
  // Initialize Firestore and make it globally available
  if (!window.db) {
    window.db = firebase.firestore();
  }
  
  // Dispatch ready event when everything is set up
  document.dispatchEvent(new CustomEvent('firebaseReady'));
}

// Export the db for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { db: window.db };
}
