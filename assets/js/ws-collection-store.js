/**
 * 收藏庫資料層：卡冊（wsCardsCollection）與牌組（wsCardsDecks）分頁獨立操作。
 * 此模組只提供 storage key／讀寫輔助；頁面之間不再靠 VIEW_KEY 做分頁切換。
 * pageMode／albumUrl／decksUrl 僅供舊連結與明確導向使用。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'wsCardsCollection';
  var DECKS_KEY = 'wsCardsDecks';
  var FAVORITES_KEY = 'wsCardsFavorites';
  var VIEW_KEY = 'wsCardsCollectionView';

  function pageMode() {
    try {
      var path = String((global.location && location.pathname) || '');
      if (/decks\.html$/i.test(path) || /\/decks\/?$/i.test(path)) return 'decks';
    } catch (e) { /* ignore */ }
    return 'album';
  }

  function albumUrl(query) {
    return 'collection.html' + (query ? (('&' + query).replace(/^&/, '?')) : '');
  }

  function decksUrl(query) {
    return 'decks.html' + (query ? (('&' + query).replace(/^&/, '?')) : '');
  }

  function rememberView(view) {
    try {
      global.localStorage.setItem(VIEW_KEY, view === 'decks' ? 'decks' : 'album');
    } catch (e) { /* ignore */ }
  }

  function readRememberedView() {
    try {
      return global.localStorage.getItem(VIEW_KEY) === 'decks' ? 'decks' : 'album';
    } catch (e) {
      return 'album';
    }
  }

  /**
   * 舊單頁 ?view=decks／?tab=decks 書籤相容：僅在明確 query 時導向 decks.html。
   */
  function maybeRedirectLegacyDeckView() {
    if (pageMode() !== 'album') return false;
    try {
      var params = new URLSearchParams(global.location.search || '');
      if (params.get('view') === 'decks' || params.get('tab') === 'decks') {
        params.delete('view');
        params.delete('tab');
        var q = params.toString();
        global.location.replace(decksUrl(q) + (global.location.hash || ''));
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 由卡冊陣列建立 cardNumber → quantity map（牌組缺卡／持有量用） */
  function ownedQtyMap(items) {
    var map = Object.create(null);
    (Array.isArray(items) ? items : []).forEach(function (item) {
      if (!item || !item.cardNumber) return;
      var key = String(item.cardNumber).trim();
      if (!key) return;
      var qty = Number(item.quantity);
      map[key] = (!isFinite(qty) || qty < 0) ? 0 : qty;
    });
    return map;
  }

  function ownedQty(items, cardNumber) {
    if (!cardNumber) return 0;
    var map = ownedQtyMap(items);
    var key = String(cardNumber).trim();
    return map[key] || 0;
  }

  global.WsCollectionStore = {
    STORAGE_KEY: STORAGE_KEY,
    DECKS_KEY: DECKS_KEY,
    FAVORITES_KEY: FAVORITES_KEY,
    VIEW_KEY: VIEW_KEY,
    pageMode: pageMode,
    albumUrl: albumUrl,
    decksUrl: decksUrl,
    rememberView: rememberView,
    readRememberedView: readRememberedView,
    maybeRedirectLegacyDeckView: maybeRedirectLegacyDeckView,
    readJson: readJson,
    writeJson: writeJson,
    ownedQtyMap: ownedQtyMap,
    ownedQty: ownedQty
  };
})(typeof window !== 'undefined' ? window : this);
