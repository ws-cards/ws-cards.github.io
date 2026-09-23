/**
 * Firebase Web 設定（公開於前端，請搭配嚴格的 Firestore Rules）。
 * 尚未填入真實值時，countingDemoNew 會只使用本機 localStorage。
 * 範例見 firebase-config.example.js
 */
window.WS_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
