(function () {
  'use strict';

  var AUTH_HINT_KEY = 'ws-auth-signed-in';
  var AUTH_LABEL_KEY = 'ws-auth-label';
  var AUTH_EMAIL_KEY = 'ws-auth-email';
  var AUTH_PHOTO_KEY = 'ws-auth-photo';
  var THEME_HINT_KEY = 'ws-theme';

  var container = document.querySelector('[data-navbar]');
  if (!container) return;

  var templatePath = container.getAttribute('data-navbar-template') || '/assets/partials/navbar.html';
  var pageTitle = container.getAttribute('data-page-title') || document.title;
  var menuOpen = false;
  var currentAuthUser = null;

  function ensureAuthMenuStyles() {
    if (document.getElementById('nav-auth-menu-styles')) return;
    var style = document.createElement('style');
    style.id = 'nav-auth-menu-styles';
    style.textContent = [
      '.nav-auth-menu{position:relative;}',
      '.nav-auth-avatar-btn{padding:0;overflow:hidden;}',
      '.nav-auth-avatar-img{width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;}',
      '.nav-auth-initial{font-size:0.85rem;font-weight:700;line-height:1;letter-spacing:0;}',
      '.nav-auth-dropdown{',
      'position:absolute;top:calc(100% + 8px);right:0;min-width:220px;z-index:1100;',
      'padding:8px;border-radius:12px;border:1px solid rgba(10,10,10,.12);',
      'background:#fff;box-shadow:0 12px 28px rgba(0,0,0,.14);',
      '}',
      '[data-theme="dark"] .nav-auth-dropdown{',
      'background:#1a1a1a;border-color:rgba(255,255,255,.14);',
      'box-shadow:0 12px 28px rgba(0,0,0,.45);color:#f3f3f3;',
      '}',
      '.nav-auth-dropdown[hidden]{display:none!important;}',
      '.nav-auth-dropdown-head{',
      'padding:8px 10px 10px;margin-bottom:6px;',
      'border-bottom:1px solid rgba(10,10,10,.08);',
      '}',
      '[data-theme="dark"] .nav-auth-dropdown-head{border-bottom-color:rgba(255,255,255,.1);}',
      '.nav-auth-dropdown-name{font-size:0.92rem;font-weight:700;line-height:1.3;}',
      '.nav-auth-dropdown-email{font-size:0.78rem;opacity:0.7;margin-top:2px;word-break:break-all;}',
      '.nav-auth-dropdown-item{',
      'width:100%;display:flex;align-items:center;gap:10px;',
      'padding:10px 10px;border:0;border-radius:8px;background:transparent;',
      'color:inherit;font-size:0.9rem;text-align:left;cursor:pointer;',
      '}',
      '.nav-auth-dropdown-item:hover{background:rgba(10,10,10,.06);}',
      '[data-theme="dark"] .nav-auth-dropdown-item:hover{background:rgba(255,255,255,.08);}',
      '.nav-auth-dropdown-item i{width:1rem;text-align:center;opacity:0.85;}',
      '.nav-auth-dropdown-danger{color:#b42318;}',
      '[data-theme="dark"] .nav-auth-dropdown-danger{color:#f97066;}'
    ].join('');
    document.head.appendChild(style);
  }

  function applyTheme(theme, button, icon) {
    var dark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    icon.classList.toggle('fa-sun', dark);
    icon.classList.toggle('fa-moon', !dark);
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.setAttribute('title', dark ? '切換為淺色模式' : '切換為深色模式');
    button.setAttribute('aria-label', dark ? '切換為淺色模式' : '切換為深色模式');
  }

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

  function applyThemeHintToNavbarHtml(html, theme) {
    var dark = theme === 'dark';
    var out = String(html || '');
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
      // ignore
    }
  }

  function readAuthHint() {
    try {
      if (localStorage.getItem(AUTH_HINT_KEY) !== '1') return null;
      return {
        displayName: localStorage.getItem(AUTH_LABEL_KEY) || '',
        email: localStorage.getItem(AUTH_EMAIL_KEY) || '',
        photoURL: localStorage.getItem(AUTH_PHOTO_KEY) || ''
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
        localStorage.setItem(AUTH_EMAIL_KEY, user.email || '');
        localStorage.setItem(AUTH_PHOTO_KEY, user.photoURL || '');
      } else {
        localStorage.removeItem(AUTH_HINT_KEY);
        localStorage.removeItem(AUTH_LABEL_KEY);
        localStorage.removeItem(AUTH_EMAIL_KEY);
        localStorage.removeItem(AUTH_PHOTO_KEY);
      }
    } catch (e) {
      // ignore
    }
  }

  function userInitial(user) {
    var raw = (user && (user.displayName || user.email || user.uid)) || '?';
    var ch = String(raw).trim().charAt(0);
    return ch ? ch.toUpperCase() : '?';
  }

  function setUserMenuOpen(open) {
    menuOpen = !!open;
    var btn = container.querySelector('#navAuthUserMenuBtn');
    var dropdown = container.querySelector('#navAuthUserDropdown');
    if (btn) btn.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
    if (dropdown) {
      if (menuOpen) dropdown.removeAttribute('hidden');
      else dropdown.setAttribute('hidden', '');
    }
  }

  function fillUserMenu(user) {
    var nameEl = container.querySelector('#navAuthDropdownName');
    var emailEl = container.querySelector('#navAuthDropdownEmail');
    var avatar = container.querySelector('#navAuthUserAvatar');
    var initial = container.querySelector('#navAuthUserInitial');
    var btn = container.querySelector('#navAuthUserMenuBtn');
    var name = (user && (user.displayName || user.email || user.uid)) || '';
    var email = (user && user.email) || '';
    var photo = (user && user.photoURL) || '';

    if (nameEl) nameEl.textContent = name || '已登入';
    if (emailEl) {
      emailEl.textContent = email;
      emailEl.style.display = email ? '' : 'none';
    }
    if (btn) {
      btn.title = name ? ('帳戶選單（' + name + '）') : '帳戶選單';
      btn.setAttribute('aria-label', btn.title);
    }
    if (avatar && initial) {
      if (photo) {
        avatar.hidden = false;
        avatar.src = photo;
        avatar.alt = '';
        initial.style.display = 'none';
        avatar.onerror = function () {
          avatar.hidden = true;
          initial.style.display = '';
          initial.textContent = userInitial(user);
        };
      } else {
        avatar.hidden = true;
        avatar.removeAttribute('src');
        initial.style.display = '';
        initial.textContent = userInitial(user);
      }
    }
  }

  /**
   * @param {object|null} user
   * @param {{ persist?: boolean }} [options]
   */
  function updateAuthUi(user, options) {
    var opts = options || {};
    var persist = opts.persist !== false;
    var signedIn = !!user;
    currentAuthUser = user || null;

    var btnIn = container.querySelector('#navAuthSignIn');
    var inItem = container.querySelector('#navAuthSignInItem');
    var menuItem = container.querySelector('#navAuthUserMenuItem');

    if (btnIn) btnIn.style.display = '';
    if (inItem) inItem.style.display = signedIn ? 'none' : '';
    if (menuItem) menuItem.style.display = signedIn ? '' : 'none';

    if (signedIn) fillUserMenu(user);
    else setUserMenuOpen(false);

    if (persist) writeAuthHint(user);
  }

  function applyOptimisticAuthUi() {
    var hint = readAuthHint();
    if (hint) updateAuthUi(hint, { persist: false });
  }

  function openProfile() {
    setUserMenuOpen(false);
    try {
      document.dispatchEvent(new CustomEvent('ws-auth-profile', {
        detail: { user: currentAuthUser || null }
      }));
    } catch (e) {
      // ignore
    }
    window.location.href = '/account.html';
  }

  function openFavorites() {
    setUserMenuOpen(false);
    window.location.href = '/favorites.html';
  }

  function initializeAuth() {
    ensureAuthMenuStyles();

    var btnIn = container.querySelector('#navAuthSignIn');
    var menuBtn = container.querySelector('#navAuthUserMenuBtn');
    var profileBtn = container.querySelector('#navAuthProfileBtn');
    var favoritesBtn = container.querySelector('#navAuthFavoritesBtn');
    var btnOut = container.querySelector('#navAuthSignOut');
    var fb = window.WsFirebase;

    if (!btnIn && !menuBtn) return;

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

    if (menuBtn) {
      menuBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setUserMenuOpen(!menuOpen);
      });
    }

    if (profileBtn) {
      profileBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openProfile();
      });
    }

    if (favoritesBtn) {
      favoritesBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openFavorites();
      });
    }

    if (btnOut) {
      btnOut.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setUserMenuOpen(false);
        if (!fb || !fb.ready) return;
        fb.signOut().catch(function (err) {
          console.error(err);
          alert('登出失敗：' + (err && err.message ? err.message : err));
        });
      });
    }

    document.addEventListener('click', function (e) {
      if (!menuOpen) return;
      var menuItem = container.querySelector('#navAuthUserMenuItem');
      if (menuItem && menuItem.contains(e.target)) return;
      setUserMenuOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setUserMenuOpen(false);
    });

    if (fb && fb.ready && typeof fb.onAuth === 'function') {
      fb.onAuth(function (user) {
        updateAuthUi(user);
        dispatchAuthChanged(user);
      });
    } else if (!readAuthHint()) {
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

    var currentTheme = resolveThemeHint();
    applyTheme(currentTheme, button, icon);
    if (themeItem) themeItem.style.removeProperty('display');

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
