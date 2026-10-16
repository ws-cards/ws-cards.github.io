(function (global) {
  'use strict';

  var READ_IDS_KEY = 'ws-feed-read-ids';
  var DATA_URL = '/assets/data/ws-feed-messages.json';

  /** 測試用預設資料（JSON 載入失敗時後備） */
  var DEFAULT_MESSAGES = [
    {
      id: 'pub-20261015-1',
      type: 'Public',
      subject: '新增《BanG Dream!》部分卡號',
      content: '已補齊 BD/W54 系列若干卡號之遊遊亭行情與庫存資料，可於各卡號漲幅趨勢查詢。',
      publishedAt: '2026-10-15',
      hasRead: 0
    },
    {
      id: 'pub-20261014-1',
      type: 'Public',
      subject: '新增《Overlord》系列卡資料',
      content: 'OVL 系列新卡已入庫，含數張 PR 與稀有度變體。',
      publishedAt: '2026-10-14',
      hasRead: 0
    },
    {
      id: 'pub-20261012-1',
      type: 'Public',
      subject: '資料修正：卡名與稀有度對應',
      content: '修正少數卡號名稱與稀有度標示錯誤，不影響既有查詢流程。',
      publishedAt: '2026-10-12',
      hasRead: 0
    },
    {
      id: 'per-20261015-1',
      type: 'Personal',
      subject: '願望清單卡片有新行情',
      content: '你追蹤的卡片中，有 2 張今日售價有變動，可至願望清單查看。',
      publishedAt: '2026-10-15',
      hasRead: 0
    },
    {
      id: 'per-20261013-1',
      type: 'Personal',
      subject: '歡迎使用帳戶功能',
      content: '登入後可同步願望清單，並接收與你相關的個人通知（測試用訊息）。',
      publishedAt: '2026-10-13',
      hasRead: 0
    }
  ];

  /** hasRead：1=已讀、0=未讀 */
  function normalizeHasRead(value) {
    if (value === 1 || value === '1' || value === true) return 1;
    return 0;
  }

  function cloneDefaults() {
    return DEFAULT_MESSAGES.map(function (msg) {
      return {
        id: msg.id,
        type: msg.type,
        subject: msg.subject,
        content: msg.content,
        publishedAt: msg.publishedAt,
        hasRead: normalizeHasRead(msg.hasRead)
      };
    });
  }

  var state = {
    messages: cloneDefaults(),
    loaded: false,
    loading: null,
    signedIn: false
  };

  function ensureStyles() {
    if (document.getElementById('ws-feed-messages-styles')) return;
    var style = document.createElement('style');
    style.id = 'ws-feed-messages-styles';
    style.textContent = [
      '.nav-auth-unread-dot{',
      'position:absolute;top:2px;right:2px;width:8px;height:8px;',
      'border-radius:50%;background:#e11d48;border:1.5px solid #fff;',
      'z-index:2;pointer-events:none;box-sizing:border-box;',
      '}',
      '[data-theme="dark"] .nav-auth-unread-dot{border-color:#1a1206;}',
      '.nav-auth-unread-dot[hidden]{display:none!important;}',
      '.nav-auth-account-btn{position:relative;overflow:visible;}',
      '.nav-auth-guest-icon{display:inline-flex;align-items:center;justify-content:center;line-height:1;}',
      '.nav-auth-guest-icon i{font-size:1rem;}',
      '.ws-feed-overlay{',
      'position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;',
      'padding:1.25rem;background:rgba(17,24,39,0.34);backdrop-filter:blur(3px);',
      '-webkit-backdrop-filter:blur(3px);',
      '}',
      '.ws-feed-overlay[hidden]{display:none!important;}',
      '.ws-feed-panel{',
      'width:min(26rem,100%);max-height:min(78vh,36rem);display:flex;flex-direction:column;',
      'border-radius:14px;border:1px solid rgba(38,50,71,0.14);background:#fffdf8;',
      'color:#263247;box-shadow:0 18px 48px rgba(30,45,90,0.18);overflow:hidden;',
      '}',
      '[data-theme="dark"] .ws-feed-panel{',
      'background:#1a1814;color:#e9e7e1;border-color:rgba(255,255,255,0.12);',
      'box-shadow:0 18px 48px rgba(0,0,0,0.5);',
      '}',
      '.ws-feed-panel-head{',
      'display:flex;align-items:center;justify-content:space-between;gap:12px;',
      'padding:1rem 1.1rem 0.85rem;border-bottom:1px solid rgba(38,50,71,0.1);',
      '}',
      '[data-theme="dark"] .ws-feed-panel-head{border-bottom-color:rgba(255,255,255,0.1);}',
      '.ws-feed-panel-title{',
      "font-family:'Zen Old Mincho','Noto Serif TC',serif;",
      'font-size:1.05rem;font-weight:600;letter-spacing:0.06em;margin:0;',
      '}',
      '.ws-feed-panel-close{',
      'width:34px;height:34px;border-radius:9px;border:1px solid rgba(0,0,0,0.08);',
      'background:transparent;color:inherit;cursor:pointer;',
      'display:inline-flex;align-items:center;justify-content:center;',
      '}',
      '.ws-feed-panel-close:hover{background:rgba(0,0,0,0.05);}',
      '[data-theme="dark"] .ws-feed-panel-close{border-color:rgba(255,255,255,0.12);}',
      '[data-theme="dark"] .ws-feed-panel-close:hover{background:rgba(255,255,255,0.06);}',
      '.ws-feed-list{',
      'overflow:auto;padding:0.35rem 0;flex:1;min-height:0;',
      '-webkit-overflow-scrolling:touch;',
      '}',
      '.ws-feed-item{',
      'padding:0.95rem 1.15rem;border-bottom:1px solid rgba(38,50,71,0.08);',
      '}',
      '.ws-feed-item:last-child{border-bottom:0;}',
      '[data-theme="dark"] .ws-feed-item{border-bottom-color:rgba(255,255,255,0.08);}',
      '.ws-feed-item-top{',
      'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;',
      '}',
      '.ws-feed-item-subject{',
      'font-size:0.95rem;font-weight:700;line-height:1.4;margin:0;min-width:0;',
      '}',
      '.ws-feed-item-date{',
      'flex-shrink:0;font-size:0.78rem;opacity:0.62;line-height:1.4;',
      "font-family:'IBM Plex Mono',ui-monospace,monospace;",
      '}',
      '.ws-feed-item-content{',
      'margin:0.45rem 0 0;font-size:0.86rem;line-height:1.65;opacity:0.82;',
      'white-space:pre-wrap;',
      '}',
      '.ws-feed-empty{',
      'padding:2.2rem 1.25rem;text-align:center;font-size:0.9rem;opacity:0.65;',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function readReadIds() {
    try {
      var raw = localStorage.getItem(READ_IDS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return {};
      var map = {};
      for (var i = 0; i < arr.length; i++) map[String(arr[i])] = true;
      return map;
    } catch (e) {
      return {};
    }
  }

  function writeReadIds(map) {
    try {
      localStorage.setItem(READ_IDS_KEY, JSON.stringify(Object.keys(map)));
    } catch (e) {
      // ignore
    }
  }

  function normalizeMessage(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var type = raw.type === 'Personal' ? 'Personal' : 'Public';
    var id = String(raw.id || '').trim();
    if (!id) return null;
    return {
      id: id,
      type: type,
      subject: String(raw.subject || '').trim(),
      content: String(raw.content || '').trim(),
      publishedAt: String(raw.publishedAt || '').trim(),
      hasRead: normalizeHasRead(raw.hasRead)
    };
  }

  /** 以本機已讀紀錄覆寫 hasRead（靜態 JSON 無法回寫時用） */
  function applyLocalReadState(messages) {
    var read = readReadIds();
    for (var i = 0; i < messages.length; i++) {
      if (read[messages[i].id]) messages[i].hasRead = 1;
    }
    return messages;
  }

  function sortMessages(list) {
    return list.slice().sort(function (a, b) {
      if (a.publishedAt === b.publishedAt) return a.id < b.id ? 1 : -1;
      return a.publishedAt < b.publishedAt ? 1 : -1;
    });
  }

  function formatMonthDay(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso || '');
    return parseInt(m[2], 10) + '月' + parseInt(m[3], 10) + '日';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function visibleMessages(signedIn) {
    var allowPersonal = !!signedIn;
    return sortMessages(
      state.messages.filter(function (msg) {
        if (msg.type === 'Personal') return allowPersonal;
        return true;
      })
    );
  }

  function unreadCount(signedIn) {
    var list = visibleMessages(signedIn);
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].hasRead !== 1) n += 1;
    }
    return n;
  }

  function markVisibleRead(signedIn) {
    var read = readReadIds();
    var list = visibleMessages(signedIn);
    for (var i = 0; i < list.length; i++) {
      list[i].hasRead = 1;
      read[list[i].id] = true;
    }
    writeReadIds(read);
  }

  function setSignedIn(signedIn) {
    state.signedIn = !!signedIn;
    updateBadge();
    var overlay = document.getElementById('wsFeedOverlay');
    if (overlay && !overlay.hasAttribute('hidden')) renderPanelList();
  }

  function updateBadge() {
    ensureStyles();
    var dots = document.querySelectorAll('[data-ws-feed-unread-dot]');
    var hasUnread = unreadCount(state.signedIn) > 0;
    for (var i = 0; i < dots.length; i++) {
      if (hasUnread) dots[i].removeAttribute('hidden');
      else dots[i].setAttribute('hidden', '');
    }
  }

  function ensurePanel() {
    ensureStyles();
    var overlay = document.getElementById('wsFeedOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'wsFeedOverlay';
    overlay.className = 'ws-feed-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'wsFeedPanelTitle');
    overlay.innerHTML = [
      '<div class="ws-feed-panel" role="document">',
      '  <div class="ws-feed-panel-head">',
      '    <h2 class="ws-feed-panel-title" id="wsFeedPanelTitle">動態消息</h2>',
      '    <button type="button" class="ws-feed-panel-close" id="wsFeedCloseBtn" aria-label="關閉">',
      '      <i class="fas fa-times" aria-hidden="true"></i>',
      '    </button>',
      '  </div>',
      '  <div class="ws-feed-list" id="wsFeedList"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePanel();
    });
    var closeBtn = overlay.querySelector('#wsFeedCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closePanel();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (overlay.hasAttribute('hidden')) return;
      closePanel();
    });
    return overlay;
  }

  function renderPanelList() {
    var listEl = document.getElementById('wsFeedList');
    if (!listEl) return;
    var list = visibleMessages(state.signedIn);
    if (!list.length) {
      listEl.innerHTML = '<p class="ws-feed-empty">目前沒有消息</p>';
      return;
    }
    listEl.innerHTML = list
      .map(function (msg) {
        return [
          '<article class="ws-feed-item">',
          '  <div class="ws-feed-item-top">',
          '    <p class="ws-feed-item-subject">' + escapeHtml(msg.subject) + '</p>',
          '    <time class="ws-feed-item-date" datetime="' + escapeHtml(msg.publishedAt) + '">' +
            escapeHtml(formatMonthDay(msg.publishedAt)) +
            '</time>',
          '  </div>',
          '  <p class="ws-feed-item-content">' + escapeHtml(msg.content) + '</p>',
          '</article>'
        ].join('');
      })
      .join('');
  }

  function openPanel() {
    var overlay = ensurePanel();
    renderPanelList();
    overlay.removeAttribute('hidden');
    markVisibleRead(state.signedIn);
    updateBadge();
    var closeBtn = overlay.querySelector('#wsFeedCloseBtn');
    if (closeBtn) closeBtn.focus();
  }

  function closePanel() {
    var overlay = document.getElementById('wsFeedOverlay');
    if (!overlay) return;
    overlay.setAttribute('hidden', '');
  }

  function applyPayload(payload) {
    var rawList =
      payload && Array.isArray(payload.messages)
        ? payload.messages
        : Array.isArray(payload)
          ? payload
          : null;
    if (!rawList) {
      state.messages = applyLocalReadState(cloneDefaults());
      return;
    }
    var next = [];
    for (var i = 0; i < rawList.length; i++) {
      var msg = normalizeMessage(rawList[i]);
      if (msg) next.push(msg);
    }
    state.messages = applyLocalReadState(next.length ? next : cloneDefaults());
  }

  function load() {
    if (state.loaded) return Promise.resolve(state.messages);
    if (state.loading) return state.loading;

    state.loading = fetch(DATA_URL, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('feed messages http ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        applyPayload(payload);
        state.loaded = true;
        updateBadge();
        return state.messages;
      })
      .catch(function () {
        state.messages = applyLocalReadState(cloneDefaults());
        state.loaded = true;
        updateBadge();
        return state.messages;
      })
      .then(function (messages) {
        state.loading = null;
        return messages;
      });

    return state.loading;
  }

  global.WsFeedMessages = {
    load: load,
    openPanel: openPanel,
    closePanel: closePanel,
    setSignedIn: setSignedIn,
    updateBadge: updateBadge,
    unreadCount: function () {
      return unreadCount(state.signedIn);
    },
    visibleMessages: function () {
      return visibleMessages(state.signedIn);
    }
  };
})(window);
