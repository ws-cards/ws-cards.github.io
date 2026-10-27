/**
 * Shared CX / trigger mapping loader for WS-Cards.
 *
 * Source of truth: json/cxTriggerMap.json (also intended for GCS upload).
 * Call WsTriggerMap.ready() once before using lookups; pages may keep
 * working with the embedded fallback if remote fetch fails.
 *
 * Layers (v2 — id === code):
 *   id          — primary trigger code on card JSON (`1G`, `2`, `B`, …)
 *   altCodes    — rare legacy aliases (e.g. `A` → same as `1`)
 *   icons       — official GIF filenames; crawler join key (`;`-joined)
 *   labelZh     — crawler / display Chinese name
 *   axisLabelZh — community CX-axis nickname (凱旋門 / 二爆 / …)
 *
 * Entries with id:null (discovery/chance/focus) are indexed by icons only
 * until the crawler supplies a real code.
 */
(function (global) {
  "use strict";

  var GCS_URL =
    "https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cxTriggerMap.json";
  var LOCAL_URL = "./json/cxTriggerMap.json";

  /** Embedded fallback — keep in sync with json/cxTriggerMap.json */
  var FALLBACK = {
    version: 2,
    updatedAt: "2026-10-27",
    axisOrder: ["1G", "2", "C", "B", "1H", "I", "1E", "1A", "F", "D"],
    triggers: [
      { id: "0", altCodes: [], icons: [], labelZh: "無", aliasesZh: [], axisLabelZh: null, isCxAxis: false },
      { id: "1", altCodes: ["A"], icons: ["soul.gif"], labelZh: "魂+1", aliasesZh: ["靈魂+1", "魂", "靈魂"], axisLabelZh: null, isCxAxis: false },
      { id: "2", altCodes: [], icons: ["soul.gif", "soul.gif"], labelZh: "魂+2", aliasesZh: ["二爆", "二暴", "靈魂+2"], axisLabelZh: "二爆", isCxAxis: true },
      { id: "F", altCodes: [], icons: ["stock.gif"], labelZh: "寶袋", aliasesZh: ["庫存"], axisLabelZh: "寶袋", isCxAxis: true },
      { id: "C", altCodes: [], icons: ["salvage.gif"], labelZh: "木門", aliasesZh: ["歸來", "comeback"], axisLabelZh: "木門", isCxAxis: true },
      { id: "1A", altCodes: [], icons: ["soul.gif", "bounce.gif"], labelZh: "風", aliasesZh: ["風吹", "彈回"], axisLabelZh: "風吹", isCxAxis: true },
      { id: "D", altCodes: [], icons: ["draw.gif"], labelZh: "書", aliasesZh: ["抽牌"], axisLabelZh: "書", isCxAxis: true },
      { id: "B", altCodes: [], icons: ["treasure.gif"], labelZh: "磚", aliasesZh: ["金磚", "寶箱"], axisLabelZh: "金磚", isCxAxis: true },
      { id: "1E", altCodes: [], icons: ["soul.gif", "shot.gif"], labelZh: "燒", aliasesZh: ["火燒", "射擊"], axisLabelZh: "火燒", isCxAxis: true },
      { id: "1G", altCodes: [], icons: ["gate.gif"], labelZh: "城門", aliasesZh: ["凱旋門"], axisLabelZh: "凱旋門", isCxAxis: true },
      { id: "1H", altCodes: [], icons: ["soul.gif", "standby.gif"], labelZh: "開機", aliasesZh: ["待機"], axisLabelZh: "開機", isCxAxis: true },
      { id: "I", altCodes: [], icons: ["choice.gif"], labelZh: "箭頭", aliasesZh: ["選擇"], axisLabelZh: "箭頭", isCxAxis: true },
      { id: null, altCodes: [], icons: ["discovery.gif"], labelZh: "望遠鏡", aliasesZh: ["發現"], axisLabelZh: null, isCxAxis: false },
      { id: null, altCodes: [], icons: ["chance.gif"], labelZh: "燈泡", aliasesZh: ["機會"], axisLabelZh: null, isCxAxis: false },
      { id: null, altCodes: [], icons: ["focus.gif"], labelZh: "快門", aliasesZh: ["聚焦"], axisLabelZh: null, isCxAxis: false }
    ]
  };

  var state = {
    data: FALLBACK,
    source: "fallback",
    readyPromise: null
  };

  function normalizeCode(code) {
    if (code == null || code === "") return "";
    return String(code).trim().toUpperCase();
  }

  function iconsKey(icons) {
    if (typeof icons === "string") {
      return icons.split(/[;|]/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean).join(";");
    }
    if (!Array.isArray(icons)) return "";
    return icons.map(function (s) { return String(s || "").trim().toLowerCase(); }).filter(Boolean).join(";");
  }

  function allCodesOf(t) {
    var out = [];
    var primary = normalizeCode(t && t.id);
    if (primary) out.push(primary);
    var alts = (t && t.altCodes) || (t && t.codes) || [];
    for (var i = 0; i < alts.length; i++) {
      var c = normalizeCode(alts[i]);
      if (c && out.indexOf(c) === -1) out.push(c);
    }
    return out;
  }

  function indexMap(data) {
    var byId = Object.create(null);
    var byCode = Object.create(null);
    var byIcons = Object.create(null);
    var byAxisLabel = Object.create(null);
    var byAnyZh = Object.create(null);
    var list = (data && data.triggers) || [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t) continue;
      var codes = allCodesOf(t);
      for (var c = 0; c < codes.length; c++) {
        byCode[codes[c]] = t;
        byId[codes[c]] = t;
      }
      var ik = iconsKey(t.icons);
      if (ik) byIcons[ik] = t;
      if (t.axisLabelZh) byAxisLabel[t.axisLabelZh] = t;
      var names = [t.labelZh, t.axisLabelZh].concat(t.aliasesZh || []);
      for (var n = 0; n < names.length; n++) {
        if (names[n]) byAnyZh[String(names[n])] = t;
      }
    }
    return {
      byId: byId,
      byCode: byCode,
      byIcons: byIcons,
      byAxisLabel: byAxisLabel,
      byAnyZh: byAnyZh,
      data: data
    };
  }

  var idx = indexMap(FALLBACK);

  function applyData(data, source) {
    if (!data || !Array.isArray(data.triggers)) return false;
    state.data = data;
    state.source = source;
    idx = indexMap(data);
    return true;
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function ready(options) {
    if (state.readyPromise) return state.readyPromise;
    var opts = options || {};
    var preferGcs = opts.preferGcs !== false;
    state.readyPromise = (preferGcs ? fetchJson(GCS_URL) : Promise.reject(new Error("skip-gcs")))
      .then(function (data) {
        if (!applyData(data, "gcs")) throw new Error("invalid gcs map");
        return api;
      })
      .catch(function () {
        return fetchJson(LOCAL_URL).then(function (data) {
          if (!applyData(data, "local")) throw new Error("invalid local map");
          return api;
        });
      })
      .catch(function () {
        applyData(FALLBACK, "fallback");
        return api;
      });
    return state.readyPromise;
  }

  /** Lookup by trigger code (id === code). */
  function fromCode(code) {
    var key = normalizeCode(code);
    return key ? (idx.byCode[key] || null) : null;
  }

  /** Alias of fromCode — id is the code. */
  function fromId(id) {
    return fromCode(id);
  }

  /** Lookup by official GIF list or crawler "a.gif;b.gif" string. */
  function fromIcons(icons) {
    var key = iconsKey(icons);
    return key ? (idx.byIcons[key] || null) : null;
  }

  function fromZh(name) {
    return idx.byAnyZh[String(name || "").trim()] || null;
  }

  /** Chart / UI label for a raw card trigger code. */
  function labelForCode(code) {
    var t = fromCode(code);
    if (!t) return code == null || code === "" ? "-" : String(code);
    return t.axisLabelZh || t.labelZh || normalizeCode(t.id) || String(code);
  }

  /** CX-axis nickname used by collection / top-record compare; null if not axis. */
  function axisLabelForCode(code) {
    var t = fromCode(code);
    if (!t || !t.isCxAxis) return null;
    return t.axisLabelZh || t.labelZh || null;
  }

  /** code → axisLabel map (compat with old CX_TRIGGER_AXIS / TOP_TRIGGER_AXIS). */
  function codeToAxisLabelMap() {
    var out = Object.create(null);
    var list = state.data.triggers || [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t || !t.isCxAxis) continue;
      var label = t.axisLabelZh || t.labelZh;
      if (!label) continue;
      var codes = allCodesOf(t);
      for (var c = 0; c < codes.length; c++) out[codes[c]] = label;
    }
    return out;
  }

  /** Ordered axis nicknames (compat with CX_AXIS_ORDER / TOP_AXIS_TOKENS). */
  function axisOrderLabels() {
    var order = state.data.axisOrder || [];
    var out = [];
    for (var i = 0; i < order.length; i++) {
      var t = fromCode(order[i]);
      if (t && (t.axisLabelZh || t.labelZh)) out.push(t.axisLabelZh || t.labelZh);
    }
    return out;
  }

  /**
   * Alias pairs for parsing free-text axis strings from sheets
   * (e.g. 城門→凱旋門, 燒→火燒). Derived from labelZh / aliasesZh → axisLabelZh.
   */
  function axisAliasPairs() {
    var pairs = [];
    var list = state.data.triggers || [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t || !t.isCxAxis) continue;
      var canon = t.axisLabelZh || t.labelZh;
      if (!canon) continue;
      var names = [t.labelZh].concat(t.aliasesZh || []);
      for (var n = 0; n < names.length; n++) {
        var alias = names[n];
        if (alias && alias !== canon) pairs.push([alias, canon]);
      }
    }
    return pairs;
  }

  /** code → short display label map (compat with TRIGGER_LABEL). */
  function codeToLabelMap() {
    var out = Object.create(null);
    var list = state.data.triggers || [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t) continue;
      var label = t.labelZh || t.axisLabelZh || normalizeCode(t.id);
      if (!label) continue;
      var codes = allCodesOf(t);
      for (var c = 0; c < codes.length; c++) out[codes[c]] = label;
    }
    return out;
  }

  function detectAxisTokensInText(raw) {
    var s = String(raw || "").replace(/\s+/g, "");
    var pairs = axisAliasPairs().slice().sort(function (a, b) {
      return b[0].length - a[0].length || b[1].length - a[1].length;
    });
    for (var i = 0; i < pairs.length; i++) {
      if (s.indexOf(pairs[i][1]) === -1) {
        s = s.split(pairs[i][0]).join(pairs[i][1]);
      }
    }
    var eight = s.indexOf("八") !== -1;
    var tokens = [];
    var order = axisOrderLabels().slice().sort(function (a, b) {
      return b.length - a.length;
    });
    for (var j = 0; j < order.length; j++) {
      var tok = order[j];
      if (s.indexOf(tok) !== -1) {
        tokens.push(tok);
        s = s.split(tok).join("");
      }
    }
    var preferred = axisOrderLabels();
    tokens.sort(function (a, b) {
      return preferred.indexOf(a) - preferred.indexOf(b);
    });
    return { eight: eight, tokens: tokens, remainder: s };
  }

  var api = {
    ready: ready,
    getData: function () { return state.data; },
    getSource: function () { return state.source; },
    fromCode: fromCode,
    fromId: fromId,
    fromIcons: fromIcons,
    fromZh: fromZh,
    labelForCode: labelForCode,
    axisLabelForCode: axisLabelForCode,
    codeToAxisLabelMap: codeToAxisLabelMap,
    codeToLabelMap: codeToLabelMap,
    axisOrderLabels: axisOrderLabels,
    axisAliasPairs: axisAliasPairs,
    detectAxisTokensInText: detectAxisTokensInText,
    iconsKey: iconsKey,
    FALLBACK: FALLBACK,
    GCS_URL: GCS_URL,
    LOCAL_URL: LOCAL_URL
  };

  global.WsTriggerMap = api;
})(typeof window !== "undefined" ? window : globalThis);
