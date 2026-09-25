/**
 * WS-Cards Firebase Auth + Firestore 輕量封裝（compat SDK）。
 * 依賴：firebase-app-compat / auth-compat，以及 window.WS_FIREBASE_CONFIG
 * firestore-compat 可選：counting / profile / cardFavorites 讀寫需要。
 */
(function (global) {
  "use strict";

  var SESSION_DOC = "default";
  var COLLECTION_USERS = "users";
  var COLLECTION_SESSIONS = "countingSessions";
  var COLLECTION_FAVORITES = "cardFavorites";

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

  function profileRef(db, uid) {
    return db.collection(COLLECTION_USERS).doc(uid);
  }

  function favoritesCol(db, uid) {
    return db
      .collection(COLLECTION_USERS)
      .doc(uid)
      .collection(COLLECTION_FAVORITES);
  }

  /** 卡號 → Firestore doc id（不可含 /） */
  function favoriteCardId(cardNumber) {
    return String(cardNumber || "")
      .trim()
      .replace(/\//g, "_")
      .replace(/[.#$\[\]]/g, "_");
  }

  function normalizeFavoriteMeta(meta) {
    if (!meta || typeof meta !== "object") return null;
    var cardNumber = String(meta.cardNumber || "").trim();
    if (!cardNumber) return null;
    function text(v) {
      if (v === null || v === undefined) return "";
      var t = String(v).trim();
      return t === "-" || t === "?" ? "" : t;
    }
    var ts = typeof meta.timestamp === "number" ? meta.timestamp : Date.now();
    return {
      cardNumber: cardNumber,
      cardName: text(meta.cardName),
      cardRare: text(meta.cardRare),
      cardTitle: text(meta.cardTitle),
      source: text(meta.source) || "line",
      timestamp: ts
    };
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
      saveCountingState: function () { return Promise.resolve(false); },
      loadUserProfile: function () { return Promise.resolve(null); },
      saveUserProfile: function () { return Promise.resolve(false); },
      ensureUserProfile: function () { return Promise.resolve(null); },
      favoriteCardId: favoriteCardId,
      loadCardFavorites: function () { return Promise.resolve([]); },
      addCardFavorite: function () { return Promise.resolve(false); },
      removeCardFavorite: function () { return Promise.resolve(false); }
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

    function authBasics(user) {
      return {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || ""
      };
    }

    function profileFromSnap(user, snap) {
      var base = authBasics(user);
      if (!snap || !snap.exists) {
        return {
          uid: user.uid,
          displayName: base.displayName,
          email: base.email,
          photoURL: base.photoURL,
          nickname: "",
          bio: "",
          createdAt: null,
          updatedAt: null
        };
      }
      var data = snap.data() || {};
      return {
        uid: user.uid,
        displayName: data.displayName != null ? data.displayName : base.displayName,
        email: data.email || base.email,
        photoURL: data.photoURL != null ? data.photoURL : base.photoURL,
        nickname: data.nickname || "",
        bio: data.bio || "",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
      };
    }

    function loadUserProfile() {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) return Promise.resolve(null);
      return profileRef(db, user.uid)
        .get()
        .then(function (snap) {
          return profileFromSnap(user, snap);
        });
    }

    function saveUserProfile(patch) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user || !patch || typeof patch !== "object") return Promise.resolve(false);

      var payload = {
        email: user.email || "",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (patch.displayName != null) payload.displayName = String(patch.displayName).trim();
      if (patch.photoURL != null) payload.photoURL = String(patch.photoURL).trim();
      if (patch.nickname != null) payload.nickname = String(patch.nickname).trim();
      if (patch.bio != null) payload.bio = String(patch.bio).trim().slice(0, 500);

      return profileRef(db, user.uid)
        .set(payload, { merge: true })
        .then(function () { return true; });
    }

    /** 首次進入時確保 users/{uid} 存在；盡量只 1 次讀取，避免多餘 get/set */
    function ensureUserProfile() {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) return Promise.resolve(null);
      var ref = profileRef(db, user.uid);
      var base = authBasics(user);
      return ref.get().then(function (snap) {
        if (!snap.exists) {
          var created = profileFromSnap(user, null);
          return ref
            .set({
              displayName: base.displayName,
              email: base.email,
              photoURL: base.photoURL,
              nickname: "",
              bio: "",
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true })
            .then(function () { return created; });
        }

        var data = snap.data() || {};
        var profile = profileFromSnap(user, snap);
        var patch = {};
        var need = false;
        if (base.email && data.email !== base.email) {
          patch.email = base.email;
          need = true;
        }
        if (!data.displayName && base.displayName) {
          patch.displayName = base.displayName;
          need = true;
        }
        if (!data.photoURL && base.photoURL) {
          patch.photoURL = base.photoURL;
          need = true;
        }
        if (!need) return profile;

        patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        return ref.set(patch, { merge: true }).then(function () {
          return {
            uid: profile.uid,
            displayName: patch.displayName != null ? patch.displayName : profile.displayName,
            email: patch.email != null ? patch.email : profile.email,
            photoURL: patch.photoURL != null ? patch.photoURL : profile.photoURL,
            nickname: profile.nickname,
            bio: profile.bio,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt
          };
        });
      });
    }

    function timestampToMillis(value) {
      if (typeof value === "number" && isFinite(value)) return value;
      if (value && typeof value.toMillis === "function") {
        try { return value.toMillis(); } catch (e) { return 0; }
      }
      if (value && typeof value.seconds === "number") {
        return value.seconds * 1000;
      }
      return 0;
    }

    function favoriteFromDoc(docSnap) {
      var data = (docSnap && docSnap.data) ? (docSnap.data() || {}) : {};
      var cardNumber = String(data.cardNumber || "").trim();
      if (!cardNumber && docSnap && docSnap.id) {
        // 舊資料後備：doc id 可能是 BD_W54-070SSP
        cardNumber = String(docSnap.id).replace(/_/g, "/");
      }
      if (!cardNumber) return null;
      var ts = timestampToMillis(data.timestamp);
      if (!ts) ts = timestampToMillis(data.updatedAt);
      if (!ts) ts = timestampToMillis(data.createdAt);
      return {
        cardNumber: cardNumber,
        cardName: data.cardName || "",
        cardRare: data.cardRare || "",
        cardTitle: data.cardTitle || "",
        source: data.source || "line",
        timestamp: ts || Date.now()
      };
    }

    function loadCardFavorites() {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) return Promise.resolve([]);
      return favoritesCol(db, user.uid)
        .get()
        .then(function (snap) {
          var list = [];
          snap.forEach(function (docSnap) {
            var item = favoriteFromDoc(docSnap);
            if (item) list.push(item);
          });
          list.sort(function (a, b) {
            return (b.timestamp || 0) - (a.timestamp || 0);
          });
          return list;
        });
    }

    function addCardFavorite(meta) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      var item = normalizeFavoriteMeta(meta);
      if (!user || !item) return Promise.resolve(false);

      var ref = favoritesCol(db, user.uid).doc(favoriteCardId(item.cardNumber));
      var base = {
        cardNumber: item.cardNumber,
        cardName: item.cardName,
        cardRare: item.cardRare,
        cardTitle: item.cardTitle,
        source: item.source || "line",
        timestamp: item.timestamp || Date.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      return ref.get().then(function (snap) {
        if (snap.exists) {
          return ref.set(base, { merge: true }).then(function () { return true; });
        }
        base.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        return ref.set(base).then(function () { return true; });
      });
    }

    function removeCardFavorite(cardNumber) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      var id = favoriteCardId(cardNumber);
      if (!user || !id) return Promise.resolve(false);
      return favoritesCol(db, user.uid)
        .doc(id)
        .delete()
        .then(function () { return true; });
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
      },
      loadUserProfile: loadUserProfile,
      saveUserProfile: saveUserProfile,
      ensureUserProfile: ensureUserProfile,
      favoriteCardId: favoriteCardId,
      loadCardFavorites: loadCardFavorites,
      addCardFavorite: addCardFavorite,
      removeCardFavorite: removeCardFavorite
    };
  }

  global.WsFirebase = init();
})(window);
