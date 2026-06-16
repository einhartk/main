import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js';

export function initFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyD712QGC5Ol5E0rGsqvo4rCOVymxiY1wZo",
    authDomain: "rrrwiki-34d77.firebaseapp.com",
    projectId: "rrrwiki-34d77",
    storageBucket: "rrrwiki-34d77.firebasestorage.app",
    messagingSenderId: "694359026181",
    appId: "1:694359026181:web:1fb05ad9979df3e1b84a6c",
    databaseURL: "https://rrrwiki-34d77-default-rtdb.firebaseio.com",
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const rdb = getDatabase(app);

  return { app, auth, db, rdb };
}

export async function loginWithGoogle(auth) {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function logout(auth) {
  await signOut(auth);
}

export function onAuth(auth, cb) {
  return onAuthStateChanged(auth, cb);
}
