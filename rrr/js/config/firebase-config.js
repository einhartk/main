// Firebase 초기화
const firebaseConfig = {
  apiKey: "", //AIzaSyD712QGC5Ol5E0rGsqvo4rCOVymxiY1wZo
  authDomain: "rrrwiki-34d77.firebaseapp.com",
  projectId: "rrrwiki-34d77",
  storageBucket: "rrrwiki-34d77.firebasestorage.app",
  messagingSenderId: "694359026181",
  appId: "1:694359026181:web:1fb05ad9979df3e1b84a6c"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
