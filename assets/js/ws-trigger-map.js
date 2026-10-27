/**
 * Shared CX / trigger mapping loader for WS-Cards.
 *
 * Source of truth: json/cxTriggerMap.json (also intended for GCS upload).
 * Call WsTriggerMap.ready() once before using lookups; pages may keep
 * working with the embedded fallback if remote fetch fails.
 *
 * Layers:
 *   id          — English key for program logic (soul2, gate, …)
 *   codes       — values stored on card JSON `trigger` / `cardtrigger`
 *   icons       — official GIF filenames (multi-icon CX uses 2 entries)
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
    version: 1,
    updatedAt: "2026-10-27",
    axisOrder: [
      "gate", "soul2", "salvage", "treasure", "standby",
      "choice", "shot", "bounce", "stock", "draw"
    ],
    triggers: [
      { id: "none", codes: ["0"], icons: [], labelZh: "無", aliasesZh: [], axisLabelZh: null, isCxAxis: false },
      { id: "soul", codes: ["1", "A"], icons: ["soul.gif"], labelZh: "魂+1", aliasesZh: ["靈魂+1", "魂", "靈魂"], axisLabelZh: null, isCxAxis: false },
      { id: "soul2", codes: ["2"], icons: ["soul.gif", "soul.gif"], labelZh: "魂+2", aliasesZh: ["二爆", "二暴", "靈魂+2"], axisLabelZh: "二爆", isCxAxis: true },
      { id: "stock", codes: ["F"], icons: ["stock.gif"], labelZh: "寶袋", aliasesZh: ["庫存"], axisLabelZh: "寶袋", isCxAxis: true },
      { id: "salvage", codes: ["C"], icons: ["salvage.gif"], labelZh: "木門", aliasesZh: ["歸來", "comeback"], axisLabelZh: "木門", isCxAxis: true },
      { id: "bounce", codes: ["1A"], icons: ["soul.gif", "bounce.gif"], labelZh: "風", aliasesZh: ["風吹", "彈回"], axisLabelZh: "風吹", isCxAxis: true },
      { id: "draw", codes: ["D"], icons: ["draw.gif"], labelZh: "書", aliasesZh: ["抽牌"], axisLabelZh: "書", isCxAxis: true },
      { id: "treasure", codes: ["B"], icons: ["treasure.gif"], labelZh: "磚", aliasesZh: ["金磚", "寶箱"], axisLabelZh: "金磚", isCxAxis: true },
      { id: "shot", codes: ["1E"], icons: ["soul.gif", "shot.gif"], labelZh: "燒", aliasesZh: ["火燒", "射擊"], axisLabelZh: "火燒", isCxAxis: true },
      { id: "gate", codes: ["1G"], icons: ["gate.gif"], labelZh: "城門", aliasesZh: ["凱旋門"], axisLabelZh: "凱旋門", isCxAxis: true },
      { id: "standby", codes: ["1H"], icons: ["soul.gif", "standby.gif"], labelZh: "開機", aliasesZh: ["待機"], axisLabelZh: "開機", isCxAxis: true },
      { id: "choice", codes: ["I"], icons: ["choice.gif"], labelZh: "箭頭", aliasesZh: ["選擇"], axisLabelZh: "箭頭", isCxAxis: true },
      { id: "discovery", codes: [], icons: ["discovery.gif"], labelZh: "望遠鏡", aliasesZh: ["發現"], axisLabelZh: null, isCxAxis: false },
      { id: "chance", codes: [], icons: ["chance.gif"], labelZh: "燈泡", aliasesZh: ["機會"], axisLabelZh: null, isCxAxis: false },
      { id: "focus", codes: [], icons: ["focus.gif"], labelZh: "快門", aliasesZh: ["聚焦"], axisLabelZh: null, isCxAxis: false }
    ]
  };

  var state = {
    data: FALLBACK,
    source: "fallback",
    readyPromise: null
  };

  function normalizeCode(code) {
    return String(code == null ? "" : code).trim().toUpperCase();
  }

  function indexMap(data) {
    var byId = Object.create(null);
    var byCode = Object.create(null);
    var byAxisLabel = Object.create(null);
    var byAnyZh = Object.create(null);
    var list = (data && data.triggers) || [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t || !t.id) continue;
      byId[t.id] = t;
      var codes = t.codes || [];
      for (var c = 0; c < codes.length; c++) {
        byCode[normalizeCode(codes[c])] = t;
      }
      if (t.axisLabelZh) byAxisLabel[t.axisLabelZh] = t;
      var names = [t.labelZh, t.axisLabelZh].concat(t.aliasesZh || []);
      for (var n = 0; n < names.length; n++) {
        if (names[n]) byAnyZh[String(names[n])] = t;
      }
    }
    return { byId: byId, byCode: byCode, byAxisLabel: byAxisLabel, byAnyZh: byAnyZh, data: data };
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

  function fromCode(code) {
    return idx.byCode[normalizeCode(code)] || null;
  }

  function fromId(id) {
    return idx.byId[String(id || "")] || null;
  }

  function fromZh(name) {
    return idx.byAnyZh[String(name || "").trim()] || null;
  }

  /** Chart / UI label for a raw card trigger code. */
  function labelForCode(code) {
    var t = fromCode(code);
    if (!t) return code == null || code === "" ? "-" : String(code);
    return t.axisLabelZh || t.labelZh || t.id;
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
      var codes = t.codes || [];
      for (var c = 0; c < codes.length; c++) {
        out[normalizeCode(codes[c])] = label;
      }
    }
    return out;
  }

  /** Ordered axis nicknames (compat with CX_AXIS_ORDER / TOP_AXIS_TOKENS). */
  function axisOrderLabels() {
    var order = state.data.axisOrder || [];
    var out = [];
    for (var i = 0; i < order.length; i++) {
      var t = fromId(order[i]);
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
      var label = t.labelZh || t.axisLabelZh || t.id;
      var codes = t.codes || [];
      for (var c = 0; c < codes.length; c++) {
        out[normalizeCode(codes[c])] = label;
      }
      out[t.id] = label;
    }
    return out;
  }

  function detectAxisTokensInText(raw) {
    var s = String(raw || "").replace(/\s+/g, "");
    // 長別名優先，避免「門」破壞「城門」這類字串
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
    // 長軸心名優先（凱旋門 先於可能的短名）
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
    // 還原為 axisOrder 穩定排序
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
    fromZh: fromZh,
    labelForCode: labelForCode,
    axisLabelForCode: axisLabelForCode,
    codeToAxisLabelMap: codeToAxisLabelMap,
    codeToLabelMap: codeToLabelMap,
    axisOrderLabels: axisOrderLabels,
    axisAliasPairs: axisAliasPairs,
    detectAxisTokensInText: detectAxisTokensInText,
    FALLBACK: FALLBACK,
    GCS_URL: GCS_URL,
    LOCAL_URL: LOCAL_URL
  };

  global.WsTriggerMap = api;
})(typeof window !== "undefined" ? window : globalThis);
