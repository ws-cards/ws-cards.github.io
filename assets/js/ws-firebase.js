/**
 * WS-Cards Firebase Auth + Firestore 輕量封裝（compat SDK）。
 * 依賴：firebase-app-compat / auth-compat，以及 window.WS_FIREBASE_CONFIG
 * firestore-compat 可選：僅 save/loadCountingState 需要。
 */
(function (global) {
  "use strict";

  var SESSION_DOC = "default";
  var COLLECTION_USERS = "users";
  var COLLECTION_SESSIONS = "countingSessions";

  function isConfigured(cfg) {
    if (!cfg || typeof cfg !== "object") return false;
    var required = ["apiKey", "authDomain", "projectId", "appId"];
    for (var i = 0; i < required.length; i++) {
      var v = String(cfg[required[i]] || "");
      if (!v || v.indexOf("YOUR_") === 0) return false;
    }
    return true;
  }

  function sessionRef(db, uid) {
    return db
      .collection(COLLECTION_USERS)
      .doc(uid)
      .collection(COLLECTION_SESSIONS)
      .doc(SESSION_DOC);
  }

  function createDisabledApi(reason) {
    return {
      ready: false,
      firestoreReady: false,
      reason: reason || "Firebase 尚未設定",
      auth: null,
      db: null,
      currentUser: function () { return null; },
      onAuth: function (cb) {
        if (typeof cb === "function") cb(null);
        return function () {};
      },
      signInWithGoogle: function () {
        return Promise.reject(new Error(reason || "Firebase 尚未設定"));
      },
      signOut: function () { return Promise.resolve(); },
      loadCountingState: function () { return Promise.resolve(null); },
      saveCountingState: function () { return Promise.resolve(false); }
    };
  }

  function init() {
    var cfg = global.WS_FIREBASE_CONFIG;
    if (!isConfigured(cfg)) {
      return createDisabledApi("請在 assets/js/firebase-config.js 填入 Firebase 設定");
    }
    if (typeof global.firebase === "undefined") {
      return createDisabledApi("Firebase SDK 未載入");
    }
    if (!firebase.auth) {
      return createDisabledApi("Firebase Auth SDK 未載入");
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
    } catch (e) {
      return createDisabledApi((e && e.message) || "Firebase 初始化失敗");
    }

    var auth = firebase.auth();
    var db = null;
    if (typeof firebase.firestore === "function") {
      try {
        db = firebase.firestore();
      } catch (e) {
        db = null;
      }
    }

    function requireDb() {
      if (!db) {
        return Promise.reject(new Error("Firebase Firestore SDK 未載入"));
      }
      return null;
    }

    return {
      ready: true,
      firestoreReady: !!db,
      reason: "",
      auth: auth,
      db: db,
      currentUser: function () {
        return auth.currentUser;
      },
      onAuth: function (cb) {
        return auth.onAuthStateChanged(function (user) {
          if (typeof cb === "function") cb(user);
        });
      },
      signInWithGoogle: function () {
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        return auth.signInWithPopup(provider);
      },
      signOut: function () {
        return auth.signOut();
      },
      loadCountingState: function () {
        var missing = requireDb();
        if (missing) return missing;
        var user = auth.currentUser;
        if (!user) return Promise.resolve(null);
        return sessionRef(db, user.uid)
          .get()
          .then(function (snap) {
            if (!snap.exists) return null;
            var data = snap.data() || {};
            return data.state && data.state.zones ? data.state : null;
          });
      },
      saveCountingState: function (state) {
        var missing = requireDb();
        if (missing) return missing;
        var user = auth.currentUser;
        if (!user || !state || !state.zones) return Promise.resolve(false);
        var payload = {
          state: state,
          updatedAt: state.updatedAt || Date.now(),
          syncedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return sessionRef(db, user.uid)
          .set(payload, { merge: true })
          .then(function () { return true; });
      }
    };
  }

  global.WsFirebase = init();
})(window);
