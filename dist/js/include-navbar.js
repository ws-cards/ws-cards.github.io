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
    })
    .catch(function (error) {
      console.error(error);
      container.setAttribute('data-navbar-error', 'true');
    });
})();
