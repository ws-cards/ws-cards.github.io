/**
 * 牌組編成圖匯出（html2canvas）
 * 版面參考常見 Deck 分享圖：標題 + 統計卡 + 卡面網格（CX 橫放、其餘直放）。
 */
(function (global) {
  "use strict";

  var COLOR_ORDER = ["yellow", "green", "red", "blue"];
  var COLOR_LABEL = { yellow: "黃", green: "綠", red: "赤", blue: "青" };
  var COLOR_HEX = {
    yellow: "#eab308",
    green: "#16a34a",
    red: "#dc2626",
    blue: "#2563eb"
  };
  var LEVEL_BAR = {
    0: "#5dade2",
    1: "#58d68d",
    2: "#f4d03f",
    3: "#e74c3c",
    cx: "#9b59b6"
  };
  var LEVEL_ORDER = [0, 1, 2, 3, "cx"];

  function normalizeCardNo(cardNo) {
    return String(cardNo || "").trim().replace(/\\/g, "/");
  }

  function normalizeColorKey(color) {
    var c = String(color || "");
    if (/黃|黄|yellow/i.test(c)) return "yellow";
    if (/綠|緑|green/i.test(c)) return "green";
    if (/赤|紅|red/i.test(c)) return "red";
    if (/青|藍|blue/i.test(c)) return "blue";
    return "";
  }

  function parseLevel(value) {
    if (value == null || value === "") return null;
    var n = Number(value);
    if (!isFinite(n)) return null;
    n = Math.floor(n);
    if (n < 0 || n > 3) return null;
    return n;
  }

  function isCxKind(kindClass, kindLabel) {
    var k = String(kindClass || kindLabel || "").toLowerCase();
    return /cx|名場|climax|クライ/.test(k);
  }

  function hasMeaningfulTrigger(trigger, triggerMap) {
    var raw = String(trigger == null ? "" : trigger).trim();
    if (!raw) return false;
    var upper = raw.toUpperCase();
    if (upper === "0" || upper === "NONE" || upper === "-" || upper === "?") return false;
    if (triggerMap && typeof triggerMap.fromCode === "function") {
      var t = triggerMap.fromCode(raw);
      if (t && t.id === "none") return false;
    }
    return true;
  }

  function triggerAxisLabel(trigger, triggerMap) {
    if (!triggerMap) return "";
    if (typeof triggerMap.axisLabelForCode === "function") {
      return triggerMap.axisLabelForCode(trigger) || "";
    }
    if (typeof triggerMap.labelForCode === "function") {
      return triggerMap.labelForCode(trigger) || "";
    }
    return "";
  }

  function cardImageUrl(cardNo) {
    if (global.WsDecklog && typeof global.WsDecklog.wsImageUrlFromCardNo === "function") {
      return global.WsDecklog.wsImageUrlFromCardNo(cardNo);
    }
    var cn = normalizeCardNo(cardNo);
    var m = cn.match(/^([A-Za-z0-9]+)\/([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
    if (!m) return "";
    var folder = (m[1] + "_" + m[2]).toLowerCase();
    var num = m[3].toLowerCase();
    return "https://imgs.devilfox.net/ws/" + folder + "/" + folder + "_" + num + ".png";
  }

  function fallbackImageUrl(cardNo) {
    var cardNum = normalizeCardNo(cardNo);
    if (!cardNum || cardNum.indexOf("-") < 0) return "";
    var cardFirst = cardNum.substr(0, 1);
    var cardSecond = cardNum.substr(0, cardNum.indexOf("-")).replace("/", "_");
    var cardThird = cardNum.replace("/", "_").replace("-", "_");
    return (
      "https://ws-tcg.com/wordpress/wp-content/images/cardlist/" +
      cardFirst.toLowerCase() +
      "/" +
      cardSecond.toLowerCase() +
      "/" +
      cardThird.toLowerCase() +
      ".png"
    );
  }

  function enrichDeckCards(deck) {
    var entries = (deck && deck.cards) || [];
    var need = entries.map(function (c) {
      return {
        cardNo: normalizeCardNo(c.cardNumber || c.cardNo),
        name: c.cardName || c.name || "",
        qty: c.qty || 1
      };
    }).filter(function (c) { return !!c.cardNo; });

    if (!need.length) return Promise.resolve([]);

    var enrich = global.WsDecklog && typeof global.WsDecklog.enrichCards === "function"
      ? global.WsDecklog.enrichCards
      : null;

    var base = need.map(function (c) {
      return {
        cardNo: c.cardNo,
        name: c.name || c.cardNo,
        qty: Math.max(1, parseInt(c.qty, 10) || 1),
        kindClass: "",
        color: "",
        level: null,
        trigger: "",
        imageUrl: cardImageUrl(c.cardNo)
      };
    });

    if (!enrich) return Promise.resolve(base);

    return enrich(need.map(function (c) {
      return { cardNo: c.cardNo, name: c.name || c.cardNo };
    })).then(function (rows) {
      var byNo = {};
      (rows || []).forEach(function (row) {
        var key = normalizeCardNo(row && (row.cardNo || row.cardNumber));
        if (key) byNo[key] = row;
      });
      return base.map(function (c) {
        var row = byNo[c.cardNo];
        if (!row) return c;
        return {
          cardNo: c.cardNo,
          name: row.name || c.name,
          qty: c.qty,
          kindClass: row.kindClass || "",
          kindLabel: row.kindLabel || "",
          color: row.color || "",
          level: parseLevel(row.level),
          trigger: row.trigger || "",
          imageUrl: row.imageUrl || c.imageUrl || cardImageUrl(c.cardNo)
        };
      });
    });
  }

  function computeStats(cards, triggerMap) {
    var total = 0;
    var colorCount = { yellow: 0, green: 0, red: 0, blue: 0 };
    var levelCount = { 0: 0, 1: 0, 2: 0, 3: 0, cx: 0 };
    var triggerHits = 0;
    var cxGroups = [];

    cards.forEach(function (c) {
      var qty = Math.max(0, c.qty || 0);
      if (!qty) return;
      total += qty;
      var colorKey = normalizeColorKey(c.color);
      if (colorKey && Object.prototype.hasOwnProperty.call(colorCount, colorKey)) {
        colorCount[colorKey] += qty;
      }
      var isCx = isCxKind(c.kindClass, c.kindLabel);
      if (isCx) {
        levelCount.cx += qty;
        var axis = triggerAxisLabel(c.trigger, triggerMap) || "CX";
        cxGroups.push({
          name: c.name || c.cardNo,
          axis: axis,
          colorKey: colorKey,
          qty: qty,
          trigger: c.trigger || ""
        });
      } else {
        var lv = parseLevel(c.level);
        if (lv == null) lv = 0;
        levelCount[lv] = (levelCount[lv] || 0) + qty;
      }
      if (hasMeaningfulTrigger(c.trigger, triggerMap)) triggerHits += qty;
    });

    return {
      total: total,
      colorCount: colorCount,
      levelCount: levelCount,
      triggerHits: triggerHits,
      triggerRate: total ? Math.round((triggerHits / total) * 100) : 0,
      cxGroups: cxGroups
    };
  }

  function sortCardsForGrid(cards) {
    return cards.slice().sort(function (a, b) {
      var cxA = isCxKind(a.kindClass, a.kindLabel) ? 0 : 1;
      var cxB = isCxKind(b.kindClass, b.kindLabel) ? 0 : 1;
      if (cxA !== cxB) return cxA - cxB;
      if (cxA === 0) {
        return String(a.cardNo).localeCompare(String(b.cardNo));
      }
      var lvA = parseLevel(a.level);
      var lvB = parseLevel(b.level);
      if (lvA == null) lvA = -1;
      if (lvB == null) lvB = -1;
      // 高 Level 在前（終盤卡較顯眼），再比卡號
      if (lvA !== lvB) return lvB - lvA;
      return String(a.cardNo).localeCompare(String(b.cardNo));
    });
  }

  function el(tag, styles, attrs) {
    var node = document.createElement(tag);
    if (styles) {
      Object.keys(styles).forEach(function (k) {
        node.style[k] = styles[k];
      });
    }
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function buildStatsPanel(stats) {
    var panel = el("div", {
      border: "1px solid #d8dde6",
      borderRadius: "16px",
      padding: "18px 20px 14px",
      background: "#fff",
      boxSizing: "border-box"
    });

    var top = el("div", {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "14px",
      flexWrap: "wrap"
    });

    var total = el("div", {
      fontSize: "36px",
      fontWeight: "800",
      letterSpacing: "0.02em",
      color: "#111827",
      lineHeight: "1.1"
    }, { text: stats.total + " 枚" });
    top.appendChild(total);

    var colors = el("div", {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px 16px",
      alignItems: "center",
      fontSize: "16px",
      fontWeight: "600",
      color: "#374151"
    });
    COLOR_ORDER.forEach(function (key) {
      var n = stats.colorCount[key] || 0;
      if (!n) return;
      var item = el("span", { display: "inline-flex", alignItems: "center", gap: "5px" });
      item.appendChild(el("span", {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        background: COLOR_HEX[key],
        display: "inline-block"
      }));
      item.appendChild(document.createTextNode(COLOR_LABEL[key] + " " + n));
      colors.appendChild(item);
    });
    top.appendChild(colors);
    panel.appendChild(top);

    var triggerLine = el("div", {
      marginTop: "10px",
      fontSize: "16px",
      fontWeight: "600",
      color: "#4b5563"
    }, {
      text: "トリガー率 " + stats.triggerRate + "%（" + stats.triggerHits + "/" + stats.total + "）"
    });
    panel.appendChild(triggerLine);

    var bar = el("div", {
      marginTop: "12px",
      height: "14px",
      borderRadius: "999px",
      overflow: "hidden",
      display: "flex",
      background: "#eef2f7"
    });
    LEVEL_ORDER.forEach(function (key) {
      var n = stats.levelCount[key] || 0;
      if (!n || !stats.total) return;
      var seg = el("div", {
        width: ((n / stats.total) * 100).toFixed(3) + "%",
        background: LEVEL_BAR[key],
        height: "100%"
      });
      bar.appendChild(seg);
    });
    panel.appendChild(bar);

    var legend = el("div", {
      marginTop: "10px",
      display: "flex",
      flexWrap: "wrap",
      gap: "10px 16px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#4b5563"
    });
    var legendItems = [
      { key: 0, label: "Lv 0" },
      { key: 1, label: "Lv 1" },
      { key: 2, label: "Lv 2" },
      { key: 3, label: "Lv 3" },
      { key: "cx", label: "CX" }
    ];
    legendItems.forEach(function (item) {
      var n = stats.levelCount[item.key] || 0;
      var row = el("span", { display: "inline-flex", alignItems: "center", gap: "6px" });
      row.appendChild(el("span", {
        width: "12px",
        height: "12px",
        borderRadius: "3px",
        background: LEVEL_BAR[item.key],
        display: "inline-block"
      }));
      var suffix = item.key === "cx" ? (" " + n + "/8") : (" " + n);
      row.appendChild(document.createTextNode(item.label + suffix));
      legend.appendChild(row);
    });
    panel.appendChild(legend);

    if (stats.cxGroups && stats.cxGroups.length) {
      var cxRow = el("div", {
        marginTop: "12px",
        display: "flex",
        flexWrap: "wrap",
        gap: "10px 16px",
        alignItems: "center"
      });
      stats.cxGroups.forEach(function (g) {
        var chip = el("span", {
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          fontSize: "14px",
          fontWeight: "600",
          color: "#374151",
          maxWidth: "100%"
        });
        chip.appendChild(el("span", {
          width: "14px",
          height: "14px",
          borderRadius: "3px",
          background: COLOR_HEX[g.colorKey] || LEVEL_BAR.cx,
          display: "inline-block",
          flex: "0 0 auto"
        }));
        var label = (g.axis ? ("【" + g.axis + "】") : "") + (g.name || "");
        if (g.qty > 1) label += " ×" + g.qty;
        chip.appendChild(el("span", {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "360px"
        }, { text: label }));
        cxRow.appendChild(chip);
      });
      panel.appendChild(cxRow);
    }

    return panel;
  }

  function buildCardTile(card) {
    var isCx = isCxKind(card.kindClass, card.kindLabel);
    var colorKey = normalizeColorKey(card.color);
    var border = COLOR_HEX[colorKey] || "#cbd5e1";
    // 版面卡面加大；實際輸出再乘 html2canvas scale
    var tile = el("div", {
      width: isCx ? "140px" : "110px",
      height: isCx ? "100px" : "154px",
      borderRadius: "8px",
      overflow: "hidden",
      border: "3px solid " + border,
      background: "#f8fafc",
      boxSizing: "border-box",
      flex: "0 0 auto",
      position: "relative"
    });
    var img = el("img", {
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center top"
    });
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.alt = card.cardNo || "";
    var primary = card.imageUrl || cardImageUrl(card.cardNo);
    var fallback = fallbackImageUrl(card.cardNo);
    img.setAttribute("data-fallback", fallback);
    img.onerror = function () {
      var next = img.getAttribute("data-fallback");
      if (next && img.src !== next) {
        img.removeAttribute("data-fallback");
        img.crossOrigin = "anonymous";
        img.src = next;
        return;
      }
      img.style.display = "none";
    };
    if (primary) img.src = primary;
    tile.appendChild(img);
    return tile;
  }

  function buildExportDom(deck, cards, stats) {
    var wrap = el("div", {
      background: "#ffffff",
      padding: "28px 28px 22px",
      width: "1480px",
      boxSizing: "border-box",
      fontFamily: '"Zen Kaku Gothic New","Noto Sans TC",system-ui,sans-serif',
      color: "#111827",
      position: "fixed",
      top: "-99999px",
      left: "-99999px",
      zIndex: "-1"
    });

    wrap.appendChild(el("div", {
      fontSize: "40px",
      fontWeight: "800",
      letterSpacing: "0.04em",
      marginBottom: "16px",
      lineHeight: "1.25",
      wordBreak: "break-word"
    }, { text: (deck && deck.name) || "未命名牌組" }));

    wrap.appendChild(buildStatsPanel(stats));

    var grid = el("div", {
      marginTop: "20px",
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      alignContent: "flex-start"
    });

    sortCardsForGrid(cards).forEach(function (card) {
      var qty = Math.max(0, card.qty || 0);
      for (var i = 0; i < qty; i++) {
        grid.appendChild(buildCardTile(card));
      }
    });
    wrap.appendChild(grid);

    wrap.appendChild(el("div", {
      marginTop: "18px",
      fontSize: "13px",
      color: "#9ca3af",
      textAlign: "right",
      letterSpacing: "0.08em"
    }, { text: "WS-Cards · 牌組圖" }));

    return wrap;
  }

  function waitForImages(root, timeoutMs) {
    var imgs = root.querySelectorAll("img");
    var limit = timeoutMs || 12000;
    return Promise.all(Array.prototype.map.call(imgs, function (img) {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(function (resolve) {
        var done = false;
        function finish() {
          if (done) return;
          done = true;
          resolve();
        }
        img.addEventListener("load", finish);
        img.addEventListener("error", finish);
        setTimeout(finish, limit);
      });
    }));
  }

  function downloadCanvas(canvas, filename) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error("無法產生圖片（可能是卡圖跨域限制）"));
            return;
          }
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
          resolve();
        }, "image/png");
      } catch (e) {
        reject(e);
      }
    });
  }

  function safeFilename(name) {
    return String(name || "deck")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40) || "deck";
  }

  /**
   * @param {object} deck
   * @param {object} [opts]
   * @returns {Promise<{total:number}>}
   */
  function exportDeckImage(deck, opts) {
    opts = opts || {};
    if (!deck || !(deck.cards || []).length) {
      return Promise.reject(new Error("牌組尚無卡片，無法輸出圖片"));
    }
    var h2c = opts.html2canvas || global.html2canvas;
    if (typeof h2c !== "function") {
      return Promise.reject(new Error("html2canvas 尚未載入"));
    }
    var triggerMap = opts.triggerMap || global.WsTriggerMap || null;
    var onProgress = typeof opts.onProgress === "function" ? opts.onProgress : function () {};

    onProgress("正在讀取卡片資料…");
    return enrichDeckCards(deck).then(function (cards) {
      if (!cards.length) throw new Error("找不到可輸出的卡片");
      var stats = computeStats(cards, triggerMap);
      if (!stats.total) throw new Error("牌組張數為 0");
      onProgress("正在載入卡面…");
      var wrap = buildExportDom(deck, cards, stats);
      document.body.appendChild(wrap);
      return waitForImages(wrap, 15000).then(function () {
        onProgress("正在產生圖片…");
        return h2c(wrap, {
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: false,
          // 預設 3x：版面約 1480px → 輸出寬約 4440px
          scale: opts.scale || 3,
          logging: false,
          imageTimeout: 15000
        }).then(function (canvas) {
          if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
          var filename = safeFilename(deck.name) + ".png";
          onProgress("正在下載…");
          return downloadCanvas(canvas, filename).then(function () {
            return { total: stats.total, filename: filename };
          });
        }).catch(function (err) {
          if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
          throw err;
        });
      }).catch(function (err) {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        throw err;
      });
    });
  }

  global.WsDeckImageExport = {
    exportDeckImage: exportDeckImage,
    computeStats: computeStats
  };
})(window);
