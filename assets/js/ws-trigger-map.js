/**
 * Shared CX / trigger mapping loader for WS-Cards.
 *
 * Source of truth: json/cxTriggerMap.json (also intended for GCS upload).
 * Call WsTriggerMap.ready() once before using lookups; pages may keep
 * working with the embedded fallback if remote fetch fails.
 *
 * Layers (v3 — codes === id):
 *   id          — English key (bounce, gate, soul2, …)
 *   codes       — same as id; future card JSON / program writes this
 *   altCodes    — legacy official codes (1A, 1G, B, …) for existing GCS
 *   icons       — official GIF filenames; crawler join key (`;`-joined)
 *   labelZh     — crawler / display Chinese name
 *   axisLabelZh — community CX-axis nickname (凱旋門 / 二爆 / …)
 */
(function (global) {
  "use strict";

  var GCS_URL =
    "https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cxTriggerMap.json";
  var LOCAL_URL = "./json/cxTriggerMap.json";

  /** Embedded fallback — keep in sync with json/cxTriggerMap.json */
  var FALLBACK = {
    version: 3,
    updatedAt: "2026-10-27",
    axisOrder: [
      "gate", "soul2", "salvage", "treasure", "standby",
      "choice", "shot", "bounce", "stock", "draw"
    ],
    triggers: [
      { id: "none", codes: ["none"], altCodes: ["0"], icons: [], labelZh: "無", aliasesZh: [], axisLabelZh: null, isCxAxis: false },
      { id: "soul", codes: ["soul"], altCodes: ["1", "A"], icons: ["soul.gif"], labelZh: "魂+1", aliasesZh: ["靈魂+1", "魂", "靈魂"], axisLabelZh: null, isCxAxis: false },
      { id: "soul2", codes: ["soul2"], altCodes: ["2"], icons: ["soul.gif", "soul.gif"], labelZh: "魂+2", aliasesZh: ["二爆", "二暴", "靈魂+2"], axisLabelZh: "二爆", isCxAxis: true },
      { id: "stock", codes: ["stock"], altCodes: ["F"], icons: ["stock.gif"], labelZh: "寶袋", aliasesZh: ["庫存"], axisLabelZh: "寶袋", isCxAxis: true },
      { id: "salvage", codes: ["salvage"], altCodes: ["C"], icons: ["salvage.gif"], labelZh: "木門", aliasesZh: ["歸來", "comeback"], axisLabelZh: "木門", isCxAxis: true },
      { id: "bounce", codes: ["bounce"], altCodes: ["1A"], icons: ["soul.gif", "bounce.gif"], labelZh: "風", aliasesZh: ["風吹", "彈回"], axisLabelZh: "風吹", isCxAxis: true },
      { id: "draw", codes: ["draw"], altCodes: ["D"], icons: ["draw.gif"], labelZh: "書", aliasesZh: ["抽牌"], axisLabelZh: "書", isCxAxis: true },
      { id: "treasure", codes: ["treasure"], altCodes: ["B"], icons: ["treasure.gif"], labelZh: "磚", aliasesZh: ["金磚", "寶箱"], axisLabelZh: "金磚", isCxAxis: true },
      { id: "shot", codes: ["shot"], altCodes: ["1E"], icons: ["soul.gif", "shot.gif"], labelZh: "燒", aliasesZh: ["火燒", "射擊"], axisLabelZh: "火燒", isCxAxis: true },
      { id: "gate", codes: ["gate"], altCodes: ["1G"], icons: ["gate.gif"], labelZh: "城門", aliasesZh: ["凱旋門"], axisLabelZh: "凱旋門", isCxAxis: true },
      { id: "standby", codes: ["standby"], altCodes: ["1H"], icons: ["soul.gif", "standby.gif"], labelZh: "開機", aliasesZh: ["待機"], axisLabelZh: "開機", isCxAxis: true },
      { id: "choice", codes: ["choice"], altCodes: ["I"], icons: ["choice.gif"], labelZh: "箭頭", aliasesZh: ["選擇"], axisLabelZh: "箭頭", isCxAxis: true },
      { id: "discovery", codes: ["discovery"], altCodes: [], icons: ["discovery.gif"], labelZh: "望遠鏡", aliasesZh: ["發現"], axisLabelZh: null, isCxAxis: false },
      { id: "chance", codes: ["chance"], altCodes: [], icons: ["chance.gif"], labelZh: "燈泡", aliasesZh: ["機會"], axisLabelZh: null, isCxAxis: false },
      { id: "focus", codes: ["focus"], altCodes: [], icons: ["focus.gif"], labelZh: "快門", aliasesZh: ["聚焦"], axisLabelZh: null, isCxAxis: false }
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
    function push(v) {
      var c = normalizeCode(v);
      if (c && out.indexOf(c) === -1) out.push(c);
    }
    if (t && t.id != null && t.id !== "") push(t.id);
    var codes = (t && t.codes) || [];
    for (var i = 0; i < codes.length; i++) push(codes[i]);
    var alts = (t && t.altCodes) || [];
    for (var j = 0; j < alts.length; j++) push(alts[j]);
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
      if (!t || t.id == null || t.id === "") continue;
      byId[normalizeCode(t.id)] = t;
      var codes = allCodesOf(t);
      for (var c = 0; c < codes.length; c++) byCode[codes[c]] = t;
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

  /** Lookup by English id / codes[] / altCodes[] (case-insensitive). */
  function fromCode(code) {
    var key = normalizeCode(code);
    return key ? (idx.byCode[key] || null) : null;
  }

  function fromId(id) {
    var key = normalizeCode(id);
    return key ? (idx.byId[key] || fromCode(id)) : null;
  }

  /** Lookup by official GIF list or crawler "a.gif;b.gif" string. */
  function fromIcons(icons) {
    var key = iconsKey(icons);
    return key ? (idx.byIcons[key] || null) : null;
  }

  function fromZh(name) {
    return idx.byAnyZh[String(name || "").trim()] || null;
  }

  function labelForCode(code) {
    var t = fromCode(code);
    if (!t) return code == null || code === "" ? "-" : String(code);
    return t.axisLabelZh || t.labelZh || t.id;
  }

  function axisLabelForCode(code) {
    var t = fromCode(code);
    if (!t || !t.isCxAxis) return null;
    return t.axisLabelZh || t.labelZh || null;
  }

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

  function axisOrderLabels() {
    var order = state.data.axisOrder || [];
    var out = [];
    for (var i = 0; i < order.length; i++) {
      var t = fromId(order[i]);
      if (t && (t.axisLabelZh || t.labelZh)) out.push(t.axisLabelZh || t.labelZh);
    }
    return out;
  }

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

  function codeToLabelMap() {
    var out = Object.create(null);
    var list = state.data.triggers || [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t) continue;
      var label = t.labelZh || t.axisLabelZh || t.id;
      if (!label) continue;
      var codes = allCodesOf(t);
      for (var c = 0; c < codes.length; c++) out[codes[c]] = label;
      if (t.id) out[normalizeCode(t.id)] = label;
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
