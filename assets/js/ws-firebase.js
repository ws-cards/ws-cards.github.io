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
  var COLLECTION_DECKS = "decks";
  var COLLECTION_DECKLOG_DATA = "decklogData";
  var COLLECTION_DECK_SHARES = "deckShares";
  var COLLECTION_AUCTIONS = "auctions";
  var COLLECTION_BIDS = "bids";
  var COLLECTION_AUCTION_ACTIVITY = "auctionActivity";

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

  function decksCol(db, uid) {
    return db
      .collection(COLLECTION_USERS)
      .doc(uid)
      .collection(COLLECTION_DECKS);
  }

  function decklogDataCol(db) {
    return db.collection(COLLECTION_DECKLOG_DATA);
  }

  function deckSharesCol(db) {
    return db.collection(COLLECTION_DECK_SHARES);
  }

  /** 卡號 → Firestore doc id（不可含 /） */
  function favoriteCardId(cardNumber) {
    return String(cardNumber || "")
      .trim()
      .replace(/\//g, "_")
      .replace(/[.#$\[\]]/g, "_");
  }

  /** DeckLog 代碼／牌組 id → 安全 doc id */
  function safeDocId(value) {
    return String(value || "")
      .trim()
      .replace(/\//g, "_")
      .replace(/[.#$\[\]]/g, "_")
      .slice(0, 700);
  }

  function clampDeckQty(n, max) {
    var q = parseInt(n, 10);
    if (isNaN(q) || q < 1) q = 1;
    if (q > (max || 99)) q = max || 99;
    return q;
  }

  function clampShortQty(shortQty, qty) {
    var n = parseInt(shortQty, 10);
    if (isNaN(n) || n < 0) n = 0;
    var max = Math.max(0, qty || 0);
    if (n > max) n = max;
    return n;
  }

  function normalizeDeckCard(entry) {
    if (!entry || typeof entry !== "object") return null;
    var cardNumber = String(entry.cardNumber || entry.cardNo || "")
      .trim()
      .replace(/\\/g, "/");
    if (!cardNumber) return null;
    var qty = clampDeckQty(entry.qty, 99);
    var out = { cardNumber: cardNumber, qty: qty };
    var name = String(entry.cardName || entry.name || "").trim();
    if (name && name !== "-" && name !== "?") out.cardName = name.slice(0, 80);
    var level = entry.level != null ? Number(entry.level) : NaN;
    if (!isNaN(level)) out.level = level;
    var shortQty = clampShortQty(entry.shortQty, qty);
    if (shortQty > 0) out.shortQty = shortQty;
    return out;
  }

  function normalizeDeckCards(cards) {
    var map = {};
    (Array.isArray(cards) ? cards : []).forEach(function (entry) {
      var card = normalizeDeckCard(entry);
      if (!card) return;
      if (map[card.cardNumber]) {
        map[card.cardNumber].qty = Math.min(
          99,
          map[card.cardNumber].qty + card.qty
        );
        map[card.cardNumber].shortQty = clampShortQty(
          Math.max(map[card.cardNumber].shortQty || 0, card.shortQty || 0),
          map[card.cardNumber].qty
        );
        if (!map[card.cardNumber].cardName && card.cardName) {
          map[card.cardNumber].cardName = card.cardName;
        }
        if (map[card.cardNumber].level == null && card.level != null) {
          map[card.cardNumber].level = card.level;
        }
      } else {
        map[card.cardNumber] = card;
      }
    });
    return Object.keys(map)
      .map(function (k) { return map[k]; })
      .sort(function (a, b) {
        return String(a.cardNumber).localeCompare(String(b.cardNumber));
      });
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
      removeCardFavorite: function () { return Promise.resolve(false); },
      safeDocId: safeDocId,
      loadUserDecks: function () { return Promise.resolve([]); },
      saveUserDeck: function () { return Promise.resolve(false); },
      deleteUserDeck: function () { return Promise.resolve(false); },
      findUserDeckByDecklogCode: function () { return Promise.resolve(null); },
      getDecklogData: function () { return Promise.resolve(null); },
      saveDecklogData: function () { return Promise.resolve(false); },
      makeDeckShareId: function () { return ""; },
      getShareIdFromLocation: function () { return ""; },
      getDeckShare: function () { return Promise.resolve(null); },
      saveDeckShare: function () { return Promise.resolve(null); },
      deleteDeckShare: function () { return Promise.resolve(false); },
      getAuctionIdFromLocation: function () { return ""; },
      watchAuction: function () { return function () {}; },
      placeBid: function () {
        return Promise.reject(new Error(reason || "Firebase 尚未設定"));
      },
      resolveBidderDisplayName: function () { return Promise.resolve(""); },
      createAuction: function () {
        return Promise.reject(new Error(reason || "Firebase 尚未設定"));
      },
      listMySellingAuctions: function () { return Promise.resolve([]); },
      listMyBiddingActivity: function () { return Promise.resolve([]); },
      closeAuction: function () {
        return Promise.reject(new Error(reason || "Firebase 尚未設定"));
      },
      makeAuctionId: function () { return ""; }
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

    function timestampToMillisDeck(value) {
      return timestampToMillis(value);
    }

    function deckFromDoc(docSnap) {
      if (!docSnap || !docSnap.exists) return null;
      var data = docSnap.data() || {};
      var id = String(data.id || docSnap.id || "").trim();
      if (!id) return null;
      var name = String(data.name || "").trim() || "未命名牌組";
      var tags = Array.isArray(data.tags)
        ? data.tags.map(function (t) { return String(t || "").trim(); }).filter(Boolean)
        : [];
      var cards = normalizeDeckCards(data.cards);
      var createdAt = timestampToMillisDeck(data.createdAt) || Date.now();
      var updatedAt = timestampToMillisDeck(data.updatedAt) || createdAt;
      var out = {
        id: id,
        name: name.slice(0, 40),
        tags: tags.slice(0, 20),
        cards: cards,
        createdAt: createdAt,
        updatedAt: updatedAt
      };
      var desc = String(data.deckDescription || "").trim();
      if (desc) out.deckDescription = desc.slice(0, 200);
      var code = String(data.decklogCode || "").trim();
      if (code) out.decklogCode = code;
      var source = String(data.source || "").trim();
      if (source === "decklog" || source === "manual") out.source = source;
      else if (code) out.source = "decklog";
      else out.source = "manual";
      if (code) {
        if (data.decklogDetached === true) out.decklogDetached = true;
        var fp = String(data.decklogImportFingerprint || "").trim();
        if (fp) out.decklogImportFingerprint = fp.slice(0, 4000);
      }
      var shareId = String(data.shareId || "").trim();
      if (shareId) out.shareId = shareId.slice(0, 40);
      var cover = String(data.coverCardNumber || "").trim().replace(/\\/g, "/");
      if (cover) out.coverCardNumber = cover.slice(0, 80);
      return out;
    }

    function serializeDeckForCloud(deck) {
      if (!deck || typeof deck !== "object") return null;
      var id = safeDocId(deck.id);
      if (!id) return null;
      var name = String(deck.name || "").trim() || "未命名牌組";
      var tags = Array.isArray(deck.tags)
        ? deck.tags.map(function (t) { return String(t || "").trim(); }).filter(Boolean)
        : [];
      var cards = normalizeDeckCards(deck.cards).map(function (c) {
        var row = { cardNumber: c.cardNumber, qty: c.qty };
        if (c.cardName) row.cardName = c.cardName;
        if (c.level != null) row.level = c.level;
        if (c.shortQty > 0) row.shortQty = c.shortQty;
        return row;
      });
      var payload = {
        id: id,
        name: name.slice(0, 40),
        tags: tags.slice(0, 20),
        cards: cards,
        source: deck.source === "decklog" ? "decklog" : "manual",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      var desc = String(deck.deckDescription || "").trim().slice(0, 200);
      if (desc) payload.deckDescription = desc;
      else payload.deckDescription = firebase.firestore.FieldValue.delete();
      var code = String(deck.decklogCode || "").trim();
      if (code) {
        payload.decklogCode = code;
        payload.source = "decklog";
        var fp = String(deck.decklogImportFingerprint || "").trim().slice(0, 4000);
        if (fp) payload.decklogImportFingerprint = fp;
        else payload.decklogImportFingerprint = firebase.firestore.FieldValue.delete();
        if (deck.decklogDetached === true) payload.decklogDetached = true;
        else payload.decklogDetached = firebase.firestore.FieldValue.delete();
      } else {
        payload.decklogCode = firebase.firestore.FieldValue.delete();
        payload.decklogImportFingerprint = firebase.firestore.FieldValue.delete();
        payload.decklogDetached = firebase.firestore.FieldValue.delete();
      }
      var shareId = String(deck.shareId || "").trim().slice(0, 40);
      if (shareId) payload.shareId = shareId;
      else payload.shareId = firebase.firestore.FieldValue.delete();
      var cover = String(deck.coverCardNumber || "").trim().replace(/\\/g, "/").slice(0, 80);
      if (cover) payload.coverCardNumber = cover;
      else payload.coverCardNumber = firebase.firestore.FieldValue.delete();
      if (typeof deck.createdAt === "number" && isFinite(deck.createdAt)) {
        payload.createdAt = deck.createdAt;
      }
      return { id: id, payload: payload };
    }

    function loadUserDecks() {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) return Promise.resolve([]);
      return decksCol(db, user.uid)
        .get()
        .then(function (snap) {
          var list = [];
          snap.forEach(function (docSnap) {
            var deck = deckFromDoc(docSnap);
            if (deck) list.push(deck);
          });
          list.sort(function (a, b) {
            return (b.updatedAt || 0) - (a.updatedAt || 0);
          });
          return list;
        });
    }

    function saveUserDeck(deck) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      var packed = serializeDeckForCloud(deck);
      if (!user || !packed) return Promise.resolve(false);
      var ref = decksCol(db, user.uid).doc(packed.id);
      return ref.get().then(function (snap) {
        var payload = packed.payload;
        if (!snap.exists && payload.createdAt == null) {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        return ref.set(payload, { merge: true }).then(function () { return true; });
      });
    }

    function deleteUserDeck(deckId) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      var id = safeDocId(deckId);
      if (!user || !id) return Promise.resolve(false);
      return decksCol(db, user.uid)
        .doc(id)
        .delete()
        .then(function () { return true; });
    }

    function findUserDeckByDecklogCode(decklogCode) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      var code = String(decklogCode || "").trim();
      if (!user || !code) return Promise.resolve(null);
      return decksCol(db, user.uid)
        .where("decklogCode", "==", code)
        .limit(1)
        .get()
        .then(function (snap) {
          if (snap.empty) return null;
          return deckFromDoc(snap.docs[0]);
        });
    }

    function getDecklogData(decklogCode) {
      var missing = requireDb();
      if (missing) return missing;
      var code = String(decklogCode || "").trim();
      var id = safeDocId(code);
      if (!id) return Promise.resolve(null);
      return decklogDataCol(db)
        .doc(id)
        .get()
        .then(function (snap) {
          if (!snap.exists) return null;
          var data = snap.data() || {};
          return {
            decklogCode: String(data.decklogCode || code).trim() || code,
            cards: normalizeDeckCards(data.cards).map(function (c) {
              var row = { cardNumber: c.cardNumber, qty: c.qty };
              if (c.cardName) row.cardName = c.cardName;
              if (c.level != null) row.level = c.level;
              return row;
            }),
            createdAt: timestampToMillisDeck(data.createdAt) || 0,
            updatedAt: timestampToMillisDeck(data.updatedAt) || 0,
            fetchedAt: timestampToMillisDeck(data.fetchedAt) || 0
          };
        });
    }

    function saveDecklogData(decklogCode, cards) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      var code = String(decklogCode || "").trim();
      var id = safeDocId(code);
      if (!user || !id) return Promise.resolve(false);
      var normalized = normalizeDeckCards(cards).map(function (c) {
        var row = { cardNumber: c.cardNumber, qty: c.qty };
        if (c.cardName) row.cardName = c.cardName;
        if (c.level != null) row.level = c.level;
        return row;
      });
      if (!normalized.length) return Promise.resolve(false);
      var ref = decklogDataCol(db).doc(id);
      return ref.get().then(function (snap) {
        var payload = {
          decklogCode: code,
          cards: normalized,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          fetchedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!snap.exists) {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        return ref.set(payload, { merge: true }).then(function () { return true; });
      });
    }

    function makeDeckShareId() {
      var rand = "";
      try {
        if (global.crypto && typeof global.crypto.getRandomValues === "function") {
          var buf = new Uint8Array(9);
          global.crypto.getRandomValues(buf);
          for (var i = 0; i < buf.length; i++) {
            rand += (buf[i] % 36).toString(36);
          }
        }
      } catch (e) { /* fall through */ }
      if (!rand || rand.length < 8) {
        rand = Math.random().toString(36).slice(2, 11) +
          Math.random().toString(36).slice(2, 6);
      }
      return ("ds_" + rand).slice(0, 40);
    }

    function getShareIdFromLocation(loc) {
      try {
        var href = (loc && loc.href) || (global.location && global.location.href) || "";
        if (!href) return "";
        var url = new URL(href, "https://ws-cards.cloud");
        return String(url.searchParams.get("share") || "").trim().slice(0, 40);
      } catch (e) {
        return "";
      }
    }

    function shareCardsForPublic(cards) {
      return normalizeDeckCards(cards).map(function (c) {
        var row = { cardNumber: c.cardNumber, qty: c.qty };
        if (c.cardName) row.cardName = c.cardName;
        if (c.level != null) row.level = c.level;
        return row;
      });
    }

    function deckShareFromDoc(docSnap) {
      if (!docSnap || !docSnap.exists) return null;
      var data = docSnap.data() || {};
      var shareId = String(data.shareId || docSnap.id || "").trim();
      if (!shareId) return null;
      var name = String(data.name || "").trim() || "未命名牌組";
      var tags = Array.isArray(data.tags)
        ? data.tags.map(function (t) { return String(t || "").trim(); }).filter(Boolean)
        : [];
      var out = {
        shareId: shareId.slice(0, 40),
        ownerUid: String(data.ownerUid || "").trim(),
        sourceDeckId: String(data.sourceDeckId || "").trim().slice(0, 80),
        name: name.slice(0, 40),
        tags: tags.slice(0, 20),
        cards: shareCardsForPublic(data.cards),
        createdAt: timestampToMillisDeck(data.createdAt) || 0,
        updatedAt: timestampToMillisDeck(data.updatedAt) || 0
      };
      var desc = String(data.deckDescription || "").trim();
      if (desc) out.deckDescription = desc.slice(0, 200);
      var cover = String(data.coverCardNumber || "").trim().replace(/\\/g, "/");
      if (cover) out.coverCardNumber = cover.slice(0, 80);
      return out;
    }

    function getDeckShare(shareId) {
      var missing = requireDb();
      if (missing) return missing;
      var id = safeDocId(shareId);
      if (!id) return Promise.resolve(null);
      return deckSharesCol(db)
        .doc(id)
        .get()
        .then(function (snap) {
          return deckShareFromDoc(snap);
        });
    }

    /**
     * 建立或更新公開分享快照。回傳 { shareId, created }。
     * 不含 shortQty（缺卡為個人資料）。
     */
    function saveDeckShare(deck, opts) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user || !deck || typeof deck !== "object") {
        return Promise.resolve(null);
      }
      opts = opts || {};
      var sourceDeckId = safeDocId(deck.id || opts.sourceDeckId);
      var cards = shareCardsForPublic(deck.cards);
      if (!sourceDeckId || !cards.length) return Promise.resolve(null);
      if (cards.length > 80) cards = cards.slice(0, 80);

      var existingId = safeDocId(opts.shareId || deck.shareId);
      var name = String(deck.name || "").trim() || "未命名牌組";
      var tags = Array.isArray(deck.tags)
        ? deck.tags.map(function (t) { return String(t || "").trim(); }).filter(Boolean)
        : [];
      var desc = String(deck.deckDescription || "").trim().slice(0, 200);
      var cover = String(deck.coverCardNumber || "").trim().replace(/\\/g, "/").slice(0, 80);

      function writeShare(shareId, isCreate) {
        var ref = deckSharesCol(db).doc(shareId);
        var payload = {
          shareId: shareId,
          ownerUid: user.uid,
          sourceDeckId: sourceDeckId,
          name: name.slice(0, 40),
          tags: tags.slice(0, 20),
          cards: cards,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (desc) payload.deckDescription = desc;
        else if (!isCreate) payload.deckDescription = firebase.firestore.FieldValue.delete();
        if (cover) payload.coverCardNumber = cover;
        else if (!isCreate) payload.coverCardNumber = firebase.firestore.FieldValue.delete();
        if (isCreate) {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          return ref.set(payload).then(function () {
            return { shareId: shareId, created: true };
          });
        }
        return ref.set(payload, { merge: true }).then(function () {
          return { shareId: shareId, created: false };
        });
      }

      if (existingId) {
        return deckSharesCol(db)
          .doc(existingId)
          .get()
          .then(function (snap) {
            if (snap.exists) {
              var data = snap.data() || {};
              if (String(data.ownerUid || "") === user.uid) {
                return writeShare(existingId, false);
              }
            }
            var freshId = makeDeckShareId();
            return writeShare(freshId, true);
          });
      }
      return writeShare(makeDeckShareId(), true);
    }

    function deleteDeckShare(shareId) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      var id = safeDocId(shareId);
      if (!user || !id) return Promise.resolve(false);
      var ref = deckSharesCol(db).doc(id);
      return ref.get().then(function (snap) {
        if (!snap.exists) return true;
        var data = snap.data() || {};
        if (String(data.ownerUid || "") !== user.uid) {
          return Promise.reject(new Error("無權停用此分享連結"));
        }
        return ref.delete().then(function () { return true; });
      });
    }

    function auctionRef(auctionId) {
      return db.collection(COLLECTION_AUCTIONS).doc(String(auctionId || "").trim());
    }

    function getAuctionIdFromLocation(loc) {
      try {
        var href = (loc && loc.href) || (global.location && global.location.href) || "";
        if (!href) return "";
        var url = new URL(href, "https://ws-cards.cloud");
        return String(url.searchParams.get("id") || "").trim();
      } catch (e) {
        return "";
      }
    }

    function toMillis(value) {
      if (value == null) return 0;
      if (typeof value === "number" && isFinite(value)) return value;
      if (typeof value === "string") {
        var parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      }
      if (typeof value.toMillis === "function") {
        try { return value.toMillis(); } catch (e) { return 0; }
      }
      if (typeof value.seconds === "number") {
        return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
      }
      return 0;
    }

    function normalizeAuctionDoc(auctionId, data) {
      data = data || {};
      var startPrice = Math.floor(Number(data.startPrice) || 0);
      var highestAmount = Math.floor(Number(data.highestAmount));
      if (!isFinite(highestAmount)) highestAmount = startPrice;
      var images = Array.isArray(data.images)
        ? data.images.map(function (u) { return String(u || "").trim(); }).filter(Boolean)
        : [];
      var status = String(data.status || "open").trim() || "open";
      var endTimeMs = toMillis(data.endTime);
      if (status === "open" && endTimeMs && Date.now() >= endTimeMs) {
        status = "ended";
      }
      return {
        auctionId: String(auctionId || data.auctionId || "").trim(),
        title: String(data.title || "").trim(),
        images: images,
        shipping: String(data.shipping || "").trim(),
        description: String(data.description || "").trim(),
        itemStatus: String(data.itemStatus || "").trim(),
        startPrice: startPrice,
        quantity: Math.floor(Number(data.quantity) || 1),
        currency: String(data.currency || "JPY").trim() || "JPY",
        startTimeMs: toMillis(data.startTime),
        endTimeMs: endTimeMs,
        earlyEnd: data.earlyEnd === true || data.earlyEnd === "是",
        autoExtend: data.autoExtend === true || data.autoExtend === "是",
        autoExtendMinutes: Math.max(1, Math.floor(Number(data.autoExtendMinutes) || 5)),
        status: status,
        highestAmount: highestAmount,
        highestBidder: String(data.highestBidder || "").trim(),
        highestBidderUid: String(data.highestBidderUid || "").trim(),
        bidCount: Math.max(0, Math.floor(Number(data.bidCount) || 0)),
        sellerUid: String(data.sellerUid || "").trim(),
        sellerName: String(data.sellerName || "").trim(),
        createdAtMs: toMillis(data.createdAt) || toMillis(data.updatedAt)
      };
    }

    function activityRef(uid, auctionId) {
      return db
        .collection(COLLECTION_USERS)
        .doc(uid)
        .collection(COLLECTION_AUCTION_ACTIVITY)
        .doc(String(auctionId || "").trim());
    }

    function makeAuctionId(now) {
      var d = now instanceof Date ? now : new Date();
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      var rand = Math.floor(Math.random() * 36 * 36 * 36 * 36)
        .toString(36)
        .toUpperCase()
        .padStart(4, "0")
        .slice(-4);
      return "WS-AUC-" + y + m + day + "-" + rand;
    }

    function sanitizeHttpUrl(url) {
      var u = String(url || "").trim();
      if (!u) return "";
      try {
        var parsed = new URL(u);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
        return parsed.href;
      } catch (e) {
        return "";
      }
    }

    function normalizeBidDoc(docSnap) {
      var data = (docSnap && docSnap.data) ? (docSnap.data() || {}) : {};
      var amount = Math.floor(Number(data.amount));
      if (!isFinite(amount) || amount <= 0) return null;
      return {
        id: docSnap.id,
        bidderUid: String(data.bidderUid || "").trim(),
        bidder: String(data.bidderName || data.bidder || "").trim() || "匿名",
        amount: amount,
        quantity: Math.max(1, Math.floor(Number(data.quantity) || 1)),
        timeMs: toMillis(data.createdAt) || toMillis(data.time) || Date.now()
      };
    }

    function resolveBidderDisplayName(profile) {
      var user = auth.currentUser;
      if (!user) return Promise.resolve("");
      function fromProfile(p) {
        p = p || {};
        var nick = String(p.nickname || "").trim();
        if (nick) return nick;
        var display = String(p.displayName || "").trim();
        if (display) return display;
        return String(user.displayName || "").trim() || "會員";
      }
      if (profile && typeof profile === "object") {
        return Promise.resolve(fromProfile(profile).slice(0, 40));
      }
      return ensureUserProfile().then(function (p) {
        return fromProfile(p).slice(0, 40);
      });
    }

    /**
     * 訂閱拍賣主檔 + 出價列表（即時）。
     * onChange({ auction, bids, exists })
     * 回傳 unsubscribe。
     */
    function watchAuction(auctionId, onChange, onError) {
      var missing = requireDb();
      if (missing) {
        if (typeof onError === "function") {
          missing.catch(function (err) { onError(err); });
        }
        return function () {};
      }
      var id = String(auctionId || "").trim();
      if (!id) {
        if (typeof onError === "function") {
          onError(new Error("缺少拍賣 ID"));
        }
        return function () {};
      }

      var latestAuction = null;
      var latestBids = [];
      var exists = false;
      var aReady = false;
      var bReady = false;

      function emit() {
        if (!aReady || !bReady) return;
        if (typeof onChange === "function") {
          onChange({
            auction: latestAuction,
            bids: latestBids.slice(),
            exists: exists
          });
        }
      }

      var ref = auctionRef(id);
      var unsubA = ref.onSnapshot(
        function (snap) {
          aReady = true;
          exists = !!(snap && snap.exists);
          latestAuction = exists ? normalizeAuctionDoc(id, snap.data()) : null;
          emit();
        },
        function (err) {
          if (typeof onError === "function") onError(err);
        }
      );

      var unsubB = ref.collection(COLLECTION_BIDS).onSnapshot(
        function (snap) {
          bReady = true;
          var list = [];
          snap.forEach(function (docSnap) {
            var bid = normalizeBidDoc(docSnap);
            if (bid) list.push(bid);
          });
          list.sort(function (a, b) {
            return (b.timeMs || 0) - (a.timeMs || 0);
          });
          latestBids = list;
          emit();
        },
        function (err) {
          if (typeof onError === "function") onError(err);
        }
      );

      return function () {
        try { unsubA(); } catch (e1) {}
        try { unsubB(); } catch (e2) {}
      };
    }

    /**
     * 登入後下標（Transaction：寫入 bids + 更新最高價快取；可選自動延長）。
     */
    function placeBid(auctionId, amount) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) {
        return Promise.reject(new Error("請先登入後再下標"));
      }
      var id = String(auctionId || "").trim();
      if (!id) {
        return Promise.reject(new Error("缺少拍賣 ID"));
      }
      var bidAmount = Math.floor(Number(amount));
      if (!Number.isFinite(bidAmount) || bidAmount <= 0 || bidAmount !== Number(amount)) {
        return Promise.reject(new Error("請輸入有效整數金額"));
      }

      return resolveBidderDisplayName().then(function (bidderName) {
        if (!bidderName) {
          return Promise.reject(new Error("無法取得下標者名稱，請先至個人資料設定暱稱"));
        }
        var ref = auctionRef(id);
        return db.runTransaction(function (tx) {
          return tx.get(ref).then(function (snap) {
            if (!snap.exists) {
              throw new Error("找不到此拍賣");
            }
            var data = snap.data() || {};
            var auction = normalizeAuctionDoc(id, data);
            var now = Date.now();
            if (auction.status === "closed" || auction.status === "ended") {
              throw new Error("拍賣已結束");
            }
            if (!auction.endTimeMs || now >= auction.endTimeMs) {
              throw new Error("拍賣已結束");
            }
            if (auction.startTimeMs && now < auction.startTimeMs) {
              throw new Error("拍賣尚未開始");
            }
            if (auction.sellerUid && auction.sellerUid === user.uid) {
              throw new Error("不能對自己刊登的拍賣下標");
            }
            if (bidAmount <= auction.highestAmount) {
              throw new Error("出價需高於目前最高價");
            }

            var endTimeValue = data.endTime;
            if (auction.autoExtend) {
              var windowMs = auction.autoExtendMinutes * 60 * 1000;
              if (auction.endTimeMs - now <= windowMs) {
                endTimeValue = firebase.firestore.Timestamp.fromMillis(
                  auction.endTimeMs + windowMs
                );
              }
            }

            var bidRef = ref.collection(COLLECTION_BIDS).doc();
            tx.set(bidRef, {
              bidderUid: user.uid,
              bidderName: bidderName,
              amount: bidAmount,
              quantity: auction.quantity || 1,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            tx.update(ref, {
              highestAmount: bidAmount,
              highestBidder: bidderName,
              highestBidderUid: user.uid,
              bidCount: auction.bidCount + 1,
              endTime: endTimeValue,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            tx.set(
              activityRef(user.uid, id),
              {
                auctionId: id,
                role: "bidder",
                title: auction.title || "",
                coverImage: (auction.images && auction.images[0]) || "",
                myHighestAmount: bidAmount,
                lastBidAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              },
              { merge: true }
            );

            return {
              auctionId: id,
              amount: bidAmount,
              bidderName: bidderName
            };
          });
        });
      });
    }

    /**
     * 登入後開立新拍賣。input 欄位見 normalize／rules。
     * 回傳 { auctionId }
     */
    function createAuction(input) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) {
        return Promise.reject(new Error("請先登入後再開立拍賣"));
      }
      input = input || {};

      return resolveBidderDisplayName().then(function (sellerName) {
        if (!sellerName) {
          return Promise.reject(new Error("無法取得賣家名稱，請先至個人資料設定暱稱"));
        }

        var title = String(input.title || "").trim();
        var description = String(input.description || "").trim();
        var itemStatus = String(input.itemStatus || "").trim();
        var shipping = String(input.shipping || "").trim();
        var images = Array.isArray(input.images)
          ? input.images.map(sanitizeHttpUrl).filter(Boolean)
          : String(input.imagesText || "")
              .split(/\r?\n/)
              .map(sanitizeHttpUrl)
              .filter(Boolean);
        var startPrice = Math.floor(Number(input.startPrice));
        var quantity = Math.floor(Number(input.quantity != null ? input.quantity : 1));
        var autoExtendMinutes = Math.floor(Number(input.autoExtendMinutes != null ? input.autoExtendMinutes : 5));
        var earlyEnd = !!input.earlyEnd;
        var autoExtend = input.autoExtend !== false;
        var startMs = toMillis(input.startTime) || Date.now();
        var endMs = toMillis(input.endTime);

        if (!title) return Promise.reject(new Error("請填寫商品標題"));
        if (!description) return Promise.reject(new Error("請填寫商品說明"));
        if (!itemStatus) return Promise.reject(new Error("請填寫商品狀態"));
        if (!images.length) return Promise.reject(new Error("請至少提供 1 張圖片網址"));
        if (images.length > 12) return Promise.reject(new Error("圖片最多 12 張"));
        if (!Number.isFinite(startPrice) || startPrice <= 0) {
          return Promise.reject(new Error("起始價格須為正整數"));
        }
        if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 99) {
          return Promise.reject(new Error("商品數量須為 1～99"));
        }
        if (!Number.isFinite(autoExtendMinutes) || autoExtendMinutes < 1 || autoExtendMinutes > 60) {
          return Promise.reject(new Error("自動延長分鐘數須為 1～60"));
        }
        if (!endMs || endMs <= Date.now()) {
          return Promise.reject(new Error("結束時間必須是未來"));
        }
        if (endMs <= startMs) {
          return Promise.reject(new Error("結束時間必須晚於開始時間"));
        }

        var auctionId = String(input.auctionId || "").trim() || makeAuctionId();
        if (!/^[-A-Za-z0-9_]{8,64}$/.test(auctionId)) {
          return Promise.reject(new Error("拍賣 ID 格式無效"));
        }

        var ref = auctionRef(auctionId);
        var payload = {
          auctionId: auctionId,
          sellerUid: user.uid,
          sellerName: sellerName.slice(0, 40),
          title: title.slice(0, 200),
          description: description.slice(0, 4000),
          itemStatus: itemStatus.slice(0, 80),
          shipping: shipping.slice(0, 200),
          images: images,
          startPrice: startPrice,
          highestAmount: startPrice,
          quantity: quantity,
          currency: "JPY",
          bidCount: 0,
          highestBidder: "",
          highestBidderUid: "",
          status: "open",
          earlyEnd: earlyEnd,
          autoExtend: autoExtend,
          autoExtendMinutes: autoExtendMinutes,
          startTime: firebase.firestore.Timestamp.fromMillis(startMs),
          endTime: firebase.firestore.Timestamp.fromMillis(endMs),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        return ref.get().then(function (snap) {
          if (snap.exists) {
            return Promise.reject(new Error("拍賣 ID 已存在，請再試一次"));
          }
          var batch = db.batch();
          batch.set(ref, payload);
          batch.set(activityRef(user.uid, auctionId), {
            auctionId: auctionId,
            role: "seller",
            title: payload.title,
            coverImage: images[0] || "",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return batch.commit().then(function () {
            return { auctionId: auctionId };
          });
        });
      });
    }

    function listMySellingAuctions() {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) return Promise.resolve([]);
      return db
        .collection(COLLECTION_AUCTIONS)
        .where("sellerUid", "==", user.uid)
        .get()
        .then(function (snap) {
          var list = [];
          snap.forEach(function (docSnap) {
            list.push(normalizeAuctionDoc(docSnap.id, docSnap.data()));
          });
          list.sort(function (a, b) {
            return (b.createdAtMs || b.endTimeMs || 0) - (a.createdAtMs || a.endTimeMs || 0);
          });
          return list;
        });
    }

    function listMyBiddingActivity() {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) return Promise.resolve([]);
      return db
        .collection(COLLECTION_USERS)
        .doc(user.uid)
        .collection(COLLECTION_AUCTION_ACTIVITY)
        .where("role", "==", "bidder")
        .get()
        .then(function (snap) {
          var activities = [];
          snap.forEach(function (docSnap) {
            var data = docSnap.data() || {};
            activities.push({
              auctionId: String(data.auctionId || docSnap.id).trim(),
              title: String(data.title || "").trim(),
              coverImage: String(data.coverImage || "").trim(),
              myHighestAmount: Math.floor(Number(data.myHighestAmount) || 0),
              updatedAtMs: toMillis(data.updatedAt) || toMillis(data.lastBidAt)
            });
          });
          if (!activities.length) return [];

          return Promise.all(
            activities.map(function (act) {
              return auctionRef(act.auctionId)
                .get()
                .then(function (aSnap) {
                  var auction = aSnap.exists
                    ? normalizeAuctionDoc(act.auctionId, aSnap.data())
                    : null;
                  return {
                    activity: act,
                    auction: auction
                  };
                })
                .catch(function () {
                  return { activity: act, auction: null };
                });
            })
          ).then(function (rows) {
            rows.sort(function (a, b) {
              var am = (a.activity && a.activity.updatedAtMs) || 0;
              var bm = (b.activity && b.activity.updatedAtMs) || 0;
              return bm - am;
            });
            return rows;
          });
        });
    }

    function closeAuction(auctionId) {
      var missing = requireDb();
      if (missing) return missing;
      var user = auth.currentUser;
      if (!user) {
        return Promise.reject(new Error("請先登入"));
      }
      var id = String(auctionId || "").trim();
      if (!id) {
        return Promise.reject(new Error("缺少拍賣 ID"));
      }
      var ref = auctionRef(id);
      return ref.get().then(function (snap) {
        if (!snap.exists) {
          return Promise.reject(new Error("找不到此拍賣"));
        }
        var data = snap.data() || {};
        if (data.sellerUid !== user.uid) {
          return Promise.reject(new Error("只有賣家可以結束拍賣"));
        }
        if (data.status === "closed") {
          return { auctionId: id, status: "closed" };
        }
        return ref
          .update({
            status: "closed",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          })
          .then(function () {
            return { auctionId: id, status: "closed" };
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
      ensureUserProfile: ensureUserProfile,
      favoriteCardId: favoriteCardId,
      loadCardFavorites: loadCardFavorites,
      addCardFavorite: addCardFavorite,
      removeCardFavorite: removeCardFavorite,
      safeDocId: safeDocId,
      loadUserDecks: loadUserDecks,
      saveUserDeck: saveUserDeck,
      deleteUserDeck: deleteUserDeck,
      findUserDeckByDecklogCode: findUserDeckByDecklogCode,
      getDecklogData: getDecklogData,
      saveDecklogData: saveDecklogData,
      makeDeckShareId: makeDeckShareId,
      getShareIdFromLocation: getShareIdFromLocation,
      getDeckShare: getDeckShare,
      saveDeckShare: saveDeckShare,
      deleteDeckShare: deleteDeckShare,
      getAuctionIdFromLocation: getAuctionIdFromLocation,
      watchAuction: watchAuction,
      placeBid: placeBid,
      resolveBidderDisplayName: resolveBidderDisplayName,
      createAuction: createAuction,
      listMySellingAuctions: listMySellingAuctions,
      listMyBiddingActivity: listMyBiddingActivity,
      closeAuction: closeAuction,
      makeAuctionId: makeAuctionId
    };
  }

  global.WsFirebase = init();
})(window);
