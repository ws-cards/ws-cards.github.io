/**
 * Shared DeckLog fetch + card enrichment for WS-Cards tools.
 * Aligned with deckAnalysis.html / countingDemoNew.html parsers.
 */
(function (global) {
  "use strict";

  var DECKLOG_PROXY = "https://selenium-java-service-669727048059.asia-east1.run.app/view/";
  var CONTENT_WS_BASE = "https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/content/ws/";
  // e.g. BD/W54-070SSP → https://imgs.devilfox.net/ws/bd_w54/bd_w54_070ssp.png
  var WS_CARD_IMAGE_BASE = "https://imgs.devilfox.net/ws";
  var KIND_GCS = { "0": "角色", "1": "事件", "2": "CX" };
  var KIND_DECKLOG = { "2": "角色", "3": "事件", "4": "CX" };

  var setCache = new Map();

  function normalizeCardNo(cardNo) {
    return String(cardNo || "").trim().replace(/\\/g, "/");
  }

  function looksLikeWSCardNo(s) {
    return /^[A-Za-z0-9]+\/[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(String(s || "").trim());
  }

  function isDigitsOnly(s) {
    return /^\d+$/.test(String(s || "").trim());
  }

  function titleCodeFromCardNo(cardNo) {
    var m = String(cardNo).match(/^([A-Za-z0-9]+)\/([A-Za-z0-9]+)-/);
    if (!m) return "";
    return m[1] + "_" + m[2];
  }

  function wsImageUrlFromCardNo(cardNo) {
    var cn = normalizeCardNo(cardNo);
    var m = cn.match(/^([A-Za-z0-9]+)\/([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
    if (!m) return "";
    var series = m[1].toLowerCase();
    var setId = m[2].toLowerCase();
    var num = m[3].toLowerCase();
    var folder = series + "_" + setId;
    return WS_CARD_IMAGE_BASE + "/" + folder + "/" + folder + "_" + num + ".png";
  }

  function expandEntries(rows) {
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var qty = Math.max(0, parseInt(r.qty, 10) || 0);
      var cardNo = normalizeCardNo(r.cardNo);
      for (var j = 0; j < qty; j++) {
        out.push({
          cardNo: cardNo,
          name: r.name || cardNo || "未命名",
          kindLabel: r.kindLabel || "",
          color: r.color || "",
          level: r.level,
          cost: r.cost,
          trigger: r.trigger,
          features: r.features || [],
          imageUrl: cardNo ? wsImageUrlFromCardNo(cardNo) : ""
        });
      }
    }
    return out;
  }

  function decklogWsTypeFromCardKind(cardKind) {
    return KIND_DECKLOG[String(cardKind)] || "";
  }

  function mergeDecklogListParts(data) {
    if (!data || typeof data !== "object") return [];
    var a = Array.isArray(data.list) ? data.list : [];
    var b = Array.isArray(data.sub_list) ? data.sub_list : [];
    var c = Array.isArray(data.p_list) ? data.p_list : [];
    return a.concat(b, c).filter(function (row) {
      return row && row.card_number != null;
    });
  }

  function cardsFromDecklogPayload(data) {
    if (data == null || typeof data !== "object") throw new Error("非有效的 Deck Log 資料。");
    var items = mergeDecklogListParts(data);
    if (data.message && !items.length) throw new Error(String(data.message));
    if (!items.length) throw new Error("此牌組沒有卡表清單或為空。");
    var rows = [];
    for (var i = 0; i < items.length; i++) {
      var row = items[i];
      var n = Math.max(0, parseInt(row.num, 10) || 0);
      if (!n) continue;
      rows.push({
        cardNo: normalizeCardNo(String(row.card_number || "").replace(/\\/g, "/")),
        name: String(row.name != null ? row.name : "未命名").trim() || "未命名",
        qty: n,
        kindLabel: decklogWsTypeFromCardKind(row.card_kind)
      });
    }
    if (!rows.length) throw new Error("匯出為 0 張。");
    return expandEntries(rows);
  }

  function cardsFromSimpleDecklogPayload(data) {
    if (!data || typeof data !== "object") throw new Error("非有效的資料格式。");
    var cardList = data.cardList;
    if (!cardList || typeof cardList !== "object") throw new Error("找不到 cardList。");
    var rows = [];
    var keys = Object.keys(cardList);
    for (var i = 0; i < keys.length; i++) {
      var cardNo = keys[i];
      var qty = Math.max(0, parseInt(cardList[cardNo], 10) || 0);
      if (!qty) continue;
      var cn = normalizeCardNo(String(cardNo).replace(/\\/g, "/"));
      rows.push({ cardNo: cn, name: cn, qty: qty });
    }
    if (!rows.length) throw new Error("解析後為 0 張。");
    return expandEntries(rows);
  }

  function parseDeckText(text) {
    var normalized = String(text || "")
      .replace(/\r\n/g, "\n").replace(/\r/g, "\n")
      .replace(/\u2028/g, "\n").replace(/\u2029/g, "\n");
    var lines = normalized.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var parts = line.split("|").map(function (s) { return s.trim(); });
      if (parts.length >= 3 && isDigitsOnly(parts[0]) && looksLikeWSCardNo(parts[1])) {
        rows.push({
          qty: Math.max(1, parseInt(parts[0], 10) || 1),
          cardNo: parts[1],
          name: parts.slice(2).join("|"),
          kindLabel: ""
        });
        continue;
      }
      if (parts.length >= 2 && looksLikeWSCardNo(parts[0])) {
        rows.push({ qty: 1, cardNo: parts[0], name: parts.slice(1).join("|"), kindLabel: "" });
        continue;
      }
      if (looksLikeWSCardNo(line)) {
        rows.push({ qty: 1, cardNo: line, name: line, kindLabel: "" });
        continue;
      }
      rows.push({ qty: 1, cardNo: "", name: line, kindLabel: "" });
    }
    return expandEntries(rows);
  }

  function resolveDeckCardsFromUserInput(text) {
    var t = String(text || "").trim();
    if (!t) return [];
    if (t.charAt(0) === "{") {
      var j;
      try { j = JSON.parse(t); } catch (e) {
        throw new Error("JSON 解析失敗：" + (e && e.message ? e.message : e));
      }
      if (j.cardList && typeof j.cardList === "object") return cardsFromSimpleDecklogPayload(j);
      if (j.list || j.card_number || (j.list === undefined && (j.sub_list || j.p_list))) {
        return cardsFromDecklogPayload(j);
      }
      if (Array.isArray(j.list) || j.game_title_id != null) return cardsFromDecklogPayload(j);
    }
    return parseDeckText(t);
  }

  function normalizeMeta(raw, cardNo) {
    if (!raw) return null;
    var kindRaw = raw.kind !== undefined ? raw.kind : raw.cardkind;
    var kindLabel = KIND_GCS[String(kindRaw)] || "";
    if (!kindLabel && kindRaw != null) kindLabel = KIND_DECKLOG[String(kindRaw)] || String(kindRaw);
    var features = Array.isArray(raw.features)
      ? raw.features
      : String(raw.cardfeatures || "").split(/[・･]/).map(function (s) { return s.trim(); }).filter(Boolean);
    return {
      cardNo: raw.id || raw.cardno || cardNo,
      name: raw.name || raw.cardname || cardNo,
      color: raw.color || raw.cardcolor || "",
      kindLabel: kindLabel,
      level: raw.level !== undefined ? Number(raw.level) : (raw.cardlevel !== undefined ? Number(raw.cardlevel) : null),
      cost: raw.cost !== undefined ? Number(raw.cost) : (raw.cardcost !== undefined ? Number(raw.cardcost) : null),
      trigger: raw.trigger !== undefined ? String(raw.trigger) : (raw.cardtrigger !== undefined ? String(raw.cardtrigger) : ""),
      features: features,
      rarity: raw.rarity || raw.cardrare || "",
      soul: raw.soul !== undefined ? Number(raw.soul) : null,
      power: raw.power !== undefined ? Number(raw.power) : null
    };
  }

  function indexSetPayload(data) {
    var byId = new Map();
    if (!data || typeof data !== "object") return byId;
    if (data.cards && Array.isArray(data.cards)) {
      for (var i = 0; i < data.cards.length; i++) {
        var c = data.cards[i];
        if (c && c.id) byId.set(c.id, c);
        else if (c && c.cardno) byId.set(c.cardno, c);
      }
    } else {
      var keys = Object.keys(data);
      for (var k = 0; k < keys.length; k++) {
        if (keys[k] === "metadata") continue;
        byId.set(keys[k], data[keys[k]]);
      }
    }
    return byId;
  }

  function fetchSetByIdMap(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(indexSetPayload);
  }

  function loadSetJson(titleCode) {
    if (!titleCode) return Promise.resolve(null);
    if (setCache.has(titleCode)) return setCache.get(titleCode);
    var remote = CONTENT_WS_BASE + encodeURIComponent(titleCode) + ".json";
    var local = "./json/" + encodeURIComponent(titleCode) + ".json";
    var p = fetchSetByIdMap(remote)
      .catch(function () { return fetchSetByIdMap(local); })
      .catch(function () { return null; });
    setCache.set(titleCode, p);
    return p;
  }

  function classifyKind(c) {
    var k = String(c.kindLabel || "").toLowerCase();
    if (/cx|名場|climax|クライ/.test(k)) return "CX";
    if (/事件|event|イベント/.test(k)) return "事件";
    if (/角色|character|chara|キャラ/.test(k)) return "角色";
    return c.kindLabel || "未知";
  }

  function enrichCards(cards) {
    var codes = new Set();
    for (var i = 0; i < cards.length; i++) {
      var tc = titleCodeFromCardNo(cards[i].cardNo);
      if (tc) codes.add(tc);
    }
    var maps = {};
    return Promise.all(Array.from(codes).map(function (tc) {
      return loadSetJson(tc).then(function (m) { maps[tc] = m; });
    })).then(function () {
      return cards.map(function (c) {
        var tc = titleCodeFromCardNo(c.cardNo);
        var byId = maps[tc];
        var raw = byId && byId.get(c.cardNo);
        if (!raw && byId) {
          var m = c.cardNo.match(/^(.+-\d+[a-z]?)/i);
          if (m) {
            byId.forEach(function (v, id) {
              if (!raw && (id === m[1] || id.indexOf(m[1]) === 0)) raw = v;
            });
          }
        }
        var meta = normalizeMeta(raw, c.cardNo);
        if (!meta) return Object.assign({}, c, { kindClass: classifyKind(c) });
        return {
          cardNo: c.cardNo,
          name: meta.name || c.name,
          kindLabel: meta.kindLabel || c.kindLabel || "",
          kindClass: classifyKind({ kindLabel: meta.kindLabel || c.kindLabel || "" }),
          color: meta.color || c.color || "",
          level: meta.level != null && !isNaN(meta.level) ? meta.level : c.level,
          cost: meta.cost != null && !isNaN(meta.cost) ? meta.cost : c.cost,
          trigger: meta.trigger || c.trigger || "",
          features: meta.features.length ? meta.features : (c.features || []),
          imageUrl: c.imageUrl || wsImageUrlFromCardNo(c.cardNo),
          rarity: meta.rarity || "",
          soul: meta.soul,
          power: meta.power
        };
      });
    });
  }

  function aggregateUniqueCharacters(cards) {
    var map = new Map();
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (classifyKind(c) !== "角色" && c.kindClass !== "角色") continue;
      var key = c.cardNo || ("name:" + c.name);
      if (!map.has(key)) {
        map.set(key, Object.assign({}, c, { qty: 0, kindClass: "角色" }));
      }
      map.get(key).qty += 1;
    }
    return Array.from(map.values());
  }

  function fetchDecklogByCode(code) {
    var trimmed = String(code || "").trim();
    if (!trimmed) return Promise.reject(new Error("請輸入 DeckLog 代碼。"));
    return fetch(DECKLOG_PROXY + encodeURIComponent(trimmed)).then(function (resp) {
      return resp.text().then(function (text) {
        if (!resp.ok) throw new Error("DeckLog 查詢失敗（HTTP " + resp.status + "）");
        var json = null;
        try { json = JSON.parse(text); } catch (e) { /* plain */ }
        var cards;
        if (json) {
          if (json.cardList && typeof json.cardList === "object") {
            cards = cardsFromSimpleDecklogPayload(json);
          } else {
            cards = cardsFromDecklogPayload(json);
          }
        } else {
          cards = resolveDeckCardsFromUserInput(text);
        }
        return enrichCards(cards).then(function (enriched) {
          return {
            code: (json && (json.deckCode || json.deck_id)) || trimmed,
            cards: enriched,
            characters: aggregateUniqueCharacters(enriched)
          };
        });
      });
    });
  }

  function loadSampleBandDeck() {
    var sampleRows = [
      { cardNo: "BD/W54-089", name: "“二人を繋いで”今井リサ", qty: 4 },
      { cardNo: "BD/W54-078", name: "“選んでもらった水着”白金燐子", qty: 4 },
      { cardNo: "BD/W54-016", name: "“ドラムとの出会い”大和麻弥", qty: 4 },
      { cardNo: "BD/W54-008", name: "“ステージ”北沢はぐみ", qty: 4 },
      { cardNo: "BD/W54-055", name: "“みんなで遊園地！”戸山香澄", qty: 4 },
      { cardNo: "BD/W54-011", name: "“はーい、ミッシェルでーす”奥沢美咲", qty: 4 },
      { cardNo: "BD/W54-044", name: "“フシギなお守り”上原ひまり", qty: 4 },
      { cardNo: "BD/W54-020", name: "“私を捕まえてごらん”瀬田薫", qty: 4 },
      { cardNo: "BD/W54-094", name: "“ステージ”市ヶ谷有咲", qty: 2 },
      { cardNo: "BD/W54-053", name: "“必殺アイドルポーズ☆”丸山彩", qty: 4 },
      { cardNo: "BD/W54-070", name: "“鳥籠の歌姫”湊友希那", qty: 4 },
      { cardNo: "BD/W54-048", name: "That Is How I Roll!", qty: 4 },
      { cardNo: "BD/W54-067", name: "憧れの先", qty: 4 }
    ];
    var cards = expandEntries(sampleRows);
    return enrichCards(cards).then(function (enriched) {
      return {
        code: "sample-BD_W54",
        cards: enriched,
        characters: aggregateUniqueCharacters(enriched)
      };
    });
  }

  global.WsDecklog = {
    fetchDecklogByCode: fetchDecklogByCode,
    loadSampleBandDeck: loadSampleBandDeck,
    enrichCards: enrichCards,
    resolveDeckCardsFromUserInput: resolveDeckCardsFromUserInput,
    wsImageUrlFromCardNo: wsImageUrlFromCardNo,
    classifyKind: classifyKind,
    aggregateUniqueCharacters: aggregateUniqueCharacters,
    DECKLOG_PROXY: DECKLOG_PROXY
  };
})(typeof window !== "undefined" ? window : globalThis);
