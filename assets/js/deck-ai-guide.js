/**
 * Deck AI Teaching Guide — client contract + mock generator + Firebase callable stub.
 *
 * Pipeline (target):
 *   WS Card DB → Deck Analyzer (page) → Structured Data (+ future RAG)
 *     → Firebase Callable `generateDeckTeachingGuide` → Cloud LLM → Guide UI
 *
 * Modes: beginner | standard | advanced
 * schemaVersion: 1
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = 1;
  var CALLABLE_NAME = "generateDeckTeachingGuide";
  var MODES = ["beginner", "standard", "advanced"];

  var PERSONA = {
    id: "xiao-yun",
    name: "小雲",
    tagline: "卡片雲牌組教練",
    voice: "親切、簡潔、先講能上場用的重點"
  };

  function isMode(m) {
    return MODES.indexOf(m) !== -1;
  }

  function classifyKind(c) {
    var k = String((c && c.kindLabel) || "").toLowerCase();
    if (/cx|名場|climax|クライ/.test(k)) return "CX";
    if (/事件|event|イベント/.test(k)) return "事件";
    if (/角色|character|chara|キャラ/.test(k)) return "角色";
    if (/^that is how|^憧れ|^star beat/i.test((c && c.name) || "")) return "CX";
    return (c && c.kindLabel) || "未知";
  }

  function aggregateByCard(cards) {
    var map = {};
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var key = c.cardNo || ("name:" + c.name);
      if (!map[key]) {
        map[key] = {
          cardNo: c.cardNo || "",
          name: c.name || c.cardNo || "未命名",
          qty: 0,
          level: c.level,
          cost: c.cost,
          color: c.color || "",
          kind: classifyKind(c)
        };
      }
      map[key].qty += 1;
    }
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function topByKindLevel(agg, kind, level, n) {
    return agg
      .filter(function (c) {
        if (c.kind !== kind) return false;
        if (level == null) return true;
        return Number(c.level) === level;
      })
      .sort(function (a, b) { return b.qty - a.qty; })
      .slice(0, n || 3);
  }

  function namesList(rows, limit) {
    return rows.slice(0, limit || 3).map(function (r) {
      return r.name + (r.qty ? ("×" + r.qty) : "");
    }).join("、") || "（待補）";
  }

  /**
   * Build structured deck payload from enriched card list + analyze() stats.
   */
  function buildStructuredDeck(cards, stats) {
    var agg = aggregateByCard(cards || []);
    var levelCount = (stats && stats.levelCount) || { 0: 0, 1: 0, 2: 0, 3: 0 };
    var cx = stats && typeof stats.cx === "number" ? stats.cx : agg.filter(function (c) { return c.kind === "CX"; }).reduce(function (s, c) { return s + c.qty; }, 0);
    return {
      schemaVersion: SCHEMA_VERSION,
      total: (stats && stats.total) || (cards ? cards.length : 0),
      cx: cx,
      levelCount: {
        0: levelCount[0] || 0,
        1: levelCount[1] || 0,
        2: levelCount[2] || 0,
        3: levelCount[3] || 0
      },
      colorCount: (stats && stats.colorCount) || {},
      kindCount: (stats && stats.kindCount) || {},
      climax: topByKindLevel(agg, "CX", null, 8),
      topLv0: topByKindLevel(agg, "角色", 0, 5),
      topLv1: topByKindLevel(agg, "角色", 1, 5),
      topLv2: topByKindLevel(agg, "角色", 2, 4),
      topLv3: topByKindLevel(agg, "角色", 3, 5),
      events: topByKindLevel(agg, "事件", null, 6),
      cards: agg.map(function (c) {
        return {
          cardNo: c.cardNo,
          name: c.name,
          qty: c.qty,
          level: c.level,
          cost: c.cost,
          color: c.color,
          kind: c.kind
        };
      })
    };
  }

  function mockBeginner(deck) {
    var lv0 = namesList(deck.topLv0, 2);
    var lv1 = namesList(deck.topLv1, 2);
    var cx = namesList(deck.climax, 2);
    var lv3 = namesList(deck.topLv3, 2);
    return {
      fiveKeys: [
        { title: "Lv0 找誰", body: "起手優先找能站場／搜尋的 Lv0：" + lv0 + "。沒有就 mulligan 換。" },
        { title: "Lv1 做什麼 Combo", body: "升到 Lv1 後主線看：" + lv1 + "。先搞懂它們怎麼連，再記細節。" },
        { title: "哪些卡不能亂丟", body: "CX（" + cx + "）與關鍵 Lv3 不要當一般資源亂燒；事件也先確認時機。" },
        { title: "什麼時候準備終盤", body: "約 Lv2～轉 Lv3 前開始囤 stock／等關鍵 Lv3。本副 Lv3 張數約 " + deck.levelCount[3] + "。" },
        { title: "Lv3 最後怎麼收尾", body: "終盤主力：" + lv3 + "。記住誰要先下、誰要配合 CX 斬。" }
      ]
    };
  }

  function mockStandard(deck) {
    return {
      sections: [
        {
          id: "core",
          title: "這副牌的核心玩法",
          body: "以 Lv0（" + deck.levelCount[0] + " 張）鋪場與搜尋，Lv1（" + deck.levelCount[1] + "）接 combo，靠 " + deck.cx + " 張 CX 與 Lv3（" + deck.levelCount[3] + "）收尾。先把「每級一件事」練熟。"
        },
        {
          id: "structure",
          title: "牌組結構",
          body: "曲線：Lv0 " + deck.levelCount[0] + "／Lv1 " + deck.levelCount[1] + "／Lv2 " + deck.levelCount[2] + "／Lv3 " + deck.levelCount[3] + "，CX " + deck.cx + "。角色主力含：" + namesList(deck.topLv0.concat(deck.topLv1).concat(deck.topLv3), 5) + "。"
        },
        {
          id: "levels",
          title: "每個等級要幹嘛",
          body: "Lv0：找 " + namesList(deck.topLv0, 2) + " 站穩。Lv1：用 " + namesList(deck.topLv1, 2) + " 推傷害或換牌。Lv2：過渡、補 stock、準備 Lv3。Lv3：用 " + namesList(deck.topLv3, 2) + " 收尾。"
        },
        {
          id: "flow",
          title: "標準流程",
          body: "起手保 Lv0 → 早期建立資源 → Lv1 打出主 combo → 中盤控血與 clock → 轉 Lv3 前確認 CX 與終盤卡在手 → 配合 CX 斬收官。"
        },
        {
          id: "advanced",
          title: "進階決策（預覽）",
          body: "何時燒事件、何時留 CX、何時提前升等：等接上 LLM／RAG 後會依卡效細講。目前先記住「資源夠再升、CX 對齊斬擊回合」。"
        }
      ]
    };
  }

  function mockAdvanced(deck) {
    return {
      sections: mockStandard(deck).sections,
      decisionTree: [
        { when: "起手沒有可用 Lv0", then: "優先 mulligan；保留能搜到 Lv0 的牌。" },
        { when: "手牌 CX 偏多（≥2）且尚未進終盤", then: "可考慮重抽多餘 CX，避免卡手。" },
        { when: "對手血線可被斬穿", then: "對齊 CX 與 " + namesList(deck.topLv3, 1) + " 再進攻，避免空斬。" },
        { when: "stock 吃緊但需要 Lv3", then: "先用 Lv1／事件補資源，不要硬下高費終盤。" },
        { when: "clock 接近升級", then: "確認下一級關鍵卡是否在手；可提前整理手牌。" }
      ]
    };
  }

  function buildMockGuide(mode, deck) {
    var m = isMode(mode) ? mode : "beginner";
    var guide;
    if (m === "beginner") guide = mockBeginner(deck);
    else if (m === "advanced") guide = mockAdvanced(deck);
    else guide = mockStandard(deck);
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: m,
      source: "mock",
      persona: PERSONA,
      guide: guide,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Call Firebase Callable if available; otherwise resolve mock.
   * Never throws for "function not deployed" — falls back to mock with note.
   */
  function requestGuide(opts) {
    opts = opts || {};
    var mode = isMode(opts.mode) ? opts.mode : "beginner";
    var deck = opts.deck || buildStructuredDeck([], null);
    var preferMock = !!opts.preferMock;
    var payload = {
      schemaVersion: SCHEMA_VERSION,
      mode: mode,
      locale: opts.locale || "zh-Hant",
      deck: deck,
      ragHints: opts.ragHints || []
    };

    if (preferMock || typeof global.firebase === "undefined" || !firebase.apps || !firebase.apps.length) {
      return Promise.resolve(buildMockGuide(mode, deck));
    }

    if (typeof firebase.functions !== "function") {
      var g0 = buildMockGuide(mode, deck);
      g0.fallbackReason = "functions-sdk-missing";
      return Promise.resolve(g0);
    }

    try {
      var fn = firebase.app().functions("asia-east1").httpsCallable(CALLABLE_NAME);
      return fn(payload).then(function (res) {
        var data = (res && res.data) || {};
        if (!data.guide) {
          var g1 = buildMockGuide(mode, deck);
          g1.fallbackReason = "empty-response";
          return g1;
        }
        data.schemaVersion = data.schemaVersion || SCHEMA_VERSION;
        data.mode = data.mode || mode;
        data.source = data.source || "llm";
        data.persona = data.persona || PERSONA;
        return data;
      }).catch(function (err) {
        var g2 = buildMockGuide(mode, deck);
        g2.fallbackReason = (err && err.code) || (err && err.message) || "callable-failed";
        return g2;
      });
    } catch (e) {
      var g3 = buildMockGuide(mode, deck);
      g3.fallbackReason = (e && e.message) || "callable-init-failed";
      return Promise.resolve(g3);
    }
  }

  global.WSDeckAIGuide = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    CALLABLE_NAME: CALLABLE_NAME,
    MODES: MODES.slice(),
    PERSONA: PERSONA,
    buildStructuredDeck: buildStructuredDeck,
    buildMockGuide: buildMockGuide,
    requestGuide: requestGuide
  };
})(typeof window !== "undefined" ? window : globalThis);
