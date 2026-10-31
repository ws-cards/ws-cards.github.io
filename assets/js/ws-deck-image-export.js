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
  /** Level 長條圖色（對齊分析頁／附圖風格：青→紫） */
  var LEVEL_CHART = {
    0: "#2ec4b6",
    1: "#5ecfc4",
    2: "#7eb6e8",
    3: "#9aa8eb"
  };
  var LEVEL_KEYS = [0, 1, 2, 3];
  /** 舊水平條／CX 標示仍用 */
  var LEVEL_BAR = {
    0: "#2ec4b6",
    1: "#5ecfc4",
    2: "#7eb6e8",
    3: "#9aa8eb",
    cx: "#9b59b6"
  };

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

  function isEventKind(kindClass, kindLabel) {
    if (isCxKind(kindClass, kindLabel)) return false;
    var k = String(kindClass || kindLabel || "").toLowerCase();
    return /事件|event|イベント/.test(k);
  }

  /** 0 角色／其他 → 1 事件 → 2 CX（事件在 CX 前） */
  function kindSortRank(card) {
    if (!card) return 0;
    if (isCxKind(card.kindClass, card.kindLabel)) return 2;
    if (isEventKind(card.kindClass, card.kindLabel)) return 1;
    return 0;
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

  function countSoulIconsOnCard(trigger, triggerMap) {
    var raw = String(trigger == null ? "" : trigger).trim();
    if (!raw) return 0;
    if (triggerMap && typeof triggerMap.fromCode === "function") {
      var t = triggerMap.fromCode(raw);
      if (t && Array.isArray(t.icons) && t.icons.length) {
        var n = 0;
        t.icons.forEach(function (icon) {
          if (/soul/i.test(String(icon || ""))) n += 1;
        });
        return n;
      }
      if (t && t.id === "soul2") return 2;
      if (t && t.id === "soul") return 1;
    }
    var upper = raw.toUpperCase();
    if (upper === "2" || upper === "SOUL2") return 2;
    if (upper === "1" || upper === "A" || upper === "SOUL") return 1;
    return 0;
  }

  function computeStats(cards, triggerMap) {
    var total = 0;
    var colorCount = { yellow: 0, green: 0, red: 0, blue: 0 };
    var levelCount = { 0: 0, 1: 0, 2: 0, 3: 0, cx: 0 };
    var kindCount = { character: 0, event: 0, cx: 0 };
    var triggerHits = 0;
    var soulIconCount = 0;
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
      var isEvent = isEventKind(c.kindClass, c.kindLabel);
      if (isCx) {
        levelCount.cx += qty;
        kindCount.cx += qty;
        var axis = triggerAxisLabel(c.trigger, triggerMap) || "CX";
        cxGroups.push({
          name: c.name || c.cardNo,
          axis: axis,
          colorKey: colorKey,
          qty: qty,
          trigger: c.trigger || ""
        });
      } else if (isEvent) {
        kindCount.event += qty;
        var lvE = parseLevel(c.level);
        if (lvE == null) lvE = 0;
        levelCount[lvE] = (levelCount[lvE] || 0) + qty;
      } else {
        kindCount.character += qty;
        var lv = parseLevel(c.level);
        if (lv == null) lv = 0;
        levelCount[lv] = (levelCount[lv] || 0) + qty;
      }
      if (hasMeaningfulTrigger(c.trigger, triggerMap)) triggerHits += qty;
      soulIconCount += countSoulIconsOnCard(c.trigger, triggerMap) * qty;
    });

    return {
      total: total,
      deckSize: 50,
      colorCount: colorCount,
      levelCount: levelCount,
      kindCount: kindCount,
      triggerHits: triggerHits,
      triggerRate: total ? Math.round((triggerHits / total) * 100) : 0,
      soulIconCount: soulIconCount,
      cxGroups: cxGroups
    };
  }

  function sortCardsForGrid(cards) {
    return cards.slice().sort(function (a, b) {
      // 角色 → 事件 → CX
      var rankA = kindSortRank(a);
      var rankB = kindSortRank(b);
      if (rankA !== rankB) return rankA - rankB;
      if (rankA === 2) {
        return String(a.cardNo).localeCompare(String(b.cardNo));
      }
      var lvA = parseLevel(a.level);
      var lvB = parseLevel(b.level);
      if (lvA == null) lvA = -1;
      if (lvB == null) lvB = -1;
      // 角色／事件：高 Level 在前，再比卡號
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

  function niceAxisMax(value) {
    var n = Math.max(4, Number(value) || 0);
    var step = n <= 12 ? 2 : n <= 24 ? 4 : n <= 40 ? 5 : 8;
    return Math.ceil(n / step) * step;
  }

  function buildLevelBarChart(stats) {
    // 附圖風格：數值膠囊在柱頂、標籤在柱底；用固定 px 高度避免比例錯位
    var barMaxH = 88;
    var card = el("div", {
      flex: "1 1 280px",
      minWidth: "0",
      background: "#f3f4f6",
      border: "1px solid #e5e7eb",
      borderRadius: "10px",
      padding: "10px 14px 10px",
      boxSizing: "border-box"
    });
    card.appendChild(el("div", {
      fontSize: "13px",
      fontWeight: "800",
      color: "#111827",
      textAlign: "center",
      marginBottom: "8px"
    }, { text: "Level" }));

    var maxLv = 0;
    LEVEL_KEYS.forEach(function (k) {
      maxLv = Math.max(maxLv, stats.levelCount[k] || 0);
    });
    var axisMax = Math.max(1, niceAxisMax(maxLv));

    var plot = el("div", {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-around",
      gap: "8px",
      minHeight: (barMaxH + 44) + "px"
    });

    LEVEL_KEYS.forEach(function (key) {
      var n = stats.levelCount[key] || 0;
      var h = Math.round((n / axisMax) * barMaxH);
      if (n > 0 && h < 6) h = 6;

      var col = el("div", {
        flex: "1",
        maxWidth: "72px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end"
      });

      var badge = el("div", {
        minWidth: "28px",
        padding: "2px 8px",
        borderRadius: "999px",
        background: "#4b5563",
        color: "#fff",
        fontSize: "11px",
        fontWeight: "800",
        textAlign: "center",
        lineHeight: "1.35",
        marginBottom: "4px",
        boxSizing: "border-box"
      }, { text: String(n) });
      col.appendChild(badge);

      var bar = el("div", {
        width: "58%",
        height: h + "px",
        background: LEVEL_CHART[key],
        borderRadius: "6px 6px 3px 3px"
      });
      col.appendChild(bar);

      col.appendChild(el("div", {
        marginTop: "6px",
        fontSize: "12px",
        fontWeight: "700",
        color: "#374151"
      }, { text: "Lv" + key }));

      plot.appendChild(col);
    });
    card.appendChild(plot);
    return card;
  }

  function buildCompositionBlock(stats) {
    // 左欄直向：清單在上、總張數在下
    var col = el("div", {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "2px 0 0",
      height: "100%",
      boxSizing: "border-box"
    });

    var list = el("div", {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      minWidth: "0",
      flex: "1 1 auto"
    });

    var kinds = stats.kindCount || {};
    var items = [
      { label: "角色", value: kinds.character || 0 },
      { label: "事件", value: kinds.event || 0 },
      { label: "CX", value: kinds.cx || 0 },
      { label: "Trigger 魂數", value: stats.soulIconCount || 0 }
    ];
    items.forEach(function (item) {
      var line = el("div", {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        fontWeight: "700",
        color: "#1f2937"
      });
      line.appendChild(el("span", {
        width: "3px",
        height: "15px",
        borderRadius: "2px",
        background: "#f59e0b",
        flex: "0 0 auto",
        display: "inline-block"
      }));
      line.appendChild(document.createTextNode(item.label + "：" + item.value));
      list.appendChild(line);
    });
    col.appendChild(list);

    var totalBox = el("div", {
      textAlign: "left",
      flex: "0 0 auto",
      marginTop: "auto",
      paddingTop: "4px"
    });
    var deckSize = stats.deckSize || 50;
    totalBox.appendChild(el("div", {
      fontSize: "30px",
      fontWeight: "900",
      color: "#111827",
      lineHeight: "1.05",
      letterSpacing: "0.02em",
      fontVariantNumeric: "tabular-nums"
    }, { text: stats.total + " / " + deckSize }));
    totalBox.appendChild(el("div", {
      fontSize: "14px",
      fontWeight: "700",
      color: "#6b7280",
      marginTop: "2px"
    }, { text: "枚" }));
    col.appendChild(totalBox);

    return col;
  }

  function buildColorDonutChart(stats) {
    var card = el("div", {
      flex: "1 1 240px",
      minWidth: "0",
      background: "#fafbfc",
      border: "1px solid #e8ecf1",
      borderRadius: "10px",
      padding: "10px 12px 8px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch"
    });
    card.appendChild(el("div", {
      fontSize: "13px",
      fontWeight: "800",
      color: "#111827",
      marginBottom: "4px"
    }, { text: "顏色分布" }));

    var segments = [];
    var colorTotal = 0;
    COLOR_ORDER.forEach(function (key) {
      var n = stats.colorCount[key] || 0;
      if (!n) return;
      colorTotal += n;
      segments.push({ key: key, value: n, color: COLOR_HEX[key], label: COLOR_LABEL[key] });
    });

    var chartWrap = el("div", {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "2px 0",
      flex: "1"
    });

    var size = 128;
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.style.display = "block";

    var cx = size / 2;
    var cy = size / 2;
    var radius = 42;
    var stroke = 22;
    var circumference = 2 * Math.PI * radius;

    var track = document.createElementNS(svgNS, "circle");
    track.setAttribute("cx", String(cx));
    track.setAttribute("cy", String(cy));
    track.setAttribute("r", String(radius));
    track.setAttribute("fill", "none");
    track.setAttribute("stroke", "#f3f4f6");
    track.setAttribute("stroke-width", String(stroke));
    svg.appendChild(track);

    if (colorTotal > 0 && segments.length) {
      var offset = 0;
      segments.forEach(function (seg) {
        var len = (seg.value / colorTotal) * circumference;
        var circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", String(radius));
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", seg.color);
        circle.setAttribute("stroke-width", String(stroke));
        circle.setAttribute("stroke-linecap", "butt");
        circle.setAttribute(
          "stroke-dasharray",
          len.toFixed(3) + " " + Math.max(0, circumference - len).toFixed(3)
        );
        circle.setAttribute("stroke-dashoffset", String((-offset).toFixed(3)));
        circle.setAttribute("transform", "rotate(-90 " + cx + " " + cy + ")");
        svg.appendChild(circle);
        offset += len;
      });
    }

    var hole = document.createElementNS(svgNS, "circle");
    hole.setAttribute("cx", String(cx));
    hole.setAttribute("cy", String(cy));
    hole.setAttribute("r", String(radius - stroke / 2 - 1));
    hole.setAttribute("fill", "#fafbfc");
    svg.appendChild(hole);

    chartWrap.appendChild(svg);
    card.appendChild(chartWrap);

    var legend = el("div", {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "4px",
      marginTop: "4px"
    });
    segments.forEach(function (seg) {
      var pill = el("span", {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "999px",
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontSize: "11px",
        fontWeight: "700",
        color: "#374151"
      });
      pill.appendChild(el("span", {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: seg.color,
        display: "inline-block"
      }));
      pill.appendChild(document.createTextNode(seg.label + " " + seg.value));
      legend.appendChild(pill);
    });
    if (!segments.length) {
      legend.appendChild(el("span", {
        fontSize: "11px",
        color: "#9ca3af"
      }, { text: "無顏色資料" }));
    }
    card.appendChild(legend);
    return card;
  }

  function buildSectionBox(title, bodyNode) {
    var box = el("div", {
      border: "2px solid #d1d5db",
      borderRadius: "12px",
      background: "#ffffff",
      padding: "10px 12px 12px",
      boxSizing: "border-box"
    });
    box.appendChild(el("div", {
      fontSize: "12px",
      fontWeight: "800",
      letterSpacing: "0.08em",
      color: "#6b7280",
      marginBottom: "8px",
      textTransform: "none"
    }, { text: title }));
    box.appendChild(bodyNode);
    return box;
  }

  function buildStatsPanel(stats) {
    // 左：牌組資訊；右：Level 長條 + 顏色圓環
    var panel = el("div", {
      display: "flex",
      gap: "12px",
      alignItems: "stretch",
      flexWrap: "wrap"
    });

    var left = el("div", {
      flex: "0 1 280px",
      minWidth: "200px",
      maxWidth: "340px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      boxSizing: "border-box"
    });
    left.appendChild(el("div", {
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280"
    }, {
      text: "トリガー率 " + stats.triggerRate + "%（" + stats.triggerHits + "/" + stats.total + "）"
    }));
    left.appendChild(buildCompositionBlock(stats));

    if (stats.cxGroups && stats.cxGroups.length) {
      var cxRow = el("div", {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 8px",
        alignItems: "center",
        marginTop: "4px"
      });
      stats.cxGroups.forEach(function (g) {
        var chip = el("span", {
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "11px",
          fontWeight: "600",
          color: "#374151",
          maxWidth: "100%"
        });
        chip.appendChild(el("span", {
          width: "10px",
          height: "10px",
          borderRadius: "2px",
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
          maxWidth: "220px"
        }, { text: label }));
        cxRow.appendChild(chip);
      });
      left.appendChild(cxRow);
    }
    panel.appendChild(left);

    var right = el("div", {
      flex: "1 1 520px",
      minWidth: "0",
      display: "flex",
      gap: "8px",
      alignItems: "stretch",
      flexWrap: "wrap"
    });
    right.appendChild(buildLevelBarChart(stats));
    right.appendChild(buildColorDonutChart(stats));
    panel.appendChild(right);

    return panel;
  }

  function buildCardTile(card) {
    var isCx = isCxKind(card.kindClass, card.kindLabel);
    var colorKey = normalizeColorKey(card.color);
    var border = COLOR_HEX[colorKey] || "#cbd5e1";
    // 緊密網格：卡面略縮、細框；輸出再乘 html2canvas scale
    var tile = el("div", {
      width: isCx ? "118px" : "92px",
      height: isCx ? "84px" : "128px",
      borderRadius: "5px",
      overflow: "hidden",
      border: "2px solid " + border,
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
      padding: "22px 22px 16px",
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
      fontSize: "32px",
      fontWeight: "800",
      letterSpacing: "0.04em",
      marginBottom: "12px",
      lineHeight: "1.25",
      wordBreak: "break-word"
    }, { text: (deck && deck.name) || "未命名牌組" }));

    wrap.appendChild(buildSectionBox("牌組資訊", buildStatsPanel(stats)));

    var grid = el("div", {
      display: "flex",
      flexWrap: "wrap",
      gap: "2px",
      alignContent: "flex-start"
    });

    sortCardsForGrid(cards).forEach(function (card) {
      var qty = Math.max(0, card.qty || 0);
      for (var i = 0; i < qty; i++) {
        grid.appendChild(buildCardTile(card));
      }
    });
    var listBox = buildSectionBox("牌組清單", grid);
    listBox.style.marginTop = "12px";
    wrap.appendChild(listBox);

    wrap.appendChild(el("div", {
      marginTop: "12px",
      fontSize: "12px",
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
