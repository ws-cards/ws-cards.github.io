/**
 * WS-Cards Firebase Auth + Firestore 輕量封裝（compat SDK）。
 * 依賴：firebase-app-compat / auth-compat，以及 window.WS_FIREBASE_CONFIG
 * firestore-compat 可選：counting / profile 讀寫需要。
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

  function profileRef(db, uid) {
    return db.collection(COLLECTION_USERS).doc(uid);
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
      ensureUserProfile: function () { return Promise.resolve(null); }
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
      ensureUserProfile: ensureUserProfile
    };
  }

  global.WsFirebase = init();
})(window);
