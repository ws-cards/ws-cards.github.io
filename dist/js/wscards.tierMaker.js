(function () {
  'use strict';

  var STORAGE_KEY = 'ws-tier-maker-series-v1';
  var DATA_URL = 'cardTitle.json';
  var tierDefinitions = [
    { id: 'S', label: 'S', color: '#e74c3c' },
    { id: 'A', label: 'A', color: '#ed8b32' },
    { id: 'B', label: 'B', color: '#e1b92f' },
    { id: 'C', label: 'C', color: '#80a94d' },
    { id: 'D', label: 'D', color: '#7097b2' }
  ];
  var state = { cards: [], unranked: [], tiers: {} };
  var draggedId = null;
  var els = {};

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
  }

  function imageUrl(code) {
    var match = String(code).match(/^([^/]+)\/([^-]+)-(.+)$/);
    var seriesOnly = String(code).match(/^([^/]+)\/([^/]+)$/);
    if (!match && !seriesOnly) return '';
    if (!match) {
      var seriesCode = seriesOnly[1].toLowerCase();
      var expansionCode = seriesOnly[2].toLowerCase();
      var seriesFolder = seriesCode === 'srd' || seriesCode === 'sks' ? 'sxx_' + expansionCode : seriesCode + '_' + expansionCode;
      return 'https://ws-tcg.com/wordpress/wp-content/images/cardlist/' + seriesCode.charAt(0) + '/' + seriesFolder + '/' + seriesCode + '_' + expansionCode + '_001.png';
    }
    var series = match[1].toLowerCase();
    var expansion = match[2].toLowerCase();
    var id = match[3].replace(/\s+/g, '').toLowerCase();
    if (series.indexOf('os') === 0) {
      return 'https://ws-rose.com/wordpress/wp-content/images/cardlist/' + series + '/' + expansion + '/' + series + '_' + expansion + '_' + id + '.png';
    }
    var folder = series === 'srd' || series === 'sks' ? 'sxx_' + expansion : series + '_' + expansion;
    return 'https://ws-tcg.com/wordpress/wp-content/images/cardlist/' + series.charAt(0) + '/' + folder + '/' + series + '_' + expansion + '_001.png';
  }

  function normalizeCards(raw) {
    return Object.keys(raw || {}).map(function (code) {
      return { id: code, code: code, name: String(raw[code] || code), image: imageUrl(code) };
    });
  }

  function defaultState(cards) {
    var tiers = {};
    tierDefinitions.forEach(function (tier) { tiers[tier.id] = []; });
    return { cards: cards, unranked: cards.map(function (card) { return card.id; }), tiers: tiers };
  }

  function cardMap() {
    return state.cards.reduce(function (map, card) { map[card.id] = card; return map; }, {});
  }

  function restoreState(cards) {
    var fresh = defaultState(cards);
    var valid = cards.reduce(function (map, card) { map[card.id] = true; return map; }, {});
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || !Array.isArray(saved.unranked) || !saved.tiers) return fresh;
      var used = {};
      var take = function (id) {
        if (valid[id] && !used[id]) { used[id] = true; return id; }
        return null;
      };
      fresh.unranked = saved.unranked.map(take).filter(Boolean);
      tierDefinitions.forEach(function (tier) {
        var values = Array.isArray(saved.tiers[tier.id]) ? saved.tiers[tier.id] : [];
        fresh.tiers[tier.id] = values.map(take).filter(Boolean);
      });
      cards.forEach(function (card) { if (!used[card.id]) fresh.unranked.push(card.id); });
    } catch (error) {
      setStatus('找不到可恢復的分級結果，已使用新的空白表。', 'info');
    }
    return fresh;
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ unranked: state.unranked, tiers: state.tiers }));
    } catch (error) {
      setStatus('瀏覽器無法保存目前結果；本頁仍可繼續操作。', 'error');
    }
  }

  function setStatus(message, type) {
    if (!els.status) return;
    els.status.textContent = message || '';
    els.status.dataset.type = type || '';
  }

  function announce(message) {
    if (els.live) els.live.textContent = message;
  }

  function findLocation(id) {
    var location = { group: 'unranked', index: state.unranked.indexOf(id) };
    tierDefinitions.some(function (tier) {
      var index = state.tiers[tier.id].indexOf(id);
      if (index !== -1) { location = { group: tier.id, index: index }; return true; }
      return false;
    });
    return location;
  }

  function removeFromCurrent(id) {
    var location = findLocation(id);
    if (location.index < 0) return;
    var source = location.group === 'unranked' ? state.unranked : state.tiers[location.group];
    source.splice(location.index, 1);
  }

  function moveCard(id, targetGroup, targetIndex) {
    var card = cardMap()[id];
    if (!card || !state.tiers[targetGroup] && targetGroup !== 'unranked') return;
    removeFromCurrent(id);
    var target = targetGroup === 'unranked' ? state.unranked : state.tiers[targetGroup];
    var index = Math.max(0, Math.min(Number(targetIndex) || 0, target.length));
    target.splice(index, 0, id);
    persistState();
    render();
    announce(card.name + ' 已移至 ' + (targetGroup === 'unranked' ? '未分級' : targetGroup + ' Tier') + '。');
  }

  function createCard(card, currentGroup) {
    var article = document.createElement('article');
    article.className = 'tier-card';
    article.draggable = true;
    article.dataset.cardId = card.id;
    article.tabIndex = 0;
    article.setAttribute('aria-label', card.name + '，目前位於 ' + (currentGroup === 'unranked' ? '未分級' : currentGroup + ' Tier'));
    article.innerHTML = '<div class="tier-card__image-wrap"><img class="tier-card__image" src="' + escapeHtml(card.image) + '" alt="' + escapeHtml(card.name) + '" loading="lazy"></div>' +
      '<div class="tier-card__meta"><span class="tier-card__name">' + escapeHtml(card.name) + '</span><span class="tier-card__code">' + escapeHtml(card.code) + '</span></div>' +
      '<select class="tier-card__move" aria-label="移動 ' + escapeHtml(card.name) + '"><option value="">移動至…</option><option value="unranked">未分級</option>' +
      tierDefinitions.map(function (tier) { return '<option value="' + tier.id + '">' + tier.id + ' Tier</option>'; }).join('') + '</select>';
    var img = article.querySelector('img');
    img.addEventListener('error', function () {
      img.removeAttribute('src');
      img.classList.add('is-fallback');
      img.alt = '尚無代表圖：' + card.code;
      img.parentElement.textContent = card.code;
      img.parentElement.classList.add('tier-card__image-wrap--fallback');
    });
    article.addEventListener('dragstart', function (event) {
      draggedId = card.id;
      article.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.id);
    });
    article.addEventListener('dragend', function () { article.classList.remove('is-dragging'); draggedId = null; });
    article.addEventListener('touchstart', function () {
      draggedId = card.id;
      article.classList.add('is-dragging');
    }, { passive: true });
    article.addEventListener('touchmove', function (event) {
      if (event.touches.length !== 1 || !draggedId) return;
      event.preventDefault();
      var point = event.touches[0];
      var target = document.elementFromPoint(point.clientX, point.clientY);
      var items = target && target.closest('.tier-items');
      document.querySelectorAll('.tier-items.is-over').forEach(function (element) { element.classList.remove('is-over'); });
      if (items) items.classList.add('is-over');
    }, { passive: false });
    article.addEventListener('touchend', function (event) {
      if (!draggedId) return;
      var point = event.changedTouches[0];
      var target = document.elementFromPoint(point.clientX, point.clientY);
      var items = target && target.closest('.tier-items');
      article.classList.remove('is-dragging');
      document.querySelectorAll('.tier-items.is-over').forEach(function (element) { element.classList.remove('is-over'); });
      if (!items) { draggedId = null; return; }
      var group = items.id === 'tierItemsUnranked' ? 'unranked' : items.id.replace('tierItems', '');
      var cards = Array.prototype.slice.call(items.querySelectorAll('.tier-card')).filter(function (element) { return element !== article; });
      var index = cards.length;
      var next = cards.findIndex(function (element) {
        return point.clientY < element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2;
      });
      if (next !== -1) index = next;
      moveCard(card.id, group, index);
      draggedId = null;
    }, { passive: true });
    article.querySelector('select').addEventListener('change', function (event) {
      if (event.target.value) moveCard(card.id, event.target.value, 9999);
      event.target.value = '';
    });
    return article;
  }

  function renderGroup(container, ids, group) {
    container.innerHTML = '';
    var map = cardMap();
    var query = (els.search.value || '').trim().toLowerCase();
    var visible = ids.filter(function (id) {
      var card = map[id];
      return card && (!query || (card.name + ' ' + card.code).toLowerCase().indexOf(query) !== -1);
    });
    if (!visible.length && query) {
      container.innerHTML = '<div class="tier-empty">沒有符合「' + escapeHtml(query) + '」的系列</div>';
      return;
    }
    visible.forEach(function (id) { container.appendChild(createCard(map[id], group)); });
  }

  function addDropEvents(container, group) {
    container.addEventListener('dragover', function (event) {
      if (!draggedId) return;
      event.preventDefault();
      container.classList.add('is-over');
    });
    container.addEventListener('dragleave', function (event) {
      if (event.target === container) container.classList.remove('is-over');
    });
    container.addEventListener('drop', function (event) {
      event.preventDefault();
      container.classList.remove('is-over');
      var id = event.dataTransfer.getData('text/plain') || draggedId;
      if (!id) return;
      var cards = Array.prototype.slice.call(container.querySelectorAll('.tier-card'));
      var index = cards.length;
      var next = cards.findIndex(function (card) { return event.clientY < card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2; });
      if (next !== -1) index = next;
      moveCard(id, group, index);
    });
  }

  function render() {
    renderGroup(els.unranked, state.unranked, 'unranked');
    tierDefinitions.forEach(function (tier) { renderGroup(byId('tierItems' + tier.id), state.tiers[tier.id], tier.id); });
    var ranked = tierDefinitions.reduce(function (sum, tier) { return sum + state.tiers[tier.id].length; }, 0);
    els.total.textContent = state.cards.length;
    els.ranked.textContent = ranked;
    els.remaining.textContent = state.unranked.length;
  }

  function resetState() {
    if (!window.confirm('確定要清除目前所有分級結果嗎？')) return;
    state = defaultState(state.cards);
    persistState();
    render();
    setStatus('已重設為未分級狀態。', 'info');
    announce('已重設所有分級結果。');
  }

  function exportImage() {
    var button = els.exportButton;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 準備匯出';
    var canvas = document.createElement('canvas');
    var width = 1600;
    var rowHeight = 190;
    var height = 150 + tierDefinitions.length * rowHeight;
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext('2d');
    context.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#171817' : '#f4f1e8';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#20201d';
    context.font = 'bold 44px sans-serif';
    context.fillText('WS-Cards Tier Maker', 48, 62);
    context.font = '24px sans-serif';
    context.fillText('系列／套組分級結果', 50, 105);
    var map = cardMap();
    var jobs = [];
    tierDefinitions.forEach(function (tier, row) {
      var y = 150 + row * rowHeight;
      context.fillStyle = tier.color;
      context.fillRect(0, y, 120, 180);
      context.fillStyle = '#ffffff';
      context.font = 'bold 44px sans-serif';
      context.fillText(tier.label, 42, y + 106);
      state.tiers[tier.id].forEach(function (id, index) {
        var card = map[id];
        if (!card) return;
        jobs.push(loadImage(card.image).then(function (image) {
          var x = 132 + index * 112;
          if (image) context.drawImage(image, x, y + 10, 96, 120);
          context.fillStyle = '#20201d';
          context.font = '12px sans-serif';
          context.fillText(card.code.slice(0, 16), x, y + 148);
        }));
      });
    });
    Promise.all(jobs).then(function () {
      var link = document.createElement('a');
      link.download = 'ws-cards-tier-result.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatus('結果圖片已準備下載。', 'info');
    }).catch(function () { setStatus('匯出失敗，請稍後再試。', 'error'); }).finally(function () {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i> 匯出結果';
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = function () { resolve(image); };
      image.onerror = function () { resolve(null); };
      image.src = src;
    });
  }

  function init() {
    els = {
      search: byId('tierSearch'), status: byId('tierStatus'), live: byId('tierLive'),
      unranked: byId('tierItemsUnranked'), total: byId('tierTotal'), ranked: byId('tierRanked'), remaining: byId('tierRemaining'),
      exportButton: byId('tierExport'), resetButton: byId('tierReset')
    };
    tierDefinitions.forEach(function (tier) { addDropEvents(byId('tierItems' + tier.id), tier.id); });
    addDropEvents(els.unranked, 'unranked');
    els.search.addEventListener('input', render);
    els.resetButton.addEventListener('click', resetState);
    els.exportButton.addEventListener('click', exportImage);
    fetch(DATA_URL, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (raw) {
      state = restoreState(normalizeCards(raw));
      render();
      setStatus('資料已載入，可拖曳系列到不同 Tier。手機或鍵盤可使用每張卡片的「移動至…」選單。', 'info');
    }).catch(function () {
      setStatus('系列資料載入失敗。請以本機 HTTP server 開啟此頁面，而不是直接使用 file://。', 'error');
      els.unranked.innerHTML = '<div class="tier-loading">無法讀取 cardTitle.json</div>';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
}());
