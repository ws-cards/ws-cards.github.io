/**
 * WS-Cards 全頁載入進度 overlay（百分比）
 * ------------------------------------------------
 * 用法：
 *   WsPageLoader.configure([{ id: 'fonts', weight: 20, label: '字體…' }, ...]);
 *   WsPageLoader.mark('fonts');
 *   WsPageLoader.complete(); // 或等所有 mark 齊再自動 complete
 *
 * DOM 約定（#wsPageLoader）：
 *   [data-loader-fill]  進度條填充
 *   [data-loader-pct]   百分比文字
 *   [data-loader-label] 階段說明
 */
(function (global) {
  'use strict';

  var root = null;
  var fill = null;
  var pctEl = null;
  var labelEl = null;
  var current = 0;
  var finished = false;
  var marks = Object.create(null);
  var totalWeight = 0;
  var earnedWeight = 0;
  var safetyTimer = null;
  var hideTimer = null;
  var autoComplete = true;

  function clamp(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function ensureEls() {
    if (root && fill && pctEl) return true;
    root = document.getElementById('wsPageLoader');
    if (!root) return false;
    fill = root.querySelector('[data-loader-fill]');
    pctEl = root.querySelector('[data-loader-pct]');
    labelEl = root.querySelector('[data-loader-label]');
    return true;
  }

  function paint(pct, label) {
    if (!ensureEls()) return;
    current = clamp(pct);
    if (fill) fill.style.width = current + '%';
    if (pctEl) pctEl.textContent = current + '%';
    if (label != null && labelEl && label !== '') {
      labelEl.textContent = label;
    }
    root.setAttribute('aria-valuenow', String(current));
    root.setAttribute('aria-busy', finished ? 'false' : 'true');
  }

  function allMarked() {
    for (var id in marks) {
      if (Object.prototype.hasOwnProperty.call(marks, id) && !marks[id].done) {
        return false;
      }
    }
    return totalWeight > 0;
  }

  function recompute(label) {
    if (finished || totalWeight <= 0) return;
    var pct = (earnedWeight / totalWeight) * 100;
    // 未全部完成前最多顯示 99%，避免提早跳到 100%
    paint(allMarked() ? 100 : Math.min(99, pct), label);
    if (autoComplete && allMarked()) {
      api.complete(label);
    }
  }

  var api = {
    /**
     * @param {Array<{id:string, weight?:number, label?:string}>} items
     * @param {{autoComplete?:boolean}} [opts]
     */
    configure: function (items, opts) {
      finished = false;
      totalWeight = 0;
      earnedWeight = 0;
      marks = Object.create(null);
      autoComplete = !(opts && opts.autoComplete === false);
      (items || []).forEach(function (item) {
        if (!item || !item.id) return;
        var w = Number(item.weight);
        if (!(w > 0)) w = 1;
        marks[item.id] = {
          weight: w,
          done: false,
          label: item.label || ''
        };
        totalWeight += w;
      });
      if (ensureEls()) {
        root.removeAttribute('hidden');
        root.setAttribute('aria-hidden', 'false');
        root.classList.remove('is-done');
      }
      document.documentElement.classList.remove('page-ready');
      paint(0, (items && items[0] && items[0].label) || '載入中…');
    },

    mark: function (id, label) {
      if (finished) return;
      var m = marks[id];
      if (!m) return;
      if (!m.done) {
        m.done = true;
        earnedWeight += m.weight;
      }
      recompute(label || m.label || undefined);
    },

    set: function (pct, label) {
      if (finished) return;
      paint(pct, label);
    },

    complete: function (label) {
      if (finished) return;
      finished = true;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      paint(100, label || '完成');
      if (!ensureEls()) {
        document.documentElement.classList.add('page-ready');
        return;
      }
      root.classList.add('is-done');
      document.documentElement.classList.add('page-ready');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!root) return;
        root.setAttribute('hidden', '');
        root.setAttribute('aria-hidden', 'true');
        root.setAttribute('aria-busy', 'false');
      }, 480);
    },

    isDone: function () {
      return finished;
    },

    /** 保底：逾時強制關閉，避免永遠卡在 overlay */
    armSafety: function (ms) {
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(function () {
        api.complete('完成');
      }, typeof ms === 'number' ? ms : 10000);
    }
  };

  global.WsPageLoader = api;
})(typeof window !== 'undefined' ? window : this);
