/**
 * 新增牌組流程：方式選擇、比賽牌表匯入檢查、喜歡的牌草稿、來源列、Neo-Standard 合法性。
 * 供 decks.html 使用；亦可在 Node 下 require 做聚焦測試。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WsDeckCreate = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DECK_SIZE = 50;
  var MAX_SAME_NAME = 4;
  var MAX_CX = 8;
  var LAST_METHOD_KEY = 'wsCardsDeckCreateMethod';
  var OFFICIAL_BASE = 'json/official-decks/';
  var RESTRICTIONS_URL = 'json/neo-standard-restrictions.json';

  var METHODS = [
    {
      id: 'blank',
      title: '從零組牌',
      subtitle: '自己選擇每一張牌'
    },
    {
      id: 'tournament',
      title: '比賽牌表',
      subtitle: '挑選官方優勝牌組作為你的牌組'
    },
    {
      id: 'favorites',
      title: '從喜歡的牌開始',
      subtitle: '按照提示,選擇你喜愛的牌快速組牌'
    }
  ];

  var METHOD_IDS = METHODS.map(function (m) { return m.id; });

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeCardNo(cardNo) {
    return normalizeText(cardNo).replace(/\\/g, '/');
  }

  function cardPrefix(cardNo) {
    var m = normalizeCardNo(cardNo).match(/^([A-Za-z0-9]+)\//);
    return m ? m[1].toUpperCase() : '';
  }

  function isCxKind(kind) {
    var k = normalizeText(kind);
    return /^(cx|x)$/i.test(k) || /cx|名場|climax|クライ/i.test(k);
  }

  function isCharacterKind(kind) {
    var k = normalizeText(kind);
    return /角色|character|chara|キャラ|^c$/i.test(k);
  }

  function methodById(id) {
    for (var i = 0; i < METHODS.length; i++) {
      if (METHODS[i].id === id) return METHODS[i];
    }
    return null;
  }

  function getLastMethod(storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return '';
    try {
      var raw = store.getItem(LAST_METHOD_KEY) || '';
      return METHOD_IDS.indexOf(raw) >= 0 ? raw : '';
    } catch (e) {
      return '';
    }
  }

  function setLastMethod(id, storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store || METHOD_IDS.indexOf(id) < 0) return false;
    try {
      store.setItem(LAST_METHOD_KEY, id);
      return true;
    } catch (e) {
      return false;
    }
  }

  function deckTotalQty(cards) {
    var total = 0;
    (cards || []).forEach(function (c) {
      if (!c) return;
      var q = parseInt(c.qty, 10);
      if (isNaN(q) || q < 0) q = 0;
      total += q;
    });
    return total;
  }

  function missingSlots(cards, target) {
    var size = typeof target === 'number' ? target : DECK_SIZE;
    return Math.max(0, size - deckTotalQty(cards));
  }

  function buildEmptySlotPlaceholders(count) {
    var n = Math.max(0, parseInt(count, 10) || 0);
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push({
        placeholder: true,
        slotIndex: i + 1,
        label: '空位 ' + (i + 1)
      });
    }
    return out;
  }

  /**
   * Neo-Standard 結構＋選抜／使用制限檢查。
   * cards: [{ cardNumber, qty, cardName?, kind?, kindClass? }]
   * opts: {
   *   allowedPrefixes: string[],
   *   restrictions: { bannedNames?, bannedCardNumbers?, restrictedNames?: {name, maxQty}[] },
   *   resolveMeta?: (cardNumber) => { name?, kind? }
   * }
   */
  function validateNeoStandard(cards, opts) {
    opts = opts || {};
    var restrictions = opts.restrictions || {};
    var resolveMeta = typeof opts.resolveMeta === 'function' ? opts.resolveMeta : null;
    var allowed = (opts.allowedPrefixes || []).map(function (p) {
      return String(p || '').toUpperCase();
    }).filter(Boolean);
    var allowedSet = {};
    allowed.forEach(function (p) { allowedSet[p] = true; });

    var bannedNameSet = {};
    (restrictions.bannedNames || []).forEach(function (n) {
      var key = normalizeText(n);
      if (key) bannedNameSet[key] = true;
    });
    var bannedNoSet = {};
    (restrictions.bannedCardNumbers || []).forEach(function (n) {
      var key = normalizeCardNo(n);
      if (key) bannedNoSet[key.toUpperCase()] = true;
    });
    var restrictedMax = {};
    (restrictions.restrictedNames || []).forEach(function (row) {
      if (!row) return;
      var key = normalizeText(row.name || row.cardName);
      if (!key) return;
      var maxQty = parseInt(row.maxQty != null ? row.maxQty : row.max, 10);
      if (isNaN(maxQty) || maxQty < 0) maxQty = 0;
      restrictedMax[key] = maxQty;
    });

    var issues = [];
    var flagged = [];
    var nameQty = {};
    var cxQty = 0;
    var total = 0;

    function flagCard(cardNumber, name, reason, code) {
      flagged.push({
        cardNumber: cardNumber || '',
        name: name || '',
        reason: reason,
        code: code
      });
    }

    (cards || []).forEach(function (entry) {
      if (!entry) return;
      var qty = parseInt(entry.qty, 10);
      if (isNaN(qty) || qty < 1) return;
      total += qty;
      var no = normalizeCardNo(entry.cardNumber);
      var meta = resolveMeta ? (resolveMeta(no) || {}) : {};
      var name = normalizeText(entry.cardName || entry.name || meta.name || meta.cardName || no);
      var kind = entry.kindClass || entry.kind || meta.kindClass || meta.kind || '';
      nameQty[name] = (nameQty[name] || 0) + qty;
      if (isCxKind(kind) || (meta && meta.isCx)) cxQty += qty;

      if (allowed.length) {
        var prefix = cardPrefix(no);
        if (prefix && !allowedSet[prefix]) {
          issues.push({
            code: 'title-scope',
            message: '「' + (name || no) + '」不在所選作品範圍（' + prefix + '）'
          });
          flagCard(no, name, '超出作品範圍', 'title-scope');
        }
      }

      if (no && bannedNoSet[no.toUpperCase()]) {
        issues.push({
          code: 'banned',
          message: '「' + (name || no) + '」目前禁止使用'
        });
        flagCard(no, name, '禁止使用', 'banned');
      } else if (name && bannedNameSet[name]) {
        issues.push({
          code: 'banned',
          message: '「' + name + '」目前禁止使用'
        });
        flagCard(no, name, '禁止使用', 'banned');
      }

      if (name && Object.prototype.hasOwnProperty.call(restrictedMax, name)) {
        var maxAllowed = restrictedMax[name];
        if (nameQty[name] > maxAllowed) {
          issues.push({
            code: 'restricted',
            message: '「' + name + '」受使用制限，最多 ' + maxAllowed + ' 張（目前 ' + nameQty[name] + '）'
          });
          flagCard(no, name, '使用制限', 'restricted');
        }
      }
    });

    if (total !== DECK_SIZE) {
      issues.push({
        code: 'count',
        message: '牌組須剛好 ' + DECK_SIZE + ' 張（目前 ' + total + '）'
      });
    }

    Object.keys(nameQty).forEach(function (name) {
      if (nameQty[name] > MAX_SAME_NAME) {
        issues.push({
          code: 'same-name',
          message: '同名卡「' + name + '」合計最多 ' + MAX_SAME_NAME + ' 張（目前 ' + nameQty[name] + '）'
        });
        flagCard('', name, '同名超過 ' + MAX_SAME_NAME + ' 張', 'same-name');
      }
    });

    if (cxQty > MAX_CX) {
      issues.push({
        code: 'cx',
        message: 'CX 最多 ' + MAX_CX + ' 張（目前 ' + cxQty + '）'
      });
    }

    // 去重 flagged（同卡同原因）
    var seenFlag = {};
    flagged = flagged.filter(function (f) {
      var key = (f.cardNumber || '') + '|' + (f.name || '') + '|' + (f.code || '');
      if (seenFlag[key]) return false;
      seenFlag[key] = true;
      return true;
    });

    var ok = issues.length === 0;
    return {
      ok: ok,
      isReference: !ok,
      total: total,
      cxQty: cxQty,
      issues: issues,
      flaggedCards: flagged,
      label: ok ? '合法' : '參考牌組'
    };
  }

  function formatSourceRow(createMeta, opts) {
    opts = opts || {};
    var meta = createMeta || {};
    var method = meta.method || '';
    var seriesName = normalizeText(meta.seriesName || opts.seriesName || '');
    var missing = typeof meta.missingCount === 'number'
      ? meta.missingCount
      : (typeof opts.missingCount === 'number' ? opts.missingCount : null);

    if (method === 'blank') {
      return '空白牌組' + (seriesName ? ('・' + seriesName) : '');
    }
    if (method === 'tournament') {
      var parts = [];
      var eventName = normalizeText(meta.eventName || meta.tournamentName);
      var rank = normalizeText(meta.rank);
      var date = normalizeText(meta.eventDate || meta.date);
      if (eventName) parts.push(eventName);
      if (rank) parts.push(rank);
      if (date) parts.push(date);
      var head = parts.length ? ('來自：' + parts.join('、')) : '來自：比賽牌表';
      var check = meta.legalityChecked === false
        ? '尚未完成規則檢查'
        : '已依目前規則檢查';
      if (meta.isReference) {
        return head + '・' + check + '・參考牌組';
      }
      return head + '・' + check;
    }
    if (method === 'favorites') {
      var coreLabel = normalizeText(meta.coreSummary);
      var miss = missing != null ? missing : 0;
      return '草稿・以所選核心卡為中心' +
        (coreLabel ? ('（' + coreLabel + '）') : '') +
        '・還缺 ' + miss + ' 張';
    }
    return normalizeText(meta.sourceLabel || '');
  }

  function officialFormatId(deck) {
    var k = String((deck && deck.k) || '');
    if (/特殊/.test(k)) return 'other';
    if (/^ネオスタンダード/.test(k)) return 'neo';
    if (/タイトル|限定/.test(k)) return 'title';
    return 'other';
  }

  function officialEventMeta(data, deck) {
    var events = (data && data.events) || {};
    var ev = events[deck && deck.e] || {};
    return {
      eventId: normalizeText(deck && deck.e),
      eventTitle: normalizeText(ev.title || deck.b || ''),
      eventDate: normalizeText(ev.date || ''),
      blockTitle: normalizeText(deck && deck.b),
      rank: normalizeText(deck && deck.r),
      rankScore: typeof (deck && deck.rs) === 'number' ? deck.rs : 99,
      format: normalizeText(deck && deck.k),
      title: normalizeText(deck && deck.t),
      name: normalizeText(deck && deck.n),
      code: normalizeText(deck && deck.code)
    };
  }

  /**
   * 清單列：賽事名稱、成績、deck code（Deck Log code 次要）。
   * 預設只列 Neo-Standard。
   */
  function listOfficialDeckRows(data, opts) {
    opts = opts || {};
    var formatFilter = opts.format || 'neo';
    var decks = (data && data.decks) || [];
    var rows = [];
    decks.forEach(function (deck, index) {
      if (!deck) return;
      if (formatFilter !== 'all' && officialFormatId(deck) !== formatFilter) return;
      var meta = officialEventMeta(data, deck);
      rows.push({
        id: (meta.eventId || 'e') + ':' + (meta.code || index) + ':' + index,
        index: index,
        eventName: meta.eventTitle || meta.blockTitle || meta.name || '未命名賽事',
        rank: meta.rank || '—',
        deckCode: meta.code || '',
        eventDate: meta.eventDate,
        format: meta.format,
        title: meta.title,
        deckName: meta.name,
        cards: Array.isArray(deck.c) ? deck.c : [],
        raw: deck
      });
    });
    rows.sort(function (a, b) {
      if (a.eventDate !== b.eventDate) return a.eventDate < b.eventDate ? 1 : -1;
      if (a.rankScore !== b.rankScore) return (a.raw.rs || 99) - (b.raw.rs || 99);
      return String(a.deckCode).localeCompare(String(b.deckCode));
    });
    return rows;
  }

  function prefixHasOfficialDecks(indexPayload, prefix) {
    var key = String(prefix || '').toUpperCase();
    if (!key || !indexPayload || !indexPayload.prefixes) return false;
    var row = indexPayload.prefixes[key] || indexPayload.prefixes[prefix];
    return !!(row && row.decks > 0);
  }

  function officialCardsToDeckEntries(cardPairs, cardMap) {
    var map = cardMap || {};
    var out = [];
    (cardPairs || []).forEach(function (pair) {
      if (!pair || !pair.length) return;
      var no = normalizeCardNo(pair[0]);
      var qty = parseInt(pair[1], 10);
      if (!no || isNaN(qty) || qty < 1) return;
      var raw = map[no] || map[no.toUpperCase()];
      var name = Array.isArray(raw) ? normalizeText(raw[0]) : '';
      var kindCode = Array.isArray(raw) ? normalizeText(raw[2]) : '';
      var kindClass = kindCode === 'X' ? 'CX' : (kindCode === 'E' ? '事件' : (kindCode === 'C' ? '角色' : ''));
      out.push({
        cardNumber: no,
        qty: qty,
        cardName: name,
        kindClass: kindClass
      });
    });
    return out;
  }

  function buildCreateMetaBlank(seriesName, seriesPrefix) {
    return {
      method: 'blank',
      seriesName: normalizeText(seriesName),
      seriesPrefix: normalizeText(seriesPrefix)
    };
  }

  function buildCreateMetaTournament(row, legality) {
    row = row || {};
    legality = legality || {};
    return {
      method: 'tournament',
      eventName: normalizeText(row.eventName),
      rank: normalizeText(row.rank),
      eventDate: normalizeText(row.eventDate),
      deckCode: normalizeText(row.deckCode),
      seriesName: normalizeText(row.title || row.seriesName),
      seriesPrefix: normalizeText(row.seriesPrefix),
      legalityChecked: true,
      isReference: !!legality.isReference,
      legalityLabel: legality.label || (legality.isReference ? '參考牌組' : '合法'),
      flaggedCards: legality.flaggedCards || [],
      issues: legality.issues || []
    };
  }

  function buildCreateMetaFavorites(cores, missingCount) {
    var names = (cores || []).map(function (c) {
      return normalizeText(c.cardName || c.name || c.cardNumber);
    }).filter(Boolean);
    return {
      method: 'favorites',
      coreCards: (cores || []).map(function (c) {
        return {
          cardNumber: normalizeCardNo(c.cardNumber),
          cardName: normalizeText(c.cardName || c.name),
          kindClass: normalizeText(c.kindClass || c.kind)
        };
      }),
      coreSummary: names.slice(0, 3).join('、'),
      missingCount: typeof missingCount === 'number' ? missingCount : 0,
      showEmptySlots: true,
      isDraft: true
    };
  }

  /**
   * 依核心卡與官方牌表連動資訊，產生三區推薦（不湊滿 50）。
   * catalogCards: [{ id/cardNumber, name, kindClass, level, linkTag? }]
   * cooccur: Map-like { cardNumber: count } from official decks containing cores
   */
  function buildFavoriteRecommendations(cores, catalogCards, cooccur) {
    var coreList = (cores || []).slice(0, 3);
    var coreNos = {};
    var coreNames = {};
    var hasCxCore = false;
    coreList.forEach(function (c) {
      var no = normalizeCardNo(c.cardNumber);
      if (no) coreNos[no.toUpperCase()] = true;
      var name = normalizeText(c.cardName || c.name);
      if (name) coreNames[name] = true;
      if (isCxKind(c.kindClass || c.kind)) hasCxCore = true;
    });

    var linked = [];
    var substitutes = [];
    var undecided = [];
    var used = {};

    function take(card, bucket, reason) {
      var no = normalizeCardNo(card.id || card.cardNumber);
      if (!no || used[no.toUpperCase()] || coreNos[no.toUpperCase()]) return;
      used[no.toUpperCase()] = true;
      bucket.push({
        cardNumber: no,
        cardName: normalizeText(card.name || card.cardName),
        kindClass: normalizeText(card.kindClass || card.kind),
        level: card.level,
        qty: 1,
        reason: reason || '',
        selected: true
      });
    }

    var catalog = catalogCards || [];
    var scores = cooccur || {};

    // 連動牌：官方共現或 linkTag 對上核心
    catalog.forEach(function (card) {
      var no = normalizeCardNo(card.id || card.cardNumber);
      if (!no || coreNos[no.toUpperCase()]) return;
      var link = normalizeText(card.linkTag || card.link || '');
      var linkedByTag = false;
      if (link && link !== '*') {
        Object.keys(coreNames).forEach(function (cn) {
          if (cn && link.indexOf(cn) >= 0) linkedByTag = true;
        });
        coreList.forEach(function (c) {
          if (isCxKind(c.kindClass || c.kind)) {
            var cxName = normalizeText(c.cardName || c.name);
            if (cxName && link.indexOf(cxName) >= 0) linkedByTag = true;
          }
        });
      }
      var score = scores[no] || scores[no.toUpperCase()] || 0;
      if (linkedByTag || score >= 3) {
        take(card, linked, linkedByTag ? '連動搭配' : '常與核心同列');
      }
    });
    linked = linked.slice(0, 12);

    // 可替換：同等級／同色角色或同軸 CX（非連動、非核心）
    catalog.forEach(function (card) {
      if (linked.length + substitutes.length > 24) return;
      var no = normalizeCardNo(card.id || card.cardNumber);
      if (!no || used[no.toUpperCase()] || coreNos[no.toUpperCase()]) return;
      var kind = card.kindClass || card.kind || '';
      var hit = coreList.some(function (c) {
        var ck = c.kindClass || c.kind || '';
        if (isCxKind(ck) && isCxKind(kind)) return true;
        if (isCharacterKind(ck) && isCharacterKind(kind)) {
          var lv = c.level;
          return lv == null || card.level == null || Number(lv) === Number(card.level);
        }
        return false;
      });
      if (hit) take(card, substitutes, '功能相近，可替換');
    });
    substitutes = substitutes.slice(0, 10);

    var levelNeed = { 0: 14, 1: 10, 2: 6, 3: 8, cx: 8 };
    coreList.concat(linked).concat(substitutes).forEach(function (c) {
      if (isCxKind(c.kindClass)) levelNeed.cx = Math.max(0, levelNeed.cx - (c.qty || 1));
      else if (c.level != null && levelNeed[c.level] != null) {
        levelNeed[c.level] = Math.max(0, levelNeed[c.level] - (c.qty || 1));
      }
    });
    ['0', '1', '2', '3', 'cx'].forEach(function (key) {
      var need = levelNeed[key === 'cx' ? 'cx' : Number(key)];
      if (need > 0) {
        undecided.push({
          placeholder: true,
          slotKey: key,
          label: key === 'cx' ? ('尚未決定・CX ×' + need) : ('尚未決定・Lv' + key + ' ×' + need),
          qty: need,
          selected: false
        });
      }
    });

    return {
      hasCxCore: hasCxCore,
      askCxQuestion: !hasCxCore,
      cxQuestion: '想主打哪種 CX？',
      linked: linked,
      substitutes: substitutes,
      undecided: undecided
    };
  }

  function recommendationsToDeckCards(cores, recommendation, selectedOnly) {
    var out = [];
    var map = {};
    function add(card) {
      if (!card || card.placeholder) return;
      if (selectedOnly && card.selected === false) return;
      var no = normalizeCardNo(card.cardNumber);
      if (!no) return;
      var qty = parseInt(card.qty, 10);
      if (isNaN(qty) || qty < 1) qty = 1;
      if (map[no]) map[no].qty = Math.min(MAX_SAME_NAME, map[no].qty + qty);
      else {
        map[no] = {
          cardNumber: no,
          qty: Math.min(MAX_SAME_NAME, qty),
          cardName: normalizeText(card.cardName || card.name),
          kindClass: normalizeText(card.kindClass || card.kind)
        };
      }
    }
    (cores || []).forEach(add);
    if (recommendation) {
      (recommendation.linked || []).forEach(add);
      (recommendation.substitutes || []).forEach(add);
    }
    Object.keys(map).forEach(function (k) { out.push(map[k]); });
    return out;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  return {
    DECK_SIZE: DECK_SIZE,
    MAX_SAME_NAME: MAX_SAME_NAME,
    MAX_CX: MAX_CX,
    LAST_METHOD_KEY: LAST_METHOD_KEY,
    OFFICIAL_BASE: OFFICIAL_BASE,
    RESTRICTIONS_URL: RESTRICTIONS_URL,
    METHODS: METHODS,
    METHOD_IDS: METHOD_IDS,
    methodById: methodById,
    getLastMethod: getLastMethod,
    setLastMethod: setLastMethod,
    deckTotalQty: deckTotalQty,
    missingSlots: missingSlots,
    buildEmptySlotPlaceholders: buildEmptySlotPlaceholders,
    validateNeoStandard: validateNeoStandard,
    formatSourceRow: formatSourceRow,
    officialFormatId: officialFormatId,
    listOfficialDeckRows: listOfficialDeckRows,
    prefixHasOfficialDecks: prefixHasOfficialDecks,
    officialCardsToDeckEntries: officialCardsToDeckEntries,
    officialEventMeta: officialEventMeta,
    buildCreateMetaBlank: buildCreateMetaBlank,
    buildCreateMetaTournament: buildCreateMetaTournament,
    buildCreateMetaFavorites: buildCreateMetaFavorites,
    buildFavoriteRecommendations: buildFavoriteRecommendations,
    recommendationsToDeckCards: recommendationsToDeckCards,
    isCxKind: isCxKind,
    isCharacterKind: isCharacterKind,
    cardPrefix: cardPrefix,
    normalizeCardNo: normalizeCardNo,
    cloneJson: cloneJson
  };
});
