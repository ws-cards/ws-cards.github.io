(function () {
  'use strict';

  var container = document.querySelector('[data-navbar]');
  if (!container) return;

  var templatePath = container.getAttribute('data-navbar-template') || 'assets/partials/navbar.html';
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

  function updateAuthUi(user) {
    var btnIn = container.querySelector('#navAuthSignIn');
    var btnOut = container.querySelector('#navAuthSignOut');
    var label = container.querySelector('#navAuthUser');
    var signedIn = !!user;

    if (btnIn) btnIn.style.display = signedIn ? 'none' : '';
    if (btnOut) btnOut.style.display = signedIn ? '' : 'none';
    if (label) {
      if (signedIn) {
        var text = user.displayName || user.email || user.uid || '';
        label.style.display = '';
        label.textContent = text;
        label.title = user.email || text;
      } else {
        label.style.display = 'none';
        label.textContent = '';
        label.title = '';
      }
    }
  }

  function initializeAuth() {
    var btnIn = container.querySelector('#navAuthSignIn');
    var btnOut = container.querySelector('#navAuthSignOut');
    var fb = window.WsFirebase;

    if (!btnIn && !btnOut) return;

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

    if (fb && typeof fb.onAuth === 'function') {
      fb.onAuth(function (user) {
        updateAuthUi(user);
        dispatchAuthChanged(user);
      });
    } else {
      updateAuthUi(null);
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
