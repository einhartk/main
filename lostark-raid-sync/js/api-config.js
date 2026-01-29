// Lost Ark API Configuration
const LOSTARK_API_CONFIG = {
    API_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IktYMk40TkRDSTJ5NTA5NWpjTWk5TllqY2lyZyIsImtpZCI6IktYMk40TkRDSTJ5NTA5NWpjTWk5TllqY2lyZyJ9.eyJpc3MiOiJodHRwczovL2x1ZHkuZ2FtZS5vbnN0b3ZlLmNvbSIsImF1ZCI6Imh0dHBzOi8vbHVkeS5nYW1lLm9uc3RvdmUuY29tL3Jlc291cmNlcyIsImNsaWVudF9pZCI6IjEwMDAwMDAwMDAwMzQwMjIifQ.TNUS-gfI_XbJH3Ino0cxYGwp7Fo-O0hpkfyjTnkWOHv-T7YNgC7-QjXtNBkDzqDI9r4DWZEnwdHoLo0_WzQ7JRZDFXhIiKHlDYEG-Z1EOV6OcmGVrZzff5cMDprTkrhhj8GW0a2flcB5V_HSXjlV_EG6OVfT5He2nI2OcHTvmifaOveTBhPWzzmZDp8I-H7ObbmaRzwz7DkUcYY5Ay9rhcyZllydsz359fFxVone01VN-iQIlKwTkKLnWBUivcRmKxRp2xeCadYzYJN4tK-h0BFL_UZnzVqG_hbqM3vvlRPk6BtMdBnji5StfBExKesbtnHpF14SExpJt3nDdSjwSw', // 여기에 실제 API 키를 입력하세요
    BASE_URL: 'https://developer-lostark.game.onstove.com'
};

// API 키 런타임 업데이트를 위한 헬퍼
function setLostArkApiKey(key) {
    LOSTARK_API_CONFIG.API_KEY = key;
}

// 헤더 설정 함수 (서버가 기대하는 케이스/헤더를 함께 보냄)
function getLostArkHeaders() {
    const key = LOSTARK_API_CONFIG.API_KEY || '';
    const headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    };

    if (key && !key.includes('YOUR_API_KEY')) {
        // 몇몇 API는 Authorization: Bearer <token> 을 요구하고
        // 일부 프록시/엔드포인트는 x-api-key 를 요구하기도 합니다. 둘 다 포함합니다.
        headers['Authorization'] = `Bearer ${key}`;
        headers['x-api-key'] = key;
    }

    return headers;
}

// 간단한 검증 유틸
function isLostArkApiKeyConfigured() {
    const k = LOSTARK_API_CONFIG.API_KEY || '';
    return k.trim() !== '' && !k.includes('YOUR_API_KEY');
}

// API 엔드포인트
const ENDPOINTS = {
    CHARACTERS: '/characters',
    ARMORIES: '/armories/characters'
};

// Firebase Configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD712QGC5Ol5E0rGsqvo4rCOVymxiY1wZo",
  authDomain: "rrrwiki-34d77.firebaseapp.com",
  databaseURL: "https://rrrwiki-34d77-default-rtdb.firebaseio.com",
  projectId: "rrrwiki-34d77",
  storageBucket: "rrrwiki-34d77.firebasestorage.app",
  messagingSenderId: "694359026181",
  appId: "1:694359026181:web:1fb05ad9979df3e1b84a6c"
};

// Firebase 초기화
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

// Firebase 서비스 참조
const realtimeDB = firebase.database();
const firestoreDB = firebase.firestore();
window.db = firestoreDB; // 전역 변수로 설정

console.log('Firebase initialized:', firebase.app().name);
