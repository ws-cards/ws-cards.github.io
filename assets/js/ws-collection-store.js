/**
 * 收藏庫共用：卡冊（單卡）與牌組分開頁面，但共用同一組 localStorage key。
 * 構想：兩者都是實體庫存；拆頁是為了操作單純，不是資料隔離。
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
   * 舊單頁 ?view=decks 或書籤相容：在卡冊頁遇到明確要看牌組時導向 decks.html。
   * 不會只因 VIEW_KEY 就自動跳轉，避免側欄「收藏庫」被帶走。
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
    maybeRedirectLegacyDeckView: maybeRedirectLegacyDeckView
  };
})(typeof window !== 'undefined' ? window : this);
