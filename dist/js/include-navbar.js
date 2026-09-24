(function () {
  'use strict';

  var AUTH_HINT_KEY = 'ws-auth-signed-in';
  var AUTH_LABEL_KEY = 'ws-auth-label';

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

    if (btnIn) btnIn.style.display = signedIn ? 'none' : '';
    if (btnOut) btnOut.style.display = signedIn ? '' : 'none';
    if (label) {
      if (signedIn) {
        var text = user.displayName || user.email || user.uid || '';
        label.style.display = text ? '' : 'none';
        label.textContent = text;
        label.title = user.email || text;
      } else {
        label.style.display = 'none';
        label.textContent = '';
        label.title = '';
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
    if (title) title.textContent = pageTitle;
    if (!button || !icon) return;

    var currentTheme = document.documentElement.getAttribute('data-theme');
    applyTheme(currentTheme === 'dark' ? 'dark' : 'light', button, icon);
    button.addEventListener('click', function () {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme, button, icon);
      try {
        localStorage.setItem('ws-theme', currentTheme);
      } catch (e) {
        // 儲存失敗時仍保留本次頁面的主題切換
      }
    });
  }

  fetch(templatePath)
    .then(function (response) {
      if (!response.ok) throw new Error('Navbar template request failed: ' + response.status);
      return response.text();
    })
    .then(function (html) {
      container.innerHTML = html;
      initializeNavbar();
      initializeAuth();
    })
    .catch(function (error) {
      console.error(error);
      container.setAttribute('data-navbar-error', 'true');
    });
})();
