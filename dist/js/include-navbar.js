(function () {
  'use strict';

  var AUTH_HINT_KEY = 'ws-auth-signed-in';
  var AUTH_LABEL_KEY = 'ws-auth-label';
  var THEME_HINT_KEY = 'ws-theme';

  var container = document.querySelector('[data-navbar]');
  if (!container) return;

  var templatePath = container.getAttribute('data-navbar-template') || '/assets/partials/navbar.html';
  var pageTitle = container.getAttribute('data-page-title') || document.title;

  function applyTheme(theme, button, icon) {
    var dark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    icon.classList.toggle('fa-sun', dark);
    icon.classList.toggle('fa-moon', !dark);
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.setAttribute('title', dark ? '切換為淺色模式' : '切換為深色模式');
    button.setAttribute('aria-label', dark ? '切換為淺色模式' : '切換為深色模式');
  }

  /** 與 Auth 方案 C 相同：優先 data-theme，其次 localStorage hint */
  function resolveThemeHint() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    try {
      var saved = localStorage.getItem(THEME_HINT_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {
      // ignore
    }
    return 'light';
  }

  function writeThemeHint(theme) {
    try {
      localStorage.setItem(THEME_HINT_KEY, theme === 'dark' ? 'dark' : 'light');
    } catch (e) {
      // private mode 等略過
    }
  }

  /** 插入 DOM 前就把 hint 寫進 HTML，避免先畫錯 icon；也不再依賴 display:none（快取不同步會整顆消失） */
  function applyThemeHintToNavbarHtml(html, theme) {
    var dark = theme === 'dark';
    var out = String(html || '');
    // 清掉舊版方案 C 殘留的 display:none，避免按鈕永遠隱藏
    out = out.replace(
      /id="navThemeToggleItem"([^>]*)style="display:\s*none;?"/i,
      'id="navThemeToggleItem"$1'
    );
    out = out.replace(
      /(<li[^>]*id="navThemeToggleItem"[^>]*style=")display:\s*none;?([^"]*")/i,
      '$1$2'
    );
    if (dark) {
      out = out.replace(
        /id="themeToggleIcon" class="fas fa-moon"/,
        'id="themeToggleIcon" class="fas fa-sun"'
      );
      out = out.replace(
        /id="themeToggleBtn"([\s\S]*?)title="切換為深色模式"/,
        'id="themeToggleBtn"$1title="切換為淺色模式"'
      );
      out = out.replace(
        /id="themeToggleBtn"([\s\S]*?)aria-label="切換為深色模式"/,
        'id="themeToggleBtn"$1aria-label="切換為淺色模式"'
      );
      out = out.replace(
        /id="themeToggleBtn"([\s\S]*?)aria-pressed="false"/,
        'id="themeToggleBtn"$1aria-pressed="true"'
      );
    }
    return out;
  }

  function dispatchAuthChanged(user) {
    try {
      document.dispatchEvent(new CustomEvent('ws-auth-changed', {
        detail: { user: user || null }
      }));
    } catch (e) {
      // IE 等不支援 CustomEvent 時略過
    }
  }

  function readAuthHint() {
    try {
      if (localStorage.getItem(AUTH_HINT_KEY) !== '1') return null;
      return {
        displayName: localStorage.getItem(AUTH_LABEL_KEY) || '',
        email: ''
      };
    } catch (e) {
      return null;
    }
  }

  function writeAuthHint(user) {
    try {
      if (user) {
        localStorage.setItem(AUTH_HINT_KEY, '1');
        localStorage.setItem(
          AUTH_LABEL_KEY,
          user.displayName || user.email || user.uid || ''
        );
      } else {
        localStorage.removeItem(AUTH_HINT_KEY);
        localStorage.removeItem(AUTH_LABEL_KEY);
      }
    } catch (e) {
      // private mode 等略過
    }
  }

  /**
   * @param {object|null} user
   * @param {{ persist?: boolean }} [options] persist 預設 true；樂觀 UI 時設 false 以免誤清 hint
   */
  function updateAuthUi(user, options) {
    var opts = options || {};
    var persist = opts.persist !== false;
    var btnIn = container.querySelector('#navAuthSignIn');
    var btnOut = container.querySelector('#navAuthSignOut');
    var label = container.querySelector('#navAuthUser');
    var signedIn = !!user;

    if (btnIn) {
      btnIn.style.display = '';
      var inItem = container.querySelector('#navAuthSignInItem') || btnIn.parentElement;
      if (inItem) inItem.style.display = signedIn ? 'none' : '';
    }
    if (btnOut) {
      btnOut.style.display = '';
      var outItem = container.querySelector('#navAuthSignOutItem') || btnOut.parentElement;
      if (outItem) outItem.style.display = signedIn ? '' : 'none';
    }
    if (label) {
      var labelItem = container.querySelector('#navAuthUserItem') || label.parentElement;
      if (signedIn) {
        var text = user.displayName || user.email || user.uid || '';
        label.textContent = text;
        label.title = user.email || text;
        if (labelItem) {
          labelItem.style.display = text ? 'flex' : 'none';
        }
      } else {
        label.textContent = '';
        label.title = '';
        if (labelItem) labelItem.style.display = 'none';
      }
    }

    if (persist) writeAuthHint(user);
  }

  function applyOptimisticAuthUi() {
    var hint = readAuthHint();
    if (hint) updateAuthUi(hint, { persist: false });
    // 無 hint：保持 navbar 預設（登入／登出皆隱藏），等 Firebase 確認
  }

  function initializeAuth() {
    var btnIn = container.querySelector('#navAuthSignIn');
    var btnOut = container.querySelector('#navAuthSignOut');
    var fb = window.WsFirebase;

    if (!btnIn && !btnOut) return;

    applyOptimisticAuthUi();

    if (btnIn) {
      btnIn.addEventListener('click', function () {
        if (!fb || !fb.ready) {
          alert((fb && fb.reason) || '請先載入 Firebase 設定（assets/js/firebase-config.js）');
          return;
        }
        btnIn.disabled = true;
        fb.signInWithGoogle()
          .catch(function (err) {
            console.error(err);
            alert('登入失敗：' + (err && err.message ? err.message : err));
          })
          .then(function () {
            btnIn.disabled = false;
          });
      });
    }

    if (btnOut) {
      btnOut.addEventListener('click', function () {
        if (!fb || !fb.ready) return;
        fb.signOut().catch(function (err) {
          console.error(err);
          alert('登出失敗：' + (err && err.message ? err.message : err));
        });
      });
    }

    if (fb && fb.ready && typeof fb.onAuth === 'function') {
      fb.onAuth(function (user) {
        updateAuthUi(user);
        dispatchAuthChanged(user);
      });
    } else if (!readAuthHint()) {
      // 無 Firebase 且無 hint：顯示登入鈕（點擊會提示設定）
      updateAuthUi(null, { persist: false });
    }
  }

  function initializeNavbar() {
    var title = container.querySelector('[data-navbar-title]');
    var button = container.querySelector('#themeToggleBtn');
    var icon = container.querySelector('#themeToggleIcon');
    var themeItem = container.querySelector('#navThemeToggleItem') || (button && button.parentElement);
    if (title) title.textContent = pageTitle;
    if (!button || !icon) return;

    // 方案 C：依 hint 確認 icon；並強制清掉可能殘留的 display:none
    var currentTheme = resolveThemeHint();
    applyTheme(currentTheme, button, icon);
    if (themeItem) {
      themeItem.style.removeProperty('display');
    }

    button.addEventListener('click', function () {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme, button, icon);
      writeThemeHint(currentTheme);
    });
  }

  fetch(templatePath)
    .then(function (response) {
      if (!response.ok) throw new Error('Navbar template request failed: ' + response.status);
      return response.text();
    })
    .then(function (html) {
      var theme = resolveThemeHint();
      container.innerHTML = applyThemeHintToNavbarHtml(html, theme);
      initializeNavbar();
      initializeAuth();
    })
    .catch(function (error) {
      console.error(error);
      container.setAttribute('data-navbar-error', 'true');
    });
})();
