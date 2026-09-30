/**
 * Firebase Callable: generateDeckTeachingGuide
 *
 * Request (schemaVersion 1):
 * {
 *   schemaVersion: 1,
 *   mode: "beginner" | "standard" | "advanced",
 *   locale: "zh-Hant",
 *   deck: { total, cx, levelCount, climax, topLv0, topLv1, topLv3, cards, ... },
 *   ragHints: string[]   // reserved for future RAG chunks
 * }
 *
 * Response:
 * {
 *   schemaVersion: 1,
 *   mode, source: "llm" | "mock",
 *   persona: { id, name, tagline },
 *   guide: { fiveKeys? | sections? | decisionTree? },
 *   generatedAt
 * }
 *
 * Secrets: set OPENAI_API_KEY via `firebase functions:secrets:set OPENAI_API_KEY`
 * Region: asia-east1 (align with existing GCS / DeckLog proxy geography)
 *
 * Until OPENAI_API_KEY is configured, returns a deterministic mock guide so the
 * client UI can be exercised end-to-end after deploy.
 */
"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const openaiKey = defineSecret("OPENAI_API_KEY");

const PERSONA = {
  id: "xiao-yun",
  name: "小雲",
  tagline: "卡片雲牌組教練"
};

const MODES = new Set(["beginner", "standard", "advanced"]);

function namesList(rows, limit) {
  if (!Array.isArray(rows) || !rows.length) return "（待補）";
  return rows
    .slice(0, limit || 3)
    .map((r) => (r && r.name ? r.name + (r.qty ? "×" + r.qty : "") : ""))
    .filter(Boolean)
    .join("、") || "（待補）";
}

function mockGuide(mode, deck) {
  const lv = (deck && deck.levelCount) || {};
  const d = {
    levelCount: { 0: lv[0] || 0, 1: lv[1] || 0, 2: lv[2] || 0, 3: lv[3] || 0 },
    cx: (deck && deck.cx) || 0,
    topLv0: (deck && deck.topLv0) || [],
    topLv1: (deck && deck.topLv1) || [],
    topLv3: (deck && deck.topLv3) || [],
    climax: (deck && deck.climax) || []
  };

  if (mode === "beginner") {
    return {
      fiveKeys: [
        { title: "Lv0 找誰", body: "起手找：" + namesList(d.topLv0, 2) },
        { title: "Lv1 做什麼 Combo", body: "主線：" + namesList(d.topLv1, 2) },
        { title: "哪些卡不能亂丟", body: "CX：" + namesList(d.climax, 2) },
        { title: "什麼時候準備終盤", body: "Lv3 約 " + d.levelCount[3] + " 張，Lv2 起開始囤資源。" },
        { title: "Lv3 最後怎麼收尾", body: "終盤：" + namesList(d.topLv3, 2) }
      ]
    };
  }

  const sections = [
    {
      id: "core",
      title: "這副牌的核心玩法",
      body: "Lv0 " + d.levelCount[0] + " → Lv1 " + d.levelCount[1] + " → Lv3 " + d.levelCount[3] + "，CX " + d.cx + "。"
    },
    {
      id: "structure",
      title: "牌組結構",
      body: "主力：" + namesList([].concat(d.topLv0, d.topLv1, d.topLv3), 5)
    },
    {
      id: "levels",
      title: "每個等級要幹嘛",
      body: "Lv0 " + namesList(d.topLv0, 2) + "；Lv1 " + namesList(d.topLv1, 2) + "；Lv3 " + namesList(d.topLv3, 2) + "。"
    },
    {
      id: "flow",
      title: "標準流程",
      body: "保 Lv0 → Lv1 combo → 囤終盤 → CX 對齊收尾。"
    },
    {
      id: "advanced",
      title: "進階決策",
      body: "依血線與 stock 決定升等與斬擊時機；細節待 RAG／LLM 補完。"
    }
  ];

  if (mode === "standard") return { sections };

  return {
    sections,
    decisionTree: [
      { when: "起手無 Lv0", then: "mulligan 換搜尋／站場。" },
      { when: "CX 過多且非終盤", then: "可重抽多餘 CX。" },
      { when: "可斬穿", then: "對齊 CX 與 Lv3 再攻。" }
    ]
  };
}

function buildSystemPrompt(mode) {
  return [
    "你是「小雲」，卡片雲（WS-Cards）的 Weiss Schwarz 牌組教練。",
    "用繁體中文（台灣），語氣親切簡潔，不要捏造不存在的卡效。",
    "只能根據使用者提供的 structured deck JSON 與 ragHints 回答。",
    mode === "beginner"
      ? "輸出新手模式：剛好 5 個重點（Lv0／Lv1 combo／不能亂丟／終盤準備／Lv3 收尾）。"
      : mode === "advanced"
        ? "輸出進階模式：完整流程章節 + decision tree（when/then）。"
        : "輸出標準模式：核心玩法、結構、各等級、標準流程、進階決策預覽。",
    "請只回傳 JSON，格式：",
    mode === "beginner"
      ? '{"guide":{"fiveKeys":[{"title":"...","body":"..."}]}}'
      : mode === "advanced"
        ? '{"guide":{"sections":[{"id":"core|structure|levels|flow|advanced","title":"...","body":"..."}],"decisionTree":[{"when":"...","then":"..."}]}}'
        : '{"guide":{"sections":[{"id":"core|structure|levels|flow|advanced","title":"...","body":"..."}]}}'
  ].join("\n");
}

async function callOpenAI(apiKey, mode, deck, ragHints) {
  const body = {
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(mode) },
      {
        role: "user",
        content: JSON.stringify({
          mode,
          deck,
          ragHints: ragHints || [],
          note: "ragHints 目前可能為空；沒有就只根據 deck 結構給一般化建議，並標明不確定處。"
        })
      }
    ]
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error("OpenAI HTTP " + resp.status + ": " + text.slice(0, 200));
  }

  const json = await resp.json();
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!content) throw new Error("OpenAI empty content");
  const parsed = JSON.parse(content);
  if (!parsed.guide) throw new Error("OpenAI JSON missing guide");
  return parsed.guide;
}

exports.generateDeckTeachingGuide = onCall(
  {
    region: "asia-east1",
    secrets: [openaiKey],
    cors: true,
    enforceAppCheck: false
  },
  async (request) => {
    const data = request.data || {};
    const mode = MODES.has(data.mode) ? data.mode : "beginner";
    const deck = data.deck && typeof data.deck === "object" ? data.deck : {};
    const ragHints = Array.isArray(data.ragHints) ? data.ragHints : [];

    if (!deck.cards && !deck.levelCount && deck.total == null) {
      throw new HttpsError("invalid-argument", "缺少 deck structured data");
    }

    let guide;
    let source = "mock";
    const key = openaiKey.value();

    if (key) {
      try {
        guide = await callOpenAI(key, mode, deck, ragHints);
        source = "llm";
      } catch (e) {
        console.error("LLM failed, falling back to mock:", e && e.message ? e.message : e);
        guide = mockGuide(mode, deck);
        source = "mock";
      }
    } else {
      guide = mockGuide(mode, deck);
    }

    return {
      schemaVersion: 1,
      mode,
      source,
      persona: PERSONA,
      guide,
      generatedAt: new Date().toISOString()
    };
  }
);
