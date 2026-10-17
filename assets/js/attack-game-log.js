/**
 * Attack Game Log — PixiJS full-screen WS attack phase recorder.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "ws-attack-game-log-v1";
  var SLOT_KEYS = ["left", "center", "right"];
  var SLOT_LABELS = { left: "左", center: "中", right: "右" };
  /* Palette aligned with line_test_v102 dark desk (foil / ink / paper) */
  var COLORS = {
    bg: 0x141414,
    panel: 0x1c1b18,
    panel2: 0x24231f,
    line: 0x3a3830,
    ink: 0xe9e7e1,
    muted: 0x9a958b,
    amber: 0xcbb083, /* foil */
    teal: 0x91a9c7,  /* cool accent / P1 */
    coral: 0xdc8a80,
    good: 0x8fc5a4,
    yellow: 0xd5b36f,
    green: 0x568a6d,
    red: 0xb45d52,
    blue: 0x6886a8,
    onAccent: 0x211a10
  };

  var app = null;
  var root = null;
  var ui = { layers: {}, nodes: {} };
  var numberResolver = null;
  var textResolver = null;
  var summaryChart = null;
  var summaryTab = "stats";
  var lastHeaderBottom = 96;

  var state = createEmptyState();
  var SELF_REASON_OPTIONS = [
    { id: "press1draw2", label: "壓1抽2" },
    { id: "charEffect", label: "角色效果" },
    { id: "other", label: "其他" }
  ];
  var SELF_REASON_LABELS = {
    press1draw2: "壓1抽2",
    charEffect: "角色效果",
    other: "其他"
  };

  var uiState = {
    filterLevel: "all",
    filterColor: "all",
    pickerSlot: null,
    attackStep: null,
    draft: null,
    listScroll: 0,
    redeployMode: false,
    sidePanelOpen: false,
    panelAnim: 0,
    panelAnimTarget: 0,
    selfDamageStep: null,
    selfDamageAmount: null,
    toast: "",
    toastUntil: 0
  };

  function createEmptyState() {
    return {
      first: null,
      second: null,
      turn: 1,
      activeSide: "first",
      phase: "setup",
      stages: { first: emptyStage(), second: emptyStage() },
      life: { first: emptyLife(), second: emptyLife() },
      logs: [],
      lastUndo: null,
      ended: false,
      startedAt: null,
      endedAt: null,
      encoreFrom: null,
      endReason: null
    };
  }

  function emptyStage() {
    return {
      left: { card: null, resolvedOnce: false },
      center: { card: null, resolvedOnce: false },
      right: { card: null, resolvedOnce: false }
    };
  }

  function emptyLife() {
    return { level: 0, damage: 0 };
  }

  function ensureLife() {
    if (!state.life) state.life = { first: emptyLife(), second: emptyLife() };
    if (!state.life.first) state.life.first = emptyLife();
    if (!state.life.second) state.life.second = emptyLife();
    state.life.first.level = Number(state.life.first.level) || 0;
    state.life.first.damage = Number(state.life.first.damage) || 0;
    state.life.second.level = Number(state.life.second.level) || 0;
    state.life.second.damage = Number(state.life.second.damage) || 0;
  }

  /** WS clock: every 7 damage → +1 level, remainder stays in damage zone. */
  function applyClockDamage(side, amount) {
    ensureLife();
    var n = Math.max(0, Number(amount) || 0);
    if (!n) return;
    var life = state.life[side];
    life.damage += n;
    while (life.damage >= 7) {
      life.damage -= 7;
      life.level += 1;
    }
  }

  function lifeSnapshot(side) {
    ensureLife();
    var life = state.life[side];
    return { level: life.level, damage: life.damage };
  }

  /**
   * Manually nudge a side's level or damage zone.
   * Does not auto-convert damage→level (level is adjusted separately).
   */
  function adjustLife(side, field, delta) {
    if (state.ended || state.phase === "summary" || state.phase === "setup") {
      toast("對局未進行中");
      return false;
    }
    side = side === "second" ? "second" : "first";
    field = field === "level" ? "level" : "damage";
    delta = Number(delta) || 0;
    if (!delta) return false;
    ensureLife();
    var life = state.life[side];
    var before = lifeSnapshot(side);
    var next = Number(life[field]) || 0;
    next += delta;
    if (field === "level") next = Math.max(0, Math.min(4, next));
    else next = Math.max(0, next);
    if (next === before[field]) {
      toast(field === "level" ? "等級已達上下限" : "傷害不可再減");
      return false;
    }
    life[field] = next;
    var after = lifeSnapshot(side);
    var log = {
      id: uid(),
      kind: "lifeAdjust",
      turn: state.turn,
      side: side,
      activeSide: state.activeSide,
      field: field,
      delta: after[field] - before[field],
      lifeBefore: before,
      lifeAfter: after,
      timestamp: Date.now()
    };
    state.logs.push(log);
    state.lastUndo = { logId: log.id, kind: "lifeAdjust" };
    persist();
    var signed = (log.delta > 0 ? "+" : "") + log.delta;
    var label = field === "level" ? "等級" : "傷害";
    if (checkLevelOut()) {
      toast(sideLabel(side) + " 到達等級 4・對局結束");
      return true;
    }
    render();
    toast(sideLabel(side) + " " + label + " " + signed +
      "（" + before[field] + "→" + after[field] + "）");
    return true;
  }

  function formatLifeArrow(before, after) {
    before = before || { level: 0, damage: 0 };
    after = after || { level: 0, damage: 0 };
    if (Number(before.level) === Number(after.level)) {
      return "傷" + (Number(before.damage) || 0) + "→" + (Number(after.damage) || 0);
    }
    return "Lv" + (Number(before.level) || 0) + "/" + (Number(before.damage) || 0) +
      "→Lv" + (Number(after.level) || 0) + "/" + (Number(after.damage) || 0);
  }

  /**
   * Self-inflicted clock damage for the active (current-turn) player.
   * kind: "refresh" (洗傷, fixed 1) | "other" (其他自傷)
   * selfReason: only for other — press1draw2 | charEffect | other
   */
  function applySelfDamage(amount, kind, selfReason) {
    if (state.ended || state.phase === "summary" || state.phase === "setup") {
      toast("對局未進行中");
      return false;
    }
    var side = state.activeSide === "second" ? "second" : "first";
    var n = Math.max(0, Number(amount) || 0);
    if (!n) {
      toast("傷害需大於 0");
      return false;
    }
    kind = kind === "other" ? "other" : "refresh";
    if (kind === "other" && !SELF_REASON_LABELS[selfReason]) selfReason = "other";
    ensureLife();
    var before = lifeSnapshot(side);
    applyClockDamage(side, n);
    var after = lifeSnapshot(side);
    var log = {
      id: uid(),
      kind: "selfDamage",
      selfKind: kind,
      selfReason: kind === "other" ? selfReason : null,
      turn: state.turn,
      side: side,
      activeSide: state.activeSide,
      amount: n,
      lifeBefore: before,
      lifeAfter: after,
      timestamp: Date.now()
    };
    state.logs.push(log);
    state.lastUndo = { logId: log.id, kind: "selfDamage" };
    uiState.selfDamageStep = null;
    uiState.selfDamageAmount = null;
    persist();
    var kindLabel = kind === "other"
      ? ("其他自傷・" + (SELF_REASON_LABELS[selfReason] || "其他"))
      : "洗傷";
    if (checkLevelOut()) {
      toast(sideLabel(side) + " 到達等級 4・對局結束");
      return true;
    }
    render();
    toast(sideLabel(side) + " " + kindLabel + " " + n +
      "（" + formatLifeArrow(before, after) + "）");
    return true;
  }

  function doRefreshDamage() {
    uiState.selfDamageStep = null;
    uiState.selfDamageAmount = null;
    applySelfDamage(1, "refresh");
  }

  function doOtherSelfDamage() {
    uiState.draft = null;
    uiState.attackStep = null;
    uiState.selfDamageAmount = null;
    uiState.selfDamageStep = "amount";
    render();
  }

  function closeSelfDamageSheet() {
    uiState.selfDamageStep = null;
    uiState.selfDamageAmount = null;
    render();
  }

  function countStageCards(stage) {
    var n = 0;
    for (var i = 0; i < SLOT_KEYS.length; i++) {
      if (stage[SLOT_KEYS[i]] && stage[SLOT_KEYS[i]].card) n += 1;
    }
    return n;
  }

  function isFirstTurnOneLimit() {
    return state.turn === 1 && state.activeSide === "first";
  }

  function uid() {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function activePlayer() {
    return state[state.activeSide];
  }

  function opponentSide() {
    return state.activeSide === "first" ? "second" : "first";
  }

  function opponentPlayer() {
    return state[opponentSide()];
  }

  function activeStage() {
    return state.stages[state.activeSide];
  }

  function opponentStage() {
    return state.stages[opponentSide()];
  }

  function sideLabel(side) {
    return side === "first" ? "先攻" : "後攻";
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        state: state,
        savedAt: Date.now()
      }));
    } catch (e) { /* ignore quota */ }
  }

  function restore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.state) return false;
      state = parsed.state;
      ensureLife();
      if (!state.stages) state.stages = { first: emptyStage(), second: emptyStage() };
      if (!Array.isArray(state.logs)) state.logs = [];
      return true;
    } catch (e) {
      return false;
    }
  }

  function toast(msg, ms) {
    uiState.toast = msg;
    uiState.toastUntil = performance.now() + (ms || 1400);
    render();
  }

  function clearToast() {
    uiState.toast = "";
    uiState.toastUntil = 0;
  }

  function isAttackLog(l) {
    return !!(l && l.kind !== "lifeAdjust" && l.attackerCard);
  }

  function totalsFor(side) {
    var logs = state.logs.filter(function (l) { return l.side === side && isAttackLog(l); });
    var out = {
      declared: logs.length,
      damageHits: 0,
      cancels: 0,
      others: 0,
      actualDamage: 0,
      byType: { direct: 0, front: 0, side: 0, effect: 0 },
      cards: {}
    };
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      if (l.result === "damage") out.damageHits += 1;
      if (l.countsAsCancel) out.cancels += 1;
      if (l.result === "other") out.others += 1;
      out.actualDamage += Number(l.actualDamage) || 0;
      if (out.byType[l.attackType] != null) out.byType[l.attackType] += 1;
      var key = l.attackerCard && (l.attackerCard.cardNo || l.attackerCard.name);
      if (key) out.cards[key] = (out.cards[key] || 0) + 1;
    }
    return out;
  }

  /** Per-card attack damage (same cardNo accumulated). */
  function cardAttackDamageStats(side) {
    var logs = state.logs.filter(function (l) { return l.side === side && isAttackLog(l); });
    var map = {};
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      var ac = l.attackerCard || {};
      var key = ac.cardNo || ac.name;
      if (!key) continue;
      if (!map[key]) {
        map[key] = {
          key: key,
          cardNo: ac.cardNo || "",
          name: ac.name || ac.cardNo || key,
          damage: 0,
          attacks: 0
        };
      }
      map[key].damage += Number(l.actualDamage) || 0;
      map[key].attacks += 1;
    }
    var list = Object.keys(map).map(function (k) { return map[k]; });
    list.sort(function (a, b) {
      if (b.damage !== a.damage) return b.damage - a.damage;
      return b.attacks - a.attacks;
    });
    return list;
  }

  function standStage(stage) {
    if (!stage) return;
    for (var i = 0; i < SLOT_KEYS.length; i++) {
      var slot = stage[SLOT_KEYS[i]];
      if (slot) slot.resolvedOnce = false;
    }
  }

  /** Level 4 = lose (WS). Returns true if match ended. */
  function checkLevelOut() {
    ensureLife();
    var l1 = state.life.first.level;
    var l2 = state.life.second.level;
    if (l1 < 4 && l2 < 4) return false;
    if (l1 >= 4 && l2 >= 4) state.endReason = "both_level4";
    else if (l1 >= 4) state.endReason = "first_level4";
    else state.endReason = "second_level4";
    endGame();
    return true;
  }

  function sessionTotals() {
    var first = totalsFor("first");
    var second = totalsFor("second");
    return {
      damage: first.actualDamage + second.actualDamage,
      cancels: first.cancels + second.cancels
    };
  }

  function playerShortName(side) {
    return side === "first" ? "先攻" : "後攻";
  }

  function formatDateTime(ts) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit"
      });
    } catch (e) {
      return "—";
    }
  }

  function formatDuration(ms) {
    if (!ms || ms < 0) return "—";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    return h + "h " + m + "m " + sec + "s";
  }

  /** Stats from the receiving player's perspective (like reference report). */
  function receivedStatsFor(side) {
    var opp = side === "first" ? "second" : "first";
    var logs = state.logs.filter(function (l) { return l.side === opp && isAttackLog(l); });
    var damageReceived = 0;
    var damageReceivedTimes = 0;
    var cancelDamage = 0;
    var cancelTimes = 0;
    var attacksAgainst = logs.length;
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      var declared = Number(l.declaredDamage) || 0;
      var actual = Number(l.actualDamage) || 0;
      damageReceived += actual;
      if (actual > 0) damageReceivedTimes += 1;
      // Rule: declared 0 cannot count as cancel
      if (declared > 0) {
        var cancelled = 0;
        var isCancelLike = false;
        if (l.result === "cancel") {
          cancelled = declared;
          isCancelLike = true;
        } else if (l.result === "other") {
          cancelled = Math.max(0, declared - actual);
          if (l.otherKind === "triggerCancel" || l.otherKind === "block" || cancelled > 0) {
            isCancelLike = true;
          }
        }
        if (isCancelLike) {
          cancelDamage += cancelled;
          cancelTimes += 1;
        }
      }
    }
    var denom = cancelDamage + damageReceived;
    var cancelRate = denom > 0 ? (cancelDamage / denom) * 100 : 0;
    var attackTot = totalsFor(side);
    return {
      damageReceived: damageReceived,
      damageReceivedTimes: damageReceivedTimes,
      cancelDamage: cancelDamage,
      cancelTimes: cancelTimes,
      cancelRate: cancelRate,
      attacks: attackTot.declared,
      byType: attackTot.byType,
      cards: attackTot.cards,
      attacksAgainst: attacksAgainst
    };
  }

  function turnSeries(metric) {
    var maxTurn = Math.max(1, state.turn || 1);
    for (var i = 0; i < state.logs.length; i++) {
      if (state.logs[i].turn > maxTurn) maxTurn = state.logs[i].turn;
    }
    var labels = [];
    var p1 = [];
    var p2 = [];
    var c1 = 0;
    var c2 = 0;
    for (var t = 0; t <= maxTurn; t++) labels.push(t);
    p1.push(0);
    p2.push(0);
    for (var turn = 1; turn <= maxTurn; turn++) {
      var add1 = 0;
      var add2 = 0;
      for (var li = 0; li < state.logs.length; li++) {
        var l = state.logs[li];
        if (l.turn !== turn || !isAttackLog(l)) continue;
        var declared = Number(l.declaredDamage) || 0;
        var actual = Number(l.actualDamage) || 0;
        var cancelled = 0;
        if (declared > 0) {
          if (l.result === "cancel") cancelled = declared;
          else if (l.result === "other") cancelled = Math.max(0, declared - actual);
        }
        // metric accumulates on the RECEIVING side
        var recvSide = l.side === "first" ? "second" : "first";
        var val = 0;
        if (metric === "damageReceived") val = actual;
        else if (metric === "cancelDamage") val = cancelled;
        else if (metric === "attacks") val = 1;
        if (metric === "attacks") {
          // attacks counted for attacker
          if (l.side === "first") add1 += 1;
          else add2 += 1;
        } else {
          if (recvSide === "first") add1 += val;
          else add2 += val;
        }
      }
      c1 += add1;
      c2 += add2;
      p1.push(c1);
      p2.push(c2);
    }
    return { labels: labels, first: p1, second: p2, maxTurn: maxTurn };
  }

  function buildMatchReport() {
    var s1 = receivedStatsFor("first");
    var s2 = receivedStatsFor("second");
    ensureLife();
    var winner = "平手";
    if (state.endReason === "first_level4") winner = "玩家 2（後攻）・先攻到達等級 4";
    else if (state.endReason === "second_level4") winner = "玩家 1（先攻）・後攻到達等級 4";
    else if (state.endReason === "both_level4") winner = "平手（雙方到達等級 4）";
    else if (s1.damageReceived < s2.damageReceived) winner = "玩家 1（先攻）";
    else if (s2.damageReceived < s1.damageReceived) winner = "玩家 2（後攻）";
    var maxTurn = 1;
    for (var i = 0; i < state.logs.length; i++) {
      if (state.logs[i].turn > maxTurn) maxTurn = state.logs[i].turn;
    }
    if (state.turn > maxTurn) maxTurn = state.turn;
    return {
      p1Name: playerShortName("first"),
      p2Name: playerShortName("second"),
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      winner: winner,
      endReason: state.endReason || null,
      first: s1,
      second: s2,
      cardDamageFirst: cardAttackDamageStats("first"),
      cardDamageSecond: cardAttackDamageStats("second"),
      battleDetail: buildBattleDetail(),
      life: {
        first: { level: state.life.first.level, damage: state.life.first.damage },
        second: { level: state.life.second.level, damage: state.life.second.damage }
      },
      turns: maxTurn,
      decisions: state.logs.length,
      durationMs: (state.endedAt && state.startedAt) ? (state.endedAt - state.startedAt) : 0
    };
  }

  /* ——— DOM overlays ——— */
  function $(id) { return document.getElementById(id); }

  function openOverlay(id) {
    var el = $(id);
    if (el) el.classList.add("is-open");
  }

  function closeOverlay(id) {
    var el = $(id);
    if (el) el.classList.remove("is-open");
  }

  function askNumber(title, hint, allowZero) {
    return new Promise(function (resolve) {
      numberResolver = resolve;
      $("numberTitle").textContent = title || "輸入點數";
      $("numberHint").textContent = hint || "請輸入正整數。";
      $("numberInput").value = "";
      $("numberInput").min = allowZero ? "0" : "1";
      openOverlay("overlay-number");
      setTimeout(function () { $("numberInput").focus(); }, 50);
    });
  }

  function askText(title) {
    return new Promise(function (resolve) {
      textResolver = resolve;
      $("textTitle").textContent = title || "打誰（文字）";
      $("textInput").value = "";
      openOverlay("overlay-text");
      setTimeout(function () { $("textInput").focus(); }, 50);
    });
  }

  function bindOverlays() {
    $("btnNumberCancel").onclick = function () {
      closeOverlay("overlay-number");
      if (numberResolver) {
        var r = numberResolver;
        numberResolver = null;
        r(null);
      }
    };
    $("btnNumberOk").onclick = function () {
      var v = parseInt($("numberInput").value, 10);
      if (isNaN(v) || v < 0 || String($("numberInput").value).indexOf(".") !== -1) {
        toast("請輸入非負整數");
        return;
      }
      closeOverlay("overlay-number");
      if (numberResolver) {
        var r = numberResolver;
        numberResolver = null;
        r(v);
      }
    };
    $("btnTextSkip").onclick = function () {
      closeOverlay("overlay-text");
      if (textResolver) {
        var r = textResolver;
        textResolver = null;
        r("");
      }
    };
    $("btnTextOk").onclick = function () {
      closeOverlay("overlay-text");
      if (textResolver) {
        var r = textResolver;
        textResolver = null;
        r(String($("textInput").value || "").trim());
      }
    };
    $("btnSample").onclick = onSample;
    $("btnImport").onclick = onImport;
    bindSummaryUI();
  }

  function bindSummaryUI() {
    var tabs = document.querySelectorAll("[data-sum-tab]");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function (ev) {
        var tab = ev.currentTarget.getAttribute("data-sum-tab");
        setSummaryTab(tab);
      });
    }
    var metric = $("sumChartMetric");
    if (metric) metric.addEventListener("change", function () { renderSummaryChart(); });
    var c1 = $("sumChartP1");
    var c2 = $("sumChartP2");
    if (c1) c1.addEventListener("change", function () { renderSummaryChart(); });
    if (c2) c2.addEventListener("change", function () { renderSummaryChart(); });
    if ($("btnSumHome")) $("btnSumHome").onclick = resetGame;
    if ($("btnSumExport")) $("btnSumExport").onclick = exportMatchImage;
    if ($("btnSumLoad")) {
      $("btnSumLoad").onclick = function () {
        var f = $("sumLoadFile");
        if (f) f.click();
      };
    }
    if ($("sumLoadFile")) {
      $("sumLoadFile").addEventListener("change", function (ev) {
        var file = ev.target.files && ev.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var parsed = JSON.parse(String(reader.result || ""));
            var next = parsed.state || parsed;
            if (!next || !next.logs) throw new Error("格式不符");
            state = next;
            if (!Array.isArray(state.logs)) state.logs = [];
            ensureLife();
            state.ended = true;
            state.phase = "summary";
            if (!state.endedAt) state.endedAt = Date.now();
            persist();
            render();
          } catch (e) {
            alert("讀取失敗：" + (e.message || e));
          }
        };
        reader.readAsText(file);
        ev.target.value = "";
      });
    }
  }

  function setSummaryTab(tab) {
    summaryTab = tab || "stats";
    var tabs = document.querySelectorAll("[data-sum-tab]");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle("is-active", tabs[i].getAttribute("data-sum-tab") === summaryTab);
    }
    var panes = document.querySelectorAll(".agl-summary-pane");
    for (var p = 0; p < panes.length; p++) {
      panes[p].classList.toggle("is-active", panes[p].getAttribute("data-pane") === summaryTab);
    }
    if (summaryTab === "chart") renderSummaryChart();
    // Always rebuild when opening detail — avoids blank pane after cache / restore races
    if (summaryTab === "detail") fillBattleDetail(buildBattleDetail());
  }

  function hideSummaryUI() {
    var el = $("overlay-summary");
    if (el) el.classList.remove("is-open");
    if (summaryChart) {
      try { summaryChart.destroy(); } catch (e) { /* */ }
      summaryChart = null;
    }
  }

  function showSummaryUI() {
    var el = $("overlay-summary");
    if (!el) return;
    el.classList.add("is-open");
    var report = buildMatchReport();
    $("sumVs").innerHTML =
      '<span class="p1">' + escapeHtml(report.p1Name) + '</span>' +
      '<span class="sep"> vs. </span>' +
      '<span class="p2">' + escapeHtml(report.p2Name) + '</span>';
    $("sumTimes").innerHTML =
      "<div>Started: " + escapeHtml(formatDateTime(report.startedAt)) + "</div>" +
      "<div>Ended: " + escapeHtml(formatDateTime(report.endedAt)) + "</div>";
    var code1 = state.first && state.first.code ? state.first.code : "—";
    var code2 = state.second && state.second.code ? state.second.code : "—";
    $("sumMeta").innerHTML =
      "<div>模式：攻擊記錄</div>" +
      "<div>勝者：" + escapeHtml(report.winner) + "</div>" +
      "<div style=\"font-size:0.75rem;font-weight:500;opacity:.85\">" +
      escapeHtml(code1) + " / " + escapeHtml(code2) + "</div>";
    $("sumHeadP1").textContent = "玩家 1（先攻）";
    $("sumHeadP2").textContent = "玩家 2（後攻）";

    var rows = [
      ["受到傷害", report.first.damageReceived, report.second.damageReceived],
      ["受到傷害次數", report.first.damageReceivedTimes, report.second.damageReceivedTimes],
      ["取消傷害", report.first.cancelDamage, report.second.cancelDamage],
      ["取消傷害次數", report.first.cancelTimes, report.second.cancelTimes],
      ["取消率", report.first.cancelRate.toFixed(2) + "%", report.second.cancelRate.toFixed(2) + "%"],
      ["壓縮率", "—（本工具未記錄）", "—（本工具未記錄）", true],
      ["Attacks", report.first.attacks, report.second.attacks],
      [
        "直 / 正 / 側 / 效",
        report.first.byType.direct + "/" + report.first.byType.front + "/" + report.first.byType.side + "/" + (report.first.byType.effect || 0),
        report.second.byType.direct + "/" + report.second.byType.front + "/" + report.second.byType.side + "/" + (report.second.byType.effect || 0)
      ]
    ];
    var body = $("sumStatBody");
    body.innerHTML = "";
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="label">' + escapeHtml(row[0]) + "</td>" +
        '<td class="p1' + (row[3] ? " small" : "") + '">' + escapeHtml(String(row[1])) + "</td>" +
        '<td class="p2' + (row[3] ? " small" : "") + '">' + escapeHtml(String(row[2])) + "</td>";
      body.appendChild(tr);
    }

    $("sumFootMeta").textContent =
      "Duration: " + formatDuration(report.durationMs) +
      "　總回合數: " + report.turns +
      "　玩家總決策數: " + report.decisions +
      "　總洗牌次數: —";

    fillCardDamageList("sumCardDmg1", report.cardDamageFirst, report.p1Name);
    fillCardDamageList("sumCardDmg2", report.cardDamageSecond, report.p2Name);
    // Empty array is truthy — never skip rebuild with `||`
    var detailGroups = report.battleDetail;
    if (!detailGroups || !detailGroups.length) detailGroups = buildBattleDetail();
    fillBattleDetail(detailGroups);
    if (summaryTab === "decks") summaryTab = "detail";
    setSummaryTab(summaryTab || "stats");
  }

  function attackResultLabel(log) {
    if (!log) return "—";
    if (log.result === "damage") return "吃傷";
    if (log.result === "cancel") return "取消";
    if (log.otherKind === "triggerCancel") return "觸發取消";
    if (log.otherKind === "block") return "擋傷";
    if (log.otherKind === "reduce") {
      return "減傷→" + (Number(log.actualDamage) || 0);
    }
    if (log.result === "other") return "其他";
    return "—";
  }

  function attackResultClass(log) {
    if (!log) return "res-other";
    if (log.result === "damage") return "res-damage";
    if (log.result === "cancel" || log.otherKind === "triggerCancel" || log.otherKind === "block") {
      return "res-cancel";
    }
    return "res-other";
  }

  function lifeAdjustLabel(log) {
    var field = log && log.field === "level" ? "等級" : "傷害";
    var d = Number(log && log.delta) || 0;
    var signed = (d > 0 ? "+" : "") + d;
    var before = log && log.lifeBefore ? Number(log.lifeBefore[log.field]) || 0 : "—";
    var after = log && log.lifeAfter ? Number(log.lifeAfter[log.field]) || 0 : "—";
    return {
      name: "手動調整・" + field,
      meta: signed + "（" + before + "→" + after + "）",
      resultClass: d >= 0 ? "res-damage" : "res-cancel"
    };
  }

  function selfDamageLabel(log) {
    var name = "洗傷";
    if (log && log.selfKind === "other") {
      name = "其他自傷・" + (SELF_REASON_LABELS[log.selfReason] || "其他");
    }
    var amount = Number(log && log.amount) || 0;
    return {
      name: name,
      meta: amount + "傷（" + formatLifeArrow(log && log.lifeBefore, log && log.lifeAfter) + "）",
      resultClass: "res-damage"
    };
  }

  /** Group attacks + life/self-damage events by turn + side for the detail tab. */
  function buildBattleDetail() {
    var groups = [];
    var index = {};
    var logs = Array.isArray(state.logs) ? state.logs : [];
    for (var i = 0; i < logs.length; i++) {
      var log = logs[i];
      if (!log) continue;
      var turn = Number(log.turn) || 1;
      var side = log.side === "second" ? "second" : "first";
      var key = turn + "|" + side;
      if (!index[key]) {
        var seedLife = null;
        if (log.kind === "lifeAdjust" || log.kind === "selfDamage") {
          seedLife = log.lifeBefore || log.lifeAfter;
        } else {
          seedLife = log.attackerLife || null;
        }
        index[key] = {
          turn: turn,
          side: side,
          level: seedLife && seedLife.level != null ? Number(seedLife.level) || 0 : 0,
          entries: []
        };
        groups.push(index[key]);
      }
      if (log.kind === "lifeAdjust") {
        var adj = lifeAdjustLabel(log);
        index[key].entries.push({
          entryType: "lifeAdjust",
          name: adj.name,
          meta: adj.meta,
          resultClass: adj.resultClass
        });
        continue;
      }
      if (log.kind === "selfDamage") {
        var sd = selfDamageLabel(log);
        index[key].entries.push({
          entryType: "selfDamage",
          name: sd.name,
          meta: sd.meta,
          resultClass: sd.resultClass
        });
        continue;
      }
      var ac = log.attackerCard || {};
      index[key].entries.push({
        entryType: "attack",
        name: ac.name || ac.cardNo || "未知角色",
        cardNo: ac.cardNo || "",
        declaredDamage: Number(log.declaredDamage) || 0,
        actualDamage: Number(log.actualDamage) || 0,
        resultLabel: attackResultLabel(log),
        resultClass: attackResultClass(log),
        attackType: log.attackType || ""
      });
    }
    return groups;
  }

  function ensureBattleDetailHost() {
    var host = $("sumBattleDetail");
    if (host) return host;
    var pane = $("sumPaneDetail");
    if (!pane) return null;
    host = document.createElement("div");
    host.id = "sumBattleDetail";
    host.className = "agl-battle-detail";
    host.setAttribute("aria-label", "對戰詳細資訊");
    pane.appendChild(host);
    return host;
  }

  function fillBattleDetail(groups) {
    var host = ensureBattleDetailHost();
    if (!host) return;
    host.innerHTML = "";
    if (!Array.isArray(groups)) groups = buildBattleDetail();
    if (!groups.length) {
      var empty = document.createElement("div");
      empty.className = "agl-battle-detail-empty";
      empty.textContent = "本局尚無對戰紀錄";
      host.appendChild(empty);
      return;
    }
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var block = document.createElement("section");
      block.className = "agl-battle-block is-" + g.side;
      var head = document.createElement("h3");
      head.className = "agl-battle-block-head";
      head.textContent =
        sideLabel(g.side) + " 第" + g.turn + "回 等級" + g.level;
      block.appendChild(head);
      var ul = document.createElement("ul");
      var entries = g.entries || g.attacks || [];
      if (!entries.length) {
        var none = document.createElement("li");
        none.innerHTML = "<span class=\"atk-name\">（本回合無紀錄）</span><span></span>";
        ul.appendChild(none);
      } else {
        for (var a = 0; a < entries.length; a++) {
          var ent = entries[a];
          var li = document.createElement("li");
          if (ent.entryType === "lifeAdjust" || ent.entryType === "selfDamage") {
            li.className = ent.entryType === "selfDamage" ? "is-self-damage" : "is-life-adjust";
            li.innerHTML =
              "<span class=\"atk-name\">" + escapeHtml(ent.name) + "</span>" +
              "<span class=\"atk-meta\"><span class=\"" + ent.resultClass + "\">" +
              escapeHtml(ent.meta) + "</span></span>";
          } else {
            var dmgWord = ent.attackType === "effect" ? "效果傷害 " : "攻擊 ";
            li.innerHTML =
              "<span class=\"atk-name\">" + escapeHtml(ent.name) + "</span>" +
              "<span class=\"atk-meta\">" + dmgWord + ent.declaredDamage +
              "（<span class=\"" + ent.resultClass + "\">" +
              escapeHtml(ent.resultLabel) + "</span>）</span>";
          }
          ul.appendChild(li);
        }
      }
      block.appendChild(ul);
      host.appendChild(block);
    }
  }

  function fillCardDamageList(listId, stats, name) {
    var host = $(listId);
    if (!host) return;
    host.innerHTML = "";
    var h = document.createElement("h3");
    h.textContent = name + "・各卡攻擊傷害";
    host.appendChild(h);
    if (!stats || !stats.length) {
      var empty = document.createElement("div");
      empty.className = "agl-card-dmg-empty";
      empty.textContent = "本局無攻擊傷害";
      host.appendChild(empty);
      return;
    }
    var ul = document.createElement("ul");
    for (var i = 0; i < stats.length; i++) {
      var s = stats[i];
      var li = document.createElement("li");
      var label = (s.name || s.key) + (s.cardNo && s.name !== s.cardNo ? "（" + s.cardNo + "）" : "");
      li.innerHTML =
        "<span>" + escapeHtml(label) + "</span>" +
        "<strong>" + s.damage + " 傷 · ×" + s.attacks + "</strong>";
      ul.appendChild(li);
    }
    host.appendChild(ul);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSummaryChart() {
    if (typeof Chart === "undefined") return;
    var metric = ($("sumChartMetric") && $("sumChartMetric").value) || "damageReceived";
    var titles = {
      damageReceived: "受到傷害",
      cancelDamage: "取消傷害",
      attacks: "Attacks"
    };
    if ($("sumChartTitle")) $("sumChartTitle").textContent = titles[metric] || metric;
    var series = turnSeries(metric);
    var show1 = !$("sumChartP1") || $("sumChartP1").checked;
    var show2 = !$("sumChartP2") || $("sumChartP2").checked;
    var canvas = $("sumChartCanvas");
    if (!canvas) return;
    if (summaryChart) {
      try { summaryChart.destroy(); } catch (e) { /* */ }
      summaryChart = null;
    }
    var datasets = [];
    if (show1) {
      datasets.push({
        label: "玩家 1",
        data: series.first,
        borderColor: "#91a9c7",
        backgroundColor: "rgba(145,169,199,0.16)",
        tension: 0.15,
        pointRadius: 3,
        borderWidth: 2
      });
    }
    if (show2) {
      datasets.push({
        label: "玩家 2",
        data: series.second,
        borderColor: "#cbb083",
        backgroundColor: "rgba(203,176,131,0.16)",
        tension: 0.15,
        pointRadius: 3,
        borderWidth: 2
      });
    }
    summaryChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: { labels: series.labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            title: { display: true, text: "Turn", color: "#9a958b" },
            ticks: { stepSize: 1, color: "#9a958b" },
            grid: { color: "rgba(240,238,230,0.08)" }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: metric === "attacks" ? "Attacks" : "Damage",
              color: "#9a958b"
            },
            ticks: { color: "#9a958b" },
            grid: { color: "rgba(240,238,230,0.08)" }
          }
        }
      }
    });
  }

  function downloadCanvasPng(canvas, filename) {
    return new Promise(function (resolve) {
      var done = function (ok, detail) { resolve({ ok: !!ok, detail: detail || "" }); };
      if (!canvas || !canvas.toBlob) {
        try {
          var url = canvas.toDataURL("image/png");
          var a = document.createElement("a");
          a.download = filename;
          a.href = url;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
          done(true, "dataurl");
        } catch (e) {
          done(false, String((e && e.message) || e));
        }
        return;
      }
      canvas.toBlob(function (blob) {
        if (!blob) {
          done(false, "blob empty");
          return;
        }
        var url = URL.createObjectURL(blob);
        try {
          var a = document.createElement("a");
          a.download = filename;
          a.href = url;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
          // iOS often ignores <a download>; open tab as fallback
          var ua = navigator.userAgent || "";
          if (/iPhone|iPad|iPod/i.test(ua)) {
            window.open(url, "_blank");
          }
          setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
          done(true, "blob");
        } catch (e2) {
          try { window.open(url, "_blank"); done(true, "tab"); }
          catch (e3) { done(false, String((e3 && e3.message) || e3)); }
        }
      }, "image/png");
    });
  }

  function exportMatchImage() {
    var root = $("overlay-summary");
    if (!root || !root.classList.contains("is-open")) {
      alert("尚無可輸出的結算畫面");
      return Promise.resolve(false);
    }
    if (typeof html2canvas !== "function") {
      alert("圖片輸出元件尚未載入，請重新整理後再試");
      return Promise.resolve(false);
    }
    var btn = $("btnSumExport");
    var prevLabel = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "輸出中…";
    }

    var bodyEl = root.querySelector(".agl-summary-body");
    var prev = {
      rootHeight: root.style.height,
      rootMaxHeight: root.style.maxHeight,
      rootOverflow: root.style.overflow,
      rootTop: root.style.top,
      rootLeft: root.style.left,
      rootWidth: root.style.width,
      rootPos: root.style.position,
      bodyOverflow: bodyEl ? bodyEl.style.overflow : "",
      bodyMaxHeight: bodyEl ? bodyEl.style.maxHeight : "",
      bodyHeight: bodyEl ? bodyEl.style.height : ""
    };

    // Expand fixed overlay so html2canvas can capture full scroll content
    root.style.position = "fixed";
    root.style.top = "0px";
    root.style.left = "0px";
    root.style.width = Math.min(1100, Math.max(320, window.innerWidth)) + "px";
    root.style.height = "auto";
    root.style.maxHeight = "none";
    root.style.overflow = "visible";
    if (bodyEl) {
      bodyEl.style.overflow = "visible";
      bodyEl.style.maxHeight = "none";
      bodyEl.style.height = "auto";
      bodyEl.scrollTop = 0;
    }

    var filename = "attack-game-log-" + Date.now() + ".png";
    var restoreStyles = function () {
      root.style.height = prev.rootHeight;
      root.style.maxHeight = prev.rootMaxHeight;
      root.style.overflow = prev.rootOverflow;
      root.style.top = prev.rootTop;
      root.style.left = prev.rootLeft;
      root.style.width = prev.rootWidth;
      root.style.position = prev.rootPos;
      if (bodyEl) {
        bodyEl.style.overflow = prev.bodyOverflow;
        bodyEl.style.maxHeight = prev.bodyMaxHeight;
        bodyEl.style.height = prev.bodyHeight;
      }
    };

    return html2canvas(root, {
      backgroundColor: "#141414",
      useCORS: true,
      allowTaint: true,
      scale: Math.min(2, window.devicePixelRatio || 2),
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: root.scrollWidth || root.offsetWidth,
      windowHeight: root.scrollHeight || root.offsetHeight,
      onclone: function (doc) {
        var cloned = doc.getElementById("overlay-summary");
        if (!cloned) return;
        cloned.style.display = "flex";
        cloned.style.flexDirection = "column";
        cloned.style.position = "static";
        cloned.style.width = Math.min(1100, Math.max(320, window.innerWidth)) + "px";
        cloned.style.height = "auto";
        cloned.style.maxHeight = "none";
        cloned.style.overflow = "visible";
        cloned.style.inset = "auto";
        cloned.style.background = "#141414";
        var actions = cloned.querySelector(".agl-summary-actions");
        if (actions) actions.style.display = "none";
        var body = cloned.querySelector(".agl-summary-body");
        if (body) {
          body.style.overflow = "visible";
          body.style.maxHeight = "none";
          body.style.height = "auto";
          body.style.flex = "none";
        }
        // Stack stats + battle detail in the export image (hide chart)
        var panes = cloned.querySelectorAll(".agl-summary-pane");
        for (var i = 0; i < panes.length; i++) {
          var pane = panes[i];
          var kind = pane.getAttribute("data-pane");
          if (kind === "stats" || kind === "detail") {
            pane.style.display = "block";
            pane.style.height = "auto";
            pane.classList.add("is-active");
          } else {
            pane.style.display = "none";
            pane.classList.remove("is-active");
          }
        }
        var detailHost = cloned.getElementById("sumBattleDetail");
        if (detailHost) {
          detailHost.style.height = "auto";
          detailHost.style.overflow = "visible";
          detailHost.style.minHeight = "0";
        }
      }
    }).then(function (canvas) {
      restoreStyles();
      if (!canvas || canvas.width < 2 || canvas.height < 2) {
        throw new Error("截圖結果是空白的");
      }
      return downloadCanvasPng(canvas, filename);
    }).then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.detail) || "下載失敗");
      if (btn) btn.textContent = "已下載";
      setTimeout(function () {
        if (btn && btn.textContent === "已下載") btn.textContent = prevLabel || "輸出圖片";
      }, 1600);
      return true;
    }).catch(function (e) {
      restoreStyles();
      alert("輸出圖片失敗：" + ((e && e.message) || e));
      return false;
    }).then(function (ok) {
      if (btn) {
        btn.disabled = false;
        if (btn.textContent === "輸出中…") btn.textContent = prevLabel || "輸出圖片";
      }
      return ok;
    });
  }

  function setSetupStatus(msg, isErr) {
    var el = $("setupStatus");
    el.textContent = msg || "";
    el.className = "agl-status" + (isErr ? " is-err" : "");
  }

  async function onSample() {
    setSetupStatus("載入示範牌組…");
    try {
      var deck = await window.WsDecklog.loadSampleBandDeck();
      state.first = Object.assign({ label: "先攻" }, deck);
      state.second = Object.assign({ label: "後攻" }, JSON.parse(JSON.stringify(deck)));
      state.second.code = deck.code + "-B";
      beginRecording();
    } catch (e) {
      setSetupStatus(String(e.message || e), true);
    }
  }

  async function onImport() {
    var a = $("firstCode").value.trim();
    var b = $("secondCode").value.trim();
    if (!a || !b) {
      setSetupStatus("請輸入雙方 DeckLog 代碼（或用示範牌組）。", true);
      return;
    }
    setSetupStatus("匯入中…");
    try {
      var first = await window.WsDecklog.fetchDecklogByCode(a);
      var second = await window.WsDecklog.fetchDecklogByCode(b);
      state.first = Object.assign({ label: "先攻" }, first);
      state.second = Object.assign({ label: "後攻" }, second);
      beginRecording();
    } catch (e) {
      setSetupStatus(String(e.message || e), true);
    }
  }

  function beginRecording() {
    state.phase = "deploy";
    state.turn = 1;
    state.activeSide = "first";
    state.stages = { first: emptyStage(), second: emptyStage() };
    state.life = { first: emptyLife(), second: emptyLife() };
    state.logs = [];
    state.lastUndo = null;
    state.ended = false;
    state.startedAt = Date.now();
    state.endedAt = null;
    state.encoreFrom = null;
    state.endReason = null;
    uiState.attackStep = null;
    uiState.draft = null;
    uiState.pickerSlot = null;
    uiState.redeployMode = false;
    uiState.sidePanelOpen = false;
    uiState.panelAnim = 0;
    uiState.panelAnimTarget = 0;
    closeOverlay("overlay-setup");
    hideSummaryUI();
    clearPickerThumbs();
    persist();
    render();
    toast("記錄開始・先攻布陣（第1回合限1隻）");
  }

  /* ——— Pixi helpers ——— */
  function makeText(str, opts) {
    opts = opts || {};
    var style = new PIXI.TextStyle({
      fontFamily: opts.display
        ? '"Zen Old Mincho", "Noto Serif TC", "Zen Kaku Gothic New", sans-serif'
        : '"Zen Kaku Gothic New", "Noto Sans TC", sans-serif',
      fontSize: opts.size || 14,
      fontWeight: opts.weight || "500",
      fill: opts.fill != null ? opts.fill : COLORS.ink,
      align: opts.align || "left",
      wordWrap: !!opts.wrap,
      wordWrapWidth: opts.wrapWidth || 200,
      breakWords: true
    });
    return new PIXI.Text(String(str == null ? "" : str), style);
  }

  function gFillRect(g, x, y, w, h, color, alpha) {
    g.beginFill(color, alpha == null ? 1 : alpha);
    g.drawRect(x, y, w, h);
    g.endFill();
  }

  function gFillRound(g, x, y, w, h, r, color, alpha) {
    g.beginFill(color, alpha == null ? 1 : alpha);
    g.drawRoundedRect(x, y, w, h, r);
    g.endFill();
  }

  function gStrokeRound(g, x, y, w, h, r, color, width) {
    g.lineStyle(width || 1, color, 1);
    g.drawRoundedRect(x, y, w, h, r);
  }

  function gFillEllipse(g, x, y, rw, rh, color, alpha) {
    g.beginFill(color, alpha == null ? 1 : alpha);
    g.drawEllipse(x, y, rw, rh);
    g.endFill();
  }

  function makeBtn(label, w, h, fill, opts) {
    opts = opts || {};
    var c = new PIXI.Container();
    c.eventMode = "static";
    c.cursor = "pointer";
    var g = new PIXI.Graphics();
    var radius = opts.radius != null ? opts.radius : 12;
    gFillRound(g, 0, 0, w, h, radius, fill, 1);
    if (opts.stroke) gStrokeRound(g, 0, 0, w, h, radius, opts.stroke, 1.5);
    c.addChild(g);
    var t = makeText(label, {
      size: opts.size || 15,
      weight: "700",
      fill: opts.textFill != null ? opts.textFill : COLORS.ink,
      display: true
    });
    t.anchor.set(0.5);
    t.x = w / 2;
    t.y = h / 2;
    c.addChild(t);
    c._bg = g;
    c._label = t;
    c._w = w;
    c._h = h;
    return c;
  }

  function hit(c, fn) {
    c.on("pointertap", function (e) {
      e.stopPropagation();
      fn();
    });
    return c;
  }

  function clearLayer(layer) {
    while (layer.children.length) {
      var ch = layer.children[0];
      layer.removeChild(ch);
      if (ch.destroy) ch.destroy({ children: true });
    }
  }

  function isLandscape() {
    return window.innerWidth >= window.innerHeight;
  }

  function isSidePanelOpen() {
    return !!uiState.sidePanelOpen;
  }

  function sidePanelProgress() {
    return uiState.panelAnim || 0;
  }

  function setSidePanel(open) {
    uiState.sidePanelOpen = !!open;
    uiState.panelAnimTarget = open ? 1 : 0;
    if (open && uiState.panelAnim < 0.01) uiState.panelAnim = 0.02;
    if (!open) clearPickerThumbs();
    render();
  }

  function stageColWidth() {
    var w = app.screen.width;
    if (!isLandscape()) return Math.min(w, 430);
    // Attack / split layout keeps a left stage column
    return Math.floor(Math.min(w * 0.44, 420));
  }

  function cardAspect(mode) {
    var h = app.screen.height;
    var w = app.screen.width;
    var land = isLandscape();
    var deployHero = mode === "hero" || (state.phase === "deploy" && mode !== "split");
    var gap = deployHero ? 14 : 8;
    // Header chips + title/sub + bottom CTA must stay clear of card art
    var chromeTop = land ? 120 : 150;
    var chromeBottom = 68;

    if (deployHero && land) {
      var maxH = Math.max(140, h - chromeTop - chromeBottom);
      var maxStageW = Math.floor(w * 0.82);
      var slotH = maxH;
      var slotW = Math.floor(slotH / 1.4);
      var totalW = slotW * 3 + gap * 2;
      if (totalW > maxStageW) {
        slotW = Math.floor((maxStageW - gap * 2) / 3);
        slotH = Math.floor(slotW * 1.4);
      }
      return { slotW: slotW, slotH: slotH, gap: gap, colW: slotW * 3 + gap * 2 };
    }

    var colW = stageColWidth();
    var slotW = Math.floor((colW - 24) / 3);
    var slotH = Math.floor(slotW * 1.4);
    var maxH = Math.max(120, h - chromeTop - chromeBottom);
    if (slotH > maxH) {
      slotH = maxH;
      slotW = Math.floor(slotH / 1.4);
    }
    return { slotW: slotW, slotH: slotH, gap: gap, colW: colW };
  }

  /** Place a bottom CTA without overlapping stage slots / card art. */
  function placeBottomCta(btn, w, h) {
    btn.x = Math.floor((w - btn._w) / 2);
    btn.y = h - btn._h - 12;
    return btn.y;
  }

  /** Fit slots between header content and bottom CTA. */
  function fitSlotsInBand(topY, bottomY, dim) {
    var avail = Math.max(100, bottomY - topY);
    var next = { slotW: dim.slotW, slotH: dim.slotH, gap: dim.gap };
    if (next.slotH > avail) {
      next.slotH = avail;
      next.slotW = Math.floor(next.slotH / 1.4);
    }
    var y = topY + Math.max(0, Math.floor((avail - next.slotH) / 2));
    return { dim: next, y: y };
  }

  function tryLockLandscape() {
    try {
      var ori = screen.orientation || screen.mozOrientation || screen.msOrientation;
      if (ori && typeof ori.lock === "function") {
        return Promise.resolve(ori.lock("landscape")).catch(function () { /* iOS / denied */ });
      }
    } catch (e) { /* ignore */ }
    return Promise.resolve();
  }

  function isAppFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function exitAppFullscreen() {
    if (!isAppFullscreen()) return Promise.resolve(true);
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen || document.msExitFullscreen;
    if (!exit) return Promise.resolve(false);
    try {
      return Promise.resolve(exit.call(document)).then(function () { return true; }).catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  /** Keep shell inside the visible area (excludes URL / tab bars). */
  function applyVisualViewport() {
    var root = document.documentElement;
    var vv = window.visualViewport;
    var top = 0;
    var left = 0;
    var width = window.innerWidth;
    var height = window.innerHeight;
    if (vv) {
      top = vv.offsetTop || 0;
      left = vv.offsetLeft || 0;
      width = vv.width || width;
      height = vv.height || height;
    }
    root.style.setProperty("--vv-top", Math.round(top) + "px");
    root.style.setProperty("--vv-left", Math.round(left) + "px");
    root.style.setProperty("--vv-width", Math.round(width) + "px");
    root.style.setProperty("--vv-height", Math.round(height) + "px");
    document.body.classList.toggle("is-chrome-compact", isLandscape() && height >= (window.outerHeight || height) * 0.92);
    document.body.classList.toggle("is-fullscreen", isAppFullscreen());
  }

  var chromeCollapseTimer = 0;
  var chromeCollapseBusy = false;

  /** Soft-scroll best-effort (Chrome Android may shrink toolbar). */
  function softCollapseBrowserChrome() {
    applyVisualViewport();
    if (!isLandscape() || isAppFullscreen()) return Promise.resolve(false);
    if (chromeCollapseBusy) return Promise.resolve(false);
    chromeCollapseBusy = true;
    tryLockLandscape();
    return new Promise(function (resolve) {
      var html = document.documentElement;
      var body = document.body;
      var prevHtmlOverflow = html.style.overflow;
      var prevBodyOverflow = body.style.overflow;
      var prevHtmlHeight = html.style.height;
      var target = Math.max(
        window.outerHeight || 0,
        (window.screen && screen.height) || 0,
        window.innerHeight + 96
      );
      html.style.overflow = "auto";
      body.style.overflow = "auto";
      html.style.height = target + "px";
      window.scrollTo(0, 0);
      requestAnimationFrame(function () {
        window.scrollTo(0, Math.min(80, Math.max(1, target - window.innerHeight)));
        requestAnimationFrame(function () {
          window.scrollTo(0, 0);
          html.style.overflow = prevHtmlOverflow;
          body.style.overflow = prevBodyOverflow;
          html.style.height = prevHtmlHeight;
          applyVisualViewport();
          chromeCollapseBusy = false;
          resolve(true);
        });
      });
    });
  }

  function scheduleSoftCollapse(delay) {
    if (chromeCollapseTimer) clearTimeout(chromeCollapseTimer);
    chromeCollapseTimer = setTimeout(function () {
      chromeCollapseTimer = 0;
      softCollapseBrowserChrome().then(function () {
        if (app) render();
      });
    }, delay == null ? 60 : delay);
  }

  function syncOrientGate() {
    var gate = $("orient-gate");
    if (!gate) return;
    var portrait = !isLandscape();
    gate.style.display = portrait ? "flex" : "none";
    gate.setAttribute("aria-hidden", portrait ? "false" : "true");
    document.body.classList.toggle("is-portrait", portrait);
    document.body.classList.toggle("is-landscape", !portrait);
    applyVisualViewport();
    if (!portrait && !isAppFullscreen()) scheduleSoftCollapse(120);
    // Leaving landscape: exit immersive so portrait gate isn't stuck under FS.
    if (portrait && isAppFullscreen()) exitAppFullscreen();
  }

  function clearCardArtLayer() {
    var layer = $("agl-card-layer");
    if (layer) layer.innerHTML = "";
  }

  function clearPickerThumbs() {
    var layer = $("agl-picker-layer");
    if (layer) layer.innerHTML = "";
  }

  function syncPickerThumbs(thumbs) {
    var layer = $("agl-picker-layer");
    if (!layer) return;
    layer.innerHTML = "";
    if (!thumbs || !thumbs.length) return;
    if (sidePanelProgress() < 0.2) return;
    for (var i = 0; i < thumbs.length; i++) {
      var t = thumbs[i];
      if (!t || !t.url || t.clipped) continue;
      var img = document.createElement("img");
      img.className = "agl-picker-thumb";
      img.alt = "";
      img.draggable = false;
      img.loading = "lazy";
      img.src = t.url;
      img.style.left = Math.round(t.x) + "px";
      img.style.top = Math.round(t.y) + "px";
      img.style.width = Math.round(t.w) + "px";
      img.style.height = Math.round(t.h) + "px";
      layer.appendChild(img);
    }
  }

  function syncCardArtLayer(rects) {
    var layer = $("agl-card-layer");
    if (!layer) return;
    layer.innerHTML = "";
    if (!rects || !rects.length) return;
    if (state.phase !== "deploy" && state.phase !== "attack" && state.phase !== "encore") return;
    if (state.phase === "summary" || state.ended) return;

    var panelLeft = Infinity;
    var tPanel = sidePanelProgress();
    if (state.phase === "deploy" && tPanel > 0.05) {
      var w = app.screen.width;
      var panelW = isLandscape() ? Math.floor(Math.min(w * 0.4, 360)) : w;
      panelLeft = isLandscape() ? (w - panelW * tPanel) : 0;
    }

    var screenH = app ? app.screen.height : window.innerHeight;
    var screenW = app ? app.screen.width : window.innerWidth;
    var ctaTop = screenH - 64; // keep bottom CTA visually clear
    var tabLeft = screenW - 44; // keep side「選卡」tab clear

    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (!r || !r.url) continue;
      // Hide art under the open side panel
      if (r.x + r.w * 0.45 > panelLeft) continue;
      var left = Math.round(r.x + 6);
      var top = Math.round(r.y + 22);
      var width = Math.max(8, Math.round(r.w - 12));
      var height = Math.max(8, Math.round(r.h - 44));
      // Clip against bottom CTA and right tab so DOM art never covers controls
      if (left + width > tabLeft) width = Math.max(8, tabLeft - left - 4);
      if (top >= ctaTop) continue;
      if (top + height > ctaTop) height = Math.max(8, ctaTop - top - 4);
      if (width < 8 || height < 8) continue;
      var img = document.createElement("img");
      img.className = "agl-slot-art" + (r.rested ? " is-rested" : "");
      img.alt = "";
      img.draggable = false;
      img.src = r.url;
      img.style.left = left + "px";
      img.style.top = top + "px";
      img.style.width = width + "px";
      img.style.height = height + "px";
      layer.appendChild(img);
    }
  }

  function colorTint(color) {
    var c = String(color || "");
    if (/黃|黄|yellow/i.test(c)) return COLORS.yellow;
    if (/綠|緑|green/i.test(c)) return COLORS.green;
    if (/赤|紅|red/i.test(c)) return COLORS.red;
    if (/青|藍|blue/i.test(c)) return COLORS.blue;
    return COLORS.line;
  }

  function normalizeColorFilter(color) {
    var c = String(color || "");
    if (/黃|黄|yellow/i.test(c)) return "yellow";
    if (/綠|緑|green/i.test(c)) return "green";
    if (/赤|紅|red/i.test(c)) return "red";
    if (/青|藍|blue/i.test(c)) return "blue";
    return "";
  }

  function filteredCharacters() {
    var chars = (activePlayer() && activePlayer().characters) || [];
    return chars.filter(function (c) {
      if (uiState.filterLevel !== "all") {
        if (Number(c.level) !== Number(uiState.filterLevel)) return false;
      }
      if (uiState.filterColor !== "all") {
        if (normalizeColorFilter(c.color) !== uiState.filterColor) return false;
      }
      return true;
    });
  }

  /* ——— Game actions ——— */
  function setCardOnSlot(slotKey, card) {
    var stage = activeStage();
    if (card && isFirstTurnOneLimit()) {
      var occupiedElsewhere = false;
      for (var i = 0; i < SLOT_KEYS.length; i++) {
        var k = SLOT_KEYS[i];
        if (k === slotKey) continue;
        if (stage[k] && stage[k].card) {
          occupiedElsewhere = true;
          break;
        }
      }
      if (occupiedElsewhere) {
        toast("先攻第 1 回合只能放 1 隻角色");
        return false;
      }
    }
    stage[slotKey].card = card ? Object.assign({}, card) : null;
    if (!card) stage[slotKey].resolvedOnce = false;
    persist();
    render();
    return true;
  }

  function startAttackOnSlot(slotKey) {
    var slot = activeStage()[slotKey];
    if (!slot.card) {
      toast("空槽：點布陣或先放卡");
      return;
    }
    uiState.draft = {
      slot: slotKey,
      attackType: null,
      target: { fromSlot: null, freeText: "" },
      declaredDamage: null,
      result: null,
      otherKind: null,
      actualDamage: null
    };
    uiState.attackStep = "type";
    render();
  }

  function commitAttack() {
    var d = uiState.draft;
    if (!d) return;
    var attacker = activeStage()[d.slot].card;
    if (!attacker) {
      toast("攻擊角色已不在場上");
      return;
    }
    var declared = Number(d.declaredDamage) || 0;
    if (d.result === "cancel" && declared <= 0) {
      toast("宣告 0 點不能算取消");
      return;
    }
    var receiver = opponentSide();
    var dealt = Math.max(0, Number(d.actualDamage) || 0);
    var lifeBefore = lifeSnapshot(receiver);
    if (dealt > 0) applyClockDamage(receiver, dealt);
    var lifeAfter = lifeSnapshot(receiver);
    var log = {
      id: uid(),
      turn: state.turn,
      side: state.activeSide,
      slot: d.slot,
      attackerCard: {
        cardNo: attacker.cardNo,
        name: attacker.name,
        imageUrl: attacker.imageUrl,
        level: attacker.level,
        color: attacker.color
      },
      attackType: d.attackType,
      target: d.target,
      declaredDamage: d.declaredDamage,
      result: d.result,
      otherKind: d.otherKind,
      actualDamage: d.actualDamage,
      countsAsCancel: d.result === "cancel" && declared > 0,
      dealtTo: receiver,
      attackerLife: lifeSnapshot(state.activeSide),
      lifeBefore: lifeBefore,
      lifeAfter: lifeAfter,
      timestamp: Date.now()
    };
    state.logs.push(log);
    state.lastUndo = { logId: log.id };
    activeStage()[d.slot].resolvedOnce = true;
    uiState.draft = null;
    uiState.attackStep = null;
    persist();
    if (checkLevelOut()) {
      toast(sideLabel(receiver) + " 到達等級 4・對局結束");
      return;
    }
    render();
    var msg;
    if (d.result === "cancel") msg = "已取消（仍計使用）";
    else if (dealt > 0) {
      msg = sideLabel(receiver) + " → 等級 " + lifeAfter.level + " 傷害 " + lifeAfter.damage;
      if (lifeAfter.level > lifeBefore.level) msg = "升級！" + msg;
    } else {
      msg = "已記錄";
    }
    toast(msg);
  }

  function undoLast() {
    if (!state.lastUndo || !state.logs.length) {
      toast("沒有可撤銷的紀錄");
      return;
    }
    var last = state.logs[state.logs.length - 1];
    if (!last || last.id !== state.lastUndo.logId) {
      toast("只能撤銷上一筆紀錄");
      return;
    }
    state.logs.pop();
    state.lastUndo = null;
    if ((last.kind === "lifeAdjust" || last.kind === "selfDamage") && last.side && last.lifeBefore) {
      ensureLife();
      state.life[last.side] = {
        level: Number(last.lifeBefore.level) || 0,
        damage: Number(last.lifeBefore.damage) || 0
      };
    } else if (last.dealtTo && last.lifeBefore) {
      ensureLife();
      state.life[last.dealtTo] = {
        level: Number(last.lifeBefore.level) || 0,
        damage: Number(last.lifeBefore.damage) || 0
      };
    }
    if (last.kind !== "lifeAdjust" && last.kind !== "selfDamage" &&
        last.side && last.slot &&
        state.stages[last.side] && state.stages[last.side][last.slot]) {
      state.stages[last.side][last.slot].resolvedOnce = false;
    }
    persist();
    render();
    var undoMsg = "已撤銷上一筆攻擊";
    if (last.kind === "lifeAdjust") undoMsg = "已撤銷生命調整";
    else if (last.kind === "selfDamage") undoMsg = "已撤銷自傷";
    toast(undoMsg);
  }

  function endAttackPhase() {
    uiState.draft = null;
    uiState.attackStep = null;
    uiState.pickerSlot = null;
    uiState.redeployMode = false;
    setSidePanel(false);
    state.encoreFrom = state.activeSide;
    state.phase = "encore";
    persist();
    render();
    toast("安可階段・點卡可移除");
  }

  function endEncorePhase() {
    uiState.draft = null;
    uiState.attackStep = null;
    uiState.pickerSlot = null;
    var from = state.encoreFrom || state.activeSide;
    state.encoreFrom = null;
    if (from === "first") {
      state.activeSide = "second";
      state.phase = "deploy";
      toast("換後攻布陣");
    } else {
      state.turn += 1;
      state.activeSide = "first";
      state.phase = "deploy";
      // Keep characters on stage; stand them for the new turn
      standStage(state.stages.first);
      standStage(state.stages.second);
      toast("第 " + state.turn + " 回合・先攻布陣（場上角色保留）");
    }
    persist();
    render();
  }

  function removeEncoreCard(side, slotKey) {
    var stage = state.stages[side];
    if (!stage || !stage[slotKey] || !stage[slotKey].card) {
      toast("此槽沒有卡");
      return;
    }
    stage[slotKey].card = null;
    stage[slotKey].resolvedOnce = false;
    persist();
    render();
    toast("已移除" + sideLabel(side) + "・" + SLOT_LABELS[slotKey]);
  }

  function endGame() {
    state.ended = true;
    state.phase = "summary";
    state.endedAt = Date.now();
    uiState.draft = null;
    uiState.attackStep = null;
    persist();
    render();
  }

  function resetGame() {
    hideSummaryUI();
    clearCardArtLayer();
    clearPickerThumbs();
    state = createEmptyState();
    uiState = {
      filterLevel: "all",
      filterColor: "all",
      pickerSlot: null,
      attackStep: null,
      draft: null,
      listScroll: 0,
      redeployMode: false,
      sidePanelOpen: false,
      panelAnim: 0,
      panelAnimTarget: 0,
      selfDamageStep: null,
      selfDamageAmount: null,
      toast: "",
      toastUntil: 0
    };
    summaryTab = "stats";
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* */ }
    openOverlay("overlay-setup");
    render();
  }

  /* ——— Render screens ——— */
  function render() {
    if (!root) return;
    clearLayer(root);
    var w = app.screen.width;
    var h = app.screen.height;

    var bg = new PIXI.Graphics();
    gFillRect(bg, 0, 0, w, h, COLORS.bg, 1);
    gFillRect(bg, 0, 0, w, h * 0.35, 0x1a1916, 0.92);
    gFillEllipse(bg, w * 0.18, 0, w * 0.42, h * 0.26, COLORS.amber, 0.07);
    gFillEllipse(bg, w * 0.9, h * 0.88, w * 0.38, h * 0.28, COLORS.teal, 0.06);
    root.addChild(bg);

    if (state.phase === "setup") {
      hideSummaryUI();
      clearCardArtLayer();
      clearPickerThumbs();
      drawIdleBrand(w, h);
      return;
    }
    if (state.phase === "summary" || state.ended) {
      clearCardArtLayer();
      clearPickerThumbs();
      drawSummary(w, h);
      return;
    }

    hideSummaryUI();
    drawHeader(w);
    if (state.phase === "deploy") drawDeploy(w, h);
    else if (state.phase === "attack") drawAttack(w, h);
    else if (state.phase === "encore") drawEncore(w, h);
    else clearPickerThumbs();

    if (uiState.selfDamageStep) drawSelfDamageSheet(w, h);

    if (uiState.toast && performance.now() < uiState.toastUntil) {
      drawToast(w, h, uiState.toast);
    } else {
      uiState.toast = "";
    }
  }

  function drawSelfDamageSheet(w, h) {
    var dim = new PIXI.Graphics();
    gFillRect(dim, 0, 0, w, h, 0x000000, 0.55);
    dim.eventMode = "static";
    dim.cursor = "pointer";
    hit(dim, closeSelfDamageSheet);
    root.addChild(dim);

    var sheetW = Math.min(360, w - 32);
    var sheetH = uiState.selfDamageStep === "reason" ? 260 : 220;
    var sheet = new PIXI.Container();
    sheet.x = Math.floor((w - sheetW) / 2);
    sheet.y = Math.floor((h - sheetH) / 2);
    sheet.eventMode = "static";
    // swallow taps so backdrop doesn't close when pressing buttons
    sheet.on("pointertap", function (e) { if (e && e.stopPropagation) e.stopPropagation(); });
    var bg = new PIXI.Graphics();
    gFillRound(bg, 0, 0, sheetW, sheetH, 14, COLORS.panel, 0.98);
    gStrokeRound(bg, 0, 0, sheetW, sheetH, 14, COLORS.amber, 1.5);
    sheet.addChild(bg);

    var title = makeText(
      uiState.selfDamageStep === "reason" ? "自傷理由" : "其他自傷・選擇點數",
      { size: 16, weight: "700", fill: COLORS.ink, display: true }
    );
    title.x = 16;
    title.y = 14;
    sheet.addChild(title);

    var closeBtn = makeBtn("關閉", 64, 30, COLORS.panel2, {
      size: 12, stroke: COLORS.line, textFill: COLORS.muted, radius: 8
    });
    closeBtn.x = sheetW - 76;
    closeBtn.y = 12;
    hit(closeBtn, closeSelfDamageSheet);
    sheet.addChild(closeBtn);

    var y = 56;
    if (uiState.selfDamageStep === "amount") {
      var hint = makeText("當回合・" + sideLabel(state.activeSide) + " 自傷", {
        size: 13, fill: COLORS.muted, display: true
      });
      hint.x = 16;
      hint.y = y;
      sheet.addChild(hint);
      y += 32;
      var bw = Math.floor((sheetW - 32 - 18) / 4);
      for (var i = 1; i <= 4; i++) {
        var b = makeBtn(String(i), bw, 48, COLORS.panel2, {
          size: 20, display: true, stroke: COLORS.coral, textFill: COLORS.coral, radius: 10
        });
        b.x = 16 + (i - 1) * (bw + 6);
        b.y = y;
        (function (n) {
          hit(b, function () {
            uiState.selfDamageAmount = n;
            uiState.selfDamageStep = "reason";
            render();
          });
        })(i);
        sheet.addChild(b);
      }
    } else {
      var amt = Number(uiState.selfDamageAmount) || 0;
      var sub = makeText("已選 " + amt + " 傷・請選理由", {
        size: 13, fill: COLORS.muted, display: true
      });
      sub.x = 16;
      sub.y = y;
      sheet.addChild(sub);
      y += 32;
      for (var r = 0; r < SELF_REASON_OPTIONS.length; r++) {
        var opt = SELF_REASON_OPTIONS[r];
        var rb = makeBtn(opt.label, sheetW - 32, 44, COLORS.panel2, {
          size: 15, stroke: COLORS.amber, textFill: COLORS.ink, radius: 10
        });
        rb.x = 16;
        rb.y = y;
        (function (id) {
          hit(rb, function () {
            applySelfDamage(uiState.selfDamageAmount, "other", id);
          });
        })(opt.id);
        sheet.addChild(rb);
        y += 52;
      }
    }
    root.addChild(sheet);
  }

  function drawIdleBrand(w, h) {
    var title = makeText("攻擊記錄", { size: 34, weight: "700", fill: COLORS.ink, display: true });
    title.anchor.set(0.5);
    title.x = w / 2;
    title.y = h * 0.38;
    root.addChild(title);
    var sub = makeText("卡片雲・攻擊階段紀錄", { size: 15, fill: COLORS.muted });
    sub.anchor.set(0.5);
    sub.x = w / 2;
    sub.y = title.y + 36;
    root.addChild(sub);
  }

  function drawLifeStepper(parent, x, y, side, field, value, accent, compact) {
    var label = field === "level" ? "等級" : "傷害";
    var btnW = compact ? 26 : 28;
    var btnH = compact ? 24 : 26;
    var gap = 4;
    var lab = makeText(label, {
      size: compact ? 11 : 12,
      weight: "700",
      fill: COLORS.muted,
      display: true
    });
    lab.x = x;
    lab.y = y + Math.floor((btnH - lab.height) / 2);
    parent.addChild(lab);

    var cx = x + Math.ceil(lab.width) + 6;
    var minus = makeBtn("−", btnW, btnH, COLORS.panel2, {
      size: 16, stroke: accent, textFill: accent, radius: 7
    });
    minus.x = cx;
    minus.y = y;
    hit(minus, function () { adjustLife(side, field, -1); });
    parent.addChild(minus);

    var val = makeText(String(value), {
      size: compact ? 14 : 15,
      weight: "700",
      fill: COLORS.ink,
      display: true
    });
    var valW = Math.max(22, Math.ceil(val.width));
    val.x = cx + btnW + gap + Math.floor((valW - val.width) / 2);
    val.y = y + Math.floor((btnH - val.height) / 2);
    parent.addChild(val);

    var plus = makeBtn("+", btnW, btnH, COLORS.panel2, {
      size: 16, stroke: accent, textFill: accent, radius: 7
    });
    plus.x = cx + btnW + gap + valW + gap;
    plus.y = y;
    hit(plus, function () { adjustLife(side, field, +1); });
    parent.addChild(plus);

    return {
      w: (plus.x + btnW) - x,
      h: btnH
    };
  }

  function drawLifeChip(x, y, label, side, life, color, active, compact) {
    var box = new PIXI.Container();
    box.x = x;
    box.y = y;
    root.addChild(box);

    var rowGap = compact ? 4 : 5;
    var innerPadX = compact ? 8 : 10;
    var innerPadY = compact ? 6 : 7;
    var title = makeText(label, {
      size: compact ? 12 : 13,
      weight: "700",
      fill: active ? COLORS.onAccent : color,
      display: true
    });
    title.x = innerPadX;
    title.y = innerPadY;
    box.addChild(title);

    var cy = innerPadY + Math.ceil(title.height) + rowGap;
    var s1 = drawLifeStepper(box, innerPadX, cy, side, "level", life.level, color, compact);
    cy += s1.h + rowGap;
    var s2 = drawLifeStepper(box, innerPadX, cy, side, "damage", life.damage, color, compact);
    cy += s2.h;

    var contentW = Math.max(Math.ceil(title.width), s1.w, s2.w);
    var bw = contentW + innerPadX * 2;
    var bh = cy + innerPadY;

    var g = new PIXI.Graphics();
    if (active) {
      gFillRound(g, 0, 0, bw, bh, 10, color, 1);
      gStrokeRound(g, 0, 0, bw, bh, 10, COLORS.onAccent, 1.5);
    } else {
      gFillRound(g, 0, 0, bw, bh, 10, COLORS.panel2, 0.94);
      gStrokeRound(g, 0, 0, bw, bh, 10, color, 1.25);
    }
    box.addChildAt(g, 0);

    return { w: bw, h: bh };
  }

  function drawHeader(w) {
    var pad = 12;
    var land = isLandscape();
    ensureLife();
    var life1 = state.life.first;
    var life2 = state.life.second;
    var phaseHint = state.phase === "encore"
      ? "安可"
      : (state.phase === "deploy" ? "布陣" : (state.phase === "attack" ? "戰階" : ""));
    // During encore both sides act; otherwise highlight whose turn it is.
    var activeFirst = state.phase !== "encore" && state.activeSide === "first";
    var activeSecond = state.phase !== "encore" && state.activeSide === "second";

    var turnLine = makeText(
      "回合 " + state.turn + (phaseHint ? "・" + phaseHint : ""),
      { size: land ? 13 : 12, fill: COLORS.muted, display: true }
    );
    turnLine.x = pad;
    turnLine.y = pad;
    root.addChild(turnLine);

    var chipY = pad + 36;
    var compact = land && w < 900;
    var c1 = drawLifeChip(pad, chipY, "先攻", "first", life1, COLORS.teal, activeFirst, compact);
    var c2;
    if (land) {
      c2 = drawLifeChip(pad + c1.w + 10, chipY, "後攻", "second", life2, COLORS.amber, activeSecond, compact);
    } else {
      c2 = drawLifeChip(pad, chipY + c1.h + 6, "後攻", "second", life2, COLORS.amber, activeSecond, compact);
    }
    lastHeaderBottom = land
      ? chipY + Math.max(c1.h, c2.h) + 6
      : chipY + c1.h + 6 + c2.h + 6;

    var endBtn = makeBtn("結束對局", 96, 34, COLORS.panel2, {
      size: 13, stroke: COLORS.line, textFill: COLORS.muted, radius: 10
    });
    endBtn.x = w - 96 - pad;
    endBtn.y = pad;
    hit(endBtn, endGame);
    root.addChild(endBtn);

    if (state.lastUndo && (state.phase === "attack" || state.phase === "deploy" || state.phase === "encore")) {
      var undoBtn = makeBtn("撤銷", 72, 34, COLORS.panel2, {
        size: 13, stroke: COLORS.coral, textFill: COLORS.coral, radius: 10
      });
      undoBtn.x = w - 96 - 72 - pad - 8;
      undoBtn.y = pad;
      hit(undoBtn, undoLast);
      root.addChild(undoBtn);
    }

    // Top-center self-damage — drawn last so they stay clickable above other chrome
    var refreshBtn = makeBtn("洗傷", land ? 78 : 70, 34, COLORS.panel2, {
      size: 14, stroke: COLORS.coral, textFill: COLORS.coral, radius: 10
    });
    var otherSelfBtn = makeBtn("其他自傷", land ? 104 : 96, 34, COLORS.panel2, {
      size: 14, stroke: COLORS.amber, textFill: COLORS.amber, radius: 10
    });
    var selfGap = 10;
    var selfGroupW = refreshBtn._w + selfGap + otherSelfBtn._w;
    var rightLimit = (state.lastUndo ? (w - 96 - 72 - pad - 16) : (endBtn.x - 8));
    var selfX = Math.floor((w - selfGroupW) / 2);
    selfX = Math.max(pad, Math.min(selfX, rightLimit - selfGroupW));
    refreshBtn.x = selfX;
    refreshBtn.y = pad;
    otherSelfBtn.x = refreshBtn.x + refreshBtn._w + selfGap;
    otherSelfBtn.y = pad;
    hit(refreshBtn, doRefreshDamage);
    hit(otherSelfBtn, doOtherSelfDamage);
    root.addChild(refreshBtn);
    root.addChild(otherSelfBtn);
  }

  function drawSlotsRow(y, interactiveMode, opts) {
    opts = opts || {};
    var dim = opts.dim || cardAspect();
    var totalW = dim.slotW * 3 + dim.gap * 2;
    var startX = opts.startX != null
      ? opts.startX
      : Math.floor((app.screen.width - totalW) / 2);
    var side = opts.side || state.activeSide;
    var stage = opts.stage || state.stages[side];
    var draftSlot = uiState.draft && uiState.draft.slot && side === state.activeSide
      ? uiState.draft.slot
      : null;
    var artRects = opts.artRects || [];
    var syncArt = opts.syncArt !== false;

    for (var i = 0; i < SLOT_KEYS.length; i++) {
      var key = SLOT_KEYS[i];
      var x = startX + i * (dim.slotW + dim.gap);
      var slot = stage[key];
      var box = new PIXI.Container();
      box.x = x;
      box.y = y;
      box.eventMode = "static";
      box.cursor = "pointer";

      var g = new PIXI.Graphics();
      var selected = draftSlot === key || (uiState.pickerSlot === key && side === state.activeSide);
      gFillRound(g, 0, 0, dim.slotW, dim.slotH, 12, COLORS.panel, 1);
      gStrokeRound(g, 0, 0, dim.slotW, dim.slotH, 12,
        selected ? COLORS.amber : (slot.resolvedOnce ? COLORS.good : COLORS.line),
        selected ? 2.5 : 1.5);
      box.addChild(g);

      var tag = makeText(SLOT_LABELS[key] + (slot.resolvedOnce ? " 休" : ""), {
        size: 11, fill: slot.resolvedOnce ? COLORS.amber : COLORS.muted, display: true
      });
      tag.x = 8;
      tag.y = 6;
      box.addChild(tag);

      if (slot.card) {
        drawCardFace(box, slot.card, dim.slotW, dim.slotH, { rested: !!slot.resolvedOnce });
        if (slot.card.imageUrl) {
          artRects.push({
            key: side + "-" + key,
            x: x,
            y: y,
            w: dim.slotW,
            h: dim.slotH,
            url: slot.card.imageUrl,
            rested: !!slot.resolvedOnce
          });
        }
      } else {
        var emptyLabel = interactiveMode === "encore"
          ? "空"
          : (interactiveMode === "attack" ? "空槽" : "點擊放卡");
        var empty = makeText(emptyLabel, { size: 13, fill: COLORS.muted });
        empty.anchor.set(0.5);
        empty.x = dim.slotW / 2;
        empty.y = dim.slotH / 2;
        box.addChild(empty);
      }

      (function (slotKey, slotSide) {
        hit(box, function () {
          if (interactiveMode === "encore") {
            removeEncoreCard(slotSide, slotKey);
          } else if (interactiveMode === "deploy" || uiState.redeployMode) {
            openPicker(slotKey);
          } else if (interactiveMode === "attack") {
            if (uiState.attackStep) return;
            startAttackOnSlot(slotKey);
          }
        });
      })(key, side);

      root.addChild(box);
    }
    if (syncArt) syncCardArtLayer(artRects);
    return y + dim.slotH;
  }

  function drawCardFace(parent, card, w, h, opts) {
    opts = opts || {};
    // Art is shown via #agl-card-layer (DOM) to avoid WebGL CORS texImage2D errors.
    var stripe = new PIXI.Graphics();
    gFillRect(stripe, 0, 22, w, 4, colorTint(card.color), 1);
    parent.addChild(stripe);

    // Keep name lightly for when art is clipped by side panel
    var name = makeText(card.name || card.cardNo || "", {
      size: 11, fill: COLORS.muted, wrap: true, wrapWidth: w - 12
    });
    name.x = 6;
    name.y = 32;
    name.alpha = opts.rested ? 0.2 : 0.35;
    parent.addChild(name);

    var meta = makeText(
      (opts.rested ? "橫置 · " : "") +
      "Lv" + (card.level != null ? card.level : "?") + " · " + (card.color || "—"),
      { size: 11, fill: opts.rested ? COLORS.amber : COLORS.muted, display: true }
    );
    meta.x = 6;
    meta.y = h - 22;
    parent.addChild(meta);
  }

  function drawDeploy(w, h) {
    var land = isLandscape();
    var dim = cardAspect("hero");
    var totalW = dim.slotW * 3 + dim.gap * 2;
    var tPanel = sidePanelProgress();
    var panelOpen = tPanel > 0.5;

    var title = makeText(
      sideLabel(state.activeSide) + "・前排布陣",
      { size: land ? 18 : 20, weight: "700", fill: COLORS.ink, display: true }
    );
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    title.y = lastHeaderBottom + (land ? 2 : 4);
    root.addChild(title);

    var hintText;
    if (isFirstTurnOneLimit()) {
      hintText = "第 1 回合・先攻僅可放 1 隻（可不放）";
    } else if (panelOpen) {
      hintText = uiState.pickerSlot
        ? ("選卡中・" + SLOT_LABELS[uiState.pickerSlot] + "槽")
        : "選卡面板已展開";
    } else {
      hintText = "點槽位選卡・右側「選卡」可展開篩選";
    }
    var sub = makeText(hintText, { size: 12, fill: COLORS.muted });
    sub.anchor.set(0.5, 0);
    sub.x = w / 2;
    sub.y = title.y + 24;
    root.addChild(sub);

    var startBtn = makeBtn("戰階開始", Math.min(w - 28, land ? 240 : 280), 44, COLORS.amber, {
      textFill: COLORS.onAccent, size: 16, radius: 12
    });
    var ctaTop = placeBottomCta(startBtn, w, h);
    hit(startBtn, function () {
      uiState.pickerSlot = null;
      uiState.redeployMode = false;
      setSidePanel(false);
      clearToast();
      state.phase = "attack";
      persist();
      render();
      toast("戰階開始・任選槽攻擊");
    });

    var bandTop = sub.y + 28;
    var fitted = fitSlotsInBand(bandTop, ctaTop - 10, dim);
    dim = fitted.dim;
    totalW = dim.slotW * 3 + dim.gap * 2;
    var slotsStartX = Math.floor((w - totalW) / 2);
    // Keep clear of right「選卡」tab
    slotsStartX = Math.min(slotsStartX, w - 48 - totalW);
    slotsStartX = Math.max(8, slotsStartX);
    drawSlotsRow(fitted.y, "deploy", { startX: slotsStartX, dim: dim, side: state.activeSide });
    root.addChild(startBtn);

    if (tPanel > 0.01) drawDeploySidePanel(w, h, tPanel);
    else clearPickerThumbs();
    drawSidePanelTab(w, h, tPanel);
  }

  function drawSidePanelTab(w, h, tPanel) {
    tPanel = tPanel == null ? sidePanelProgress() : tPanel;
    var tabW = 36;
    var tabH = 112;
    var land = isLandscape();
    var panelW = land ? Math.floor(Math.min(w * 0.4, 360)) : Math.floor(w * 0.92);
    var openX = w - panelW - tabW + 2;
    var closedX = w - tabW;
    var tab = new PIXI.Container();
    tab.eventMode = "static";
    tab.cursor = "pointer";
    tab.x = closedX + (openX - closedX) * tPanel;
    tab.y = Math.floor((h - tabH) / 2);
    var lit = tPanel > 0.5;

    var g = new PIXI.Graphics();
    gFillRound(g, 0, 0, tabW, tabH, 10, lit ? COLORS.amber : COLORS.panel2, 1);
    gStrokeRound(g, 0, 0, tabW, tabH, 10, lit ? COLORS.onAccent : COLORS.teal, 1.5);
    tab.addChild(g);

    var t1 = makeText(lit ? "◂" : "▸", {
      size: 16, weight: "700", fill: lit ? COLORS.onAccent : COLORS.teal, display: true
    });
    t1.anchor.set(0.5);
    t1.x = tabW / 2;
    t1.y = 28;
    tab.addChild(t1);
    var t2 = makeText(lit ? "收合" : "選卡", {
      size: 12, weight: "700", fill: lit ? COLORS.onAccent : COLORS.ink, display: true
    });
    t2.anchor.set(0.5);
    t2.x = tabW / 2;
    t2.y = 64;
    tab.addChild(t2);

    hit(tab, function () {
      if (isSidePanelOpen()) {
        setSidePanel(false);
      } else {
        if (!uiState.pickerSlot) uiState.pickerSlot = "left";
        setSidePanel(true);
      }
    });
    root.addChild(tab);
  }

  function drawDeploySidePanel(w, h, tPanel) {
    tPanel = tPanel == null ? 1 : tPanel;
    var land = isLandscape();
    var panelW = land ? Math.floor(Math.min(w * 0.4, 360)) : Math.floor(w * 0.92);
    var panelXOpen = land ? w - panelW : Math.floor((w - panelW) / 2);
    var panelXClosed = land ? w + 8 : panelXOpen;
    var panelX = panelXClosed + (panelXOpen - panelXClosed) * tPanel;
    var panelY = land ? 44 : 70;
    var panelH = h - panelY - 10;

    var backdrop = new PIXI.Graphics();
    gFillRect(backdrop, 0, 0, Math.max(0, panelXOpen), h, 0x000000, 0.32 * tPanel);
    backdrop.eventMode = tPanel > 0.55 ? "static" : "none";
    backdrop.cursor = "pointer";
    if (tPanel > 0.55) {
      hit(backdrop, function () { setSidePanel(false); });
    }
    root.addChild(backdrop);

    var panel = new PIXI.Container();
    panel.x = panelX;
    panel.y = panelY;
    panel.alpha = Math.min(1, 0.35 + tPanel * 0.65);
    panel.eventMode = "static";

    var bg = new PIXI.Graphics();
    gFillRound(bg, 0, 0, panelW, panelH, 16, COLORS.panel, 0.98);
    gStrokeRound(bg, 0, 0, panelW, panelH, 16, COLORS.amber, 1.5);
    panel.addChild(bg);

    var head = makeText(
      uiState.pickerSlot ? ("選卡・" + SLOT_LABELS[uiState.pickerSlot]) : "篩選／選卡",
      { size: 15, weight: "700", fill: COLORS.amber, display: true }
    );
    head.x = 14;
    head.y = 12;
    panel.addChild(head);

    var closeBtn = makeBtn("×", 34, 30, COLORS.panel2, {
      size: 16, stroke: COLORS.line, textFill: COLORS.muted, radius: 8
    });
    closeBtn.x = panelW - 46;
    closeBtn.y = 10;
    hit(closeBtn, function () { setSidePanel(false); });
    panel.addChild(closeBtn);

    var contentX = 12;
    var contentY = 48;
    var contentW = panelW - 24;
    var afterFilters = drawFilters(contentX, contentY, panel);

    if (uiState.pickerSlot) {
      drawCardPicker(
        contentX,
        afterFilters + 6,
        contentW,
        panelH - (afterFilters + 6) - 12,
        panel,
        { originX: panel.x, originY: panel.y }
      );
    } else {
      clearPickerThumbs();
      var hint = makeText("點場上槽位後，在此篩選並放入角色。", {
        size: 13, fill: COLORS.muted, wrap: true, wrapWidth: contentW
      });
      hint.x = contentX;
      hint.y = afterFilters + 10;
      panel.addChild(hint);
    }

    root.addChild(panel);
  }

  function drawFilters(x, y, parent) {
    parent = parent || root;
    var levels = [
      { id: "all", label: "全部" },
      { id: "0", label: "0" },
      { id: "1", label: "1" },
      { id: "2", label: "2" },
      { id: "3", label: "3" }
    ];
    var colors = [
      { id: "all", label: "色" },
      { id: "yellow", label: "黃", fill: COLORS.yellow },
      { id: "green", label: "綠", fill: COLORS.green },
      { id: "red", label: "紅", fill: COLORS.red },
      { id: "blue", label: "藍", fill: COLORS.blue }
    ];

    var label = makeText("等級", { size: 12, fill: COLORS.muted, display: true });
    label.x = x;
    label.y = y;
    parent.addChild(label);
    var bx = x + 36;
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      var on = uiState.filterLevel === lv.id;
      var b = makeBtn(lv.label, 40, 30, on ? COLORS.amber : COLORS.panel2, {
        size: 12,
        textFill: on ? COLORS.onAccent : COLORS.ink,
        radius: 8,
        stroke: COLORS.line
      });
      b.x = bx;
      b.y = y - 4;
      (function (id) {
        hit(b, function () { uiState.filterLevel = id; uiState.listScroll = 0; render(); });
      })(lv.id);
      parent.addChild(b);
      bx += 46;
    }

    y += 38;
    var cl = makeText("顏色", { size: 12, fill: COLORS.muted, display: true });
    cl.x = x;
    cl.y = y;
    parent.addChild(cl);
    bx = x + 36;
    for (var j = 0; j < colors.length; j++) {
      var col = colors[j];
      var onC = uiState.filterColor === col.id;
      var cb = makeBtn(col.label, 40, 30, onC ? (col.fill || COLORS.amber) : COLORS.panel2, {
        size: 12,
        textFill: onC && col.id !== "all" ? 0xffffff : (onC ? COLORS.onAccent : COLORS.ink),
        radius: 8,
        stroke: COLORS.line
      });
      cb.x = bx;
      cb.y = y - 4;
      (function (id) {
        hit(cb, function () { uiState.filterColor = id; uiState.listScroll = 0; render(); });
      })(col.id);
      parent.addChild(cb);
      bx += 46;
    }
    return y + 34;
  }

  function openPicker(slotKey) {
    uiState.pickerSlot = slotKey;
    uiState.listScroll = 0;
    setSidePanel(true);
  }

  function toggleSidePanel(force) {
    var next = typeof force === "boolean" ? force : !isSidePanelOpen();
    setSidePanel(next);
  }

  function drawCardPicker(x, y, w, maxH, parent, origin) {
    parent = parent || root;
    origin = origin || { originX: 0, originY: 0 };
    var panelH = Math.min(maxH, 320);
    var panel = new PIXI.Container();
    panel.x = x;
    panel.y = y;
    panel.eventMode = "static";

    var bg = new PIXI.Graphics();
    gFillRound(bg, 0, 0, w, panelH, 14, COLORS.panel2, 1);
    gStrokeRound(bg, 0, 0, w, panelH, 14, COLORS.line, 1);
    panel.addChild(bg);

    var head = makeText("選卡 → " + SLOT_LABELS[uiState.pickerSlot], {
      size: 13, fill: COLORS.amber, display: true
    });
    head.x = 10;
    head.y = 8;
    panel.addChild(head);

    var clearBtn = makeBtn("清空此槽", 84, 28, COLORS.panel, {
      size: 12, stroke: COLORS.coral, textFill: COLORS.coral, radius: 8
    });
    clearBtn.x = w - 94;
    clearBtn.y = 6;
    hit(clearBtn, function () {
      setCardOnSlot(uiState.pickerSlot, null);
      uiState.pickerSlot = null;
      uiState.redeployMode = false;
      clearPickerThumbs();
      setSidePanel(false);
      toast("已清空");
    });
    panel.addChild(clearBtn);

    var list = filteredCharacters();
    var rowH = 58;
    var thumbW = 34;
    var thumbH = 48;
    var textPad = 12 + thumbW + 10;
    var listTop = 40;
    var listH = panelH - listTop - 40;
    var maxScroll = Math.max(0, list.length * rowH - listH);
    uiState.listScroll = Math.max(0, Math.min(maxScroll, uiState.listScroll || 0));

    var mask = new PIXI.Graphics();
    gFillRect(mask, 0, listTop, w, listH, 0xffffff, 1);

    // Transparent hit target for empty list area / wheel / drag start
    var listHit = new PIXI.Graphics();
    gFillRect(listHit, 0, listTop, w, listH, 0x000000, 0.001);
    listHit.eventMode = "static";
    listHit.cursor = "grab";
    panel.addChild(listHit);

    var listC = new PIXI.Container();
    listC.y = listTop - uiState.listScroll;
    panel.addChild(listC);
    panel.addChild(mask);
    listC.mask = mask;

    if (!list.length) {
      clearPickerThumbs();
      var empty = makeText("沒有符合的角色", { size: 13, fill: COLORS.muted });
      empty.x = 12;
      empty.y = listTop + 16;
      panel.addChild(empty);
    }

    var absListTop = origin.originY + y + listTop;
    var absListBottom = absListTop + listH;
    var slotKey = uiState.pickerSlot;

    function rebuildThumbs() {
      var thumbs = [];
      for (var ti = 0; ti < list.length; ti++) {
        var c = list[ti];
        if (!c || !c.imageUrl) continue;
        var thumbTop = origin.originY + y + listTop - uiState.listScroll + ti * rowH + 4;
        var clipped = thumbTop + thumbH < absListTop || thumbTop > absListBottom;
        thumbs.push({
          url: c.imageUrl,
          x: origin.originX + x + 10,
          y: thumbTop,
          w: thumbW,
          h: thumbH,
          clipped: clipped
        });
      }
      syncPickerThumbs(thumbs);
    }

    function setListScroll(next) {
      uiState.listScroll = Math.max(0, Math.min(maxScroll, next));
      listC.y = listTop - uiState.listScroll;
      rebuildThumbs();
    }

    for (var i = 0; i < list.length; i++) {
      var card = list[i];
      var row = new PIXI.Container();
      row.y = i * rowH;
      row.eventMode = "static";
      row.cursor = "pointer";
      var rg = new PIXI.Graphics();
      gFillRect(rg, 0, 0, w, rowH - 2, i % 2 ? 0x1a1916 : 0x22211c, 1);
      row.addChild(rg);
      var sw = new PIXI.Graphics();
      gFillRect(sw, 0, 0, 4, rowH - 2, colorTint(card.color), 1);
      row.addChild(sw);

      var ph = new PIXI.Graphics();
      gFillRound(ph, 10, 4, thumbW, thumbH, 4, 0x0e0d0b, 1);
      gStrokeRound(ph, 10, 4, thumbW, thumbH, 4, COLORS.line, 1);
      row.addChild(ph);

      var nm = makeText(card.name || card.cardNo, {
        size: 13, fill: COLORS.ink, wrap: true, wrapWidth: Math.max(60, w - textPad - 12)
      });
      nm.x = textPad;
      nm.y = 8;
      row.addChild(nm);
      var meta = makeText(
        (card.cardNo || "") + "  Lv" + (card.level != null ? card.level : "?") + " ×" + (card.qty || 1),
        { size: 11, fill: COLORS.muted }
      );
      meta.x = textPad;
      meta.y = 32;
      row.addChild(meta);
      listC.addChild(row);

      (function (c, rowNode) {
        rowNode.on("pointerdown", function (ev) {
          beginPickerDrag(ev, c);
        });
      })(card, row);
    }

    rebuildThumbs();

    var dragState = null;
    function beginPickerDrag(ev, cardOrNull) {
      if (!ev || !ev.global) return;
      dragState = {
        y: ev.global.y,
        scroll: uiState.listScroll,
        moved: false,
        card: cardOrNull || null,
        pointerId: ev.pointerId
      };
      listHit.cursor = "grabbing";
      if (app && app.stage) {
        app.stage.eventMode = "static";
        app.stage.on("pointermove", onPickerDragMove);
        app.stage.on("pointerup", onPickerDragEnd);
        app.stage.on("pointerupoutside", onPickerDragEnd);
        app.stage.on("pointercancel", onPickerDragEnd);
      }
      if (ev.stopPropagation) ev.stopPropagation();
    }

    function onPickerDragMove(ev) {
      if (!dragState || !ev || !ev.global) return;
      var dy = dragState.y - ev.global.y;
      if (Math.abs(dy) > 8) dragState.moved = true;
      setListScroll(dragState.scroll + dy);
    }

    function onPickerDragEnd(ev) {
      if (!dragState) return;
      var d = dragState;
      dragState = null;
      listHit.cursor = "grab";
      if (app && app.stage) {
        app.stage.off("pointermove", onPickerDragMove);
        app.stage.off("pointerup", onPickerDragEnd);
        app.stage.off("pointerupoutside", onPickerDragEnd);
        app.stage.off("pointercancel", onPickerDragEnd);
      }
      // Tap (not swipe) selects the card — then auto-collapse picker
      if (!d.moved && d.card) {
        if (!setCardOnSlot(slotKey, d.card)) return;
        uiState.pickerSlot = null;
        uiState.redeployMode = false;
        clearPickerThumbs();
        setSidePanel(false);
        toast("已放入" + SLOT_LABELS[slotKey]);
      }
    }

    listHit.on("pointerdown", function (ev) {
      beginPickerDrag(ev, null);
    });

    // Mouse wheel / trackpad
    panel.on("wheel", function (ev) {
      var dy = (ev && ev.deltaY) || 0;
      if (!dy) return;
      setListScroll(uiState.listScroll + dy);
      if (ev.stopPropagation) ev.stopPropagation();
      if (ev.preventDefault) ev.preventDefault();
    });

    // Scroll hint + optional buttons
    var hint = makeText(maxScroll > 0 ? "上下滑動挑卡" : "點選角色放入", {
      size: 11, fill: COLORS.muted
    });
    hint.x = 10;
    hint.y = panelH - 28;
    panel.addChild(hint);

    if (maxScroll > 0) {
      var up = makeBtn("▲", 40, 28, COLORS.panel, { size: 12, stroke: COLORS.line, radius: 8 });
      up.x = w - 92;
      up.y = panelH - 34;
      hit(up, function () {
        setListScroll(uiState.listScroll - rowH * 2);
      });
      panel.addChild(up);
      var down = makeBtn("▼", 40, 28, COLORS.panel, { size: 12, stroke: COLORS.line, radius: 8 });
      down.x = w - 46;
      down.y = panelH - 34;
      hit(down, function () {
        setListScroll(uiState.listScroll + rowH * 2);
      });
      panel.addChild(down);
    }

    parent.addChild(panel);
    return y + panelH;
  }

  function drawEncore(w, h) {
    clearPickerThumbs();
    var land = isLandscape();
    var title = makeText("安可階段", { size: land ? 18 : 20, weight: "700", fill: COLORS.ink, display: true });
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    title.y = lastHeaderBottom + (land ? 2 : 4);
    root.addChild(title);

    var sub = makeText("左先攻／右後攻・點角色可移除", { size: 12, fill: COLORS.muted });
    sub.anchor.set(0.5, 0);
    sub.x = w / 2;
    sub.y = title.y + 24;
    root.addChild(sub);

    var done = makeBtn("結束安可", Math.min(w - 28, land ? 220 : 260), 44, COLORS.amber, {
      textFill: COLORS.onAccent, size: 16, radius: 12
    });
    var ctaTop = placeBottomCta(done, w, h);
    hit(done, endEncorePhase);

    // Side-by-side columns so 後攻 is never under the CTA
    var sidePad = 12;
    var colGap = land ? 16 : 10;
    var colW = Math.floor((w - sidePad * 2 - colGap) / 2);
    var bandTop = sub.y + 30;
    var availH = Math.max(120, ctaTop - 12 - bandTop);
    var gap = land ? 8 : 6;
    var slotW = Math.floor((colW - gap * 2) / 3);
    var slotH = Math.floor(slotW * 1.4);
    var labelH = 22;
    if (slotH > availH - labelH) {
      slotH = Math.max(90, availH - labelH);
      slotW = Math.floor(slotH / 1.4);
    }
    var dim = { slotW: slotW, slotH: slotH, gap: gap };
    var rowW = slotW * 3 + gap * 2;
    var slotsY = bandTop + labelH + Math.max(0, Math.floor((availH - labelH - slotH) / 2));
    var artRects = [];

    function drawEncoreCol(side, colIndex, color) {
      var colX = sidePad + colIndex * (colW + colGap);
      var startX = colX + Math.max(0, Math.floor((colW - rowW) / 2));
      var label = makeText(sideLabel(side), { size: 13, weight: "700", fill: color, display: true });
      label.x = startX;
      label.y = slotsY - labelH;
      root.addChild(label);
      drawSlotsRow(slotsY, "encore", {
        startX: startX,
        dim: dim,
        side: side,
        artRects: artRects,
        syncArt: false
      });
    }

    drawEncoreCol("first", 0, COLORS.teal);
    drawEncoreCol("second", 1, COLORS.amber);
    syncCardArtLayer(artRects);
    root.addChild(done);
  }

  function drawAttack(w, h) {
    var land = isLandscape();
    var headerH = lastHeaderBottom + (land ? 2 : 4);
    var dim = cardAspect();
    var leftPad = 12;
    var title = makeText(
      sideLabel(state.activeSide) + "・" + (uiState.attackStep ? "攻擊宣告中" : "選擇攻擊角色"),
      { size: land ? 18 : 20, weight: "700", fill: COLORS.ink, display: true }
    );
    title.x = leftPad;
    title.y = headerH;
    root.addChild(title);

    var redeploy = makeBtn(
      uiState.redeployMode ? "完成換人" : "中途換人／放卡",
      land ? 128 : 140,
      34,
      uiState.redeployMode ? COLORS.amber : COLORS.panel2,
      {
        size: 12,
        stroke: COLORS.line,
        textFill: uiState.redeployMode ? COLORS.onAccent : COLORS.muted,
        radius: 10
      }
    );
    var endPhase = makeBtn("結束本戰階", 120, 34, COLORS.teal, {
      size: 12, textFill: COLORS.bg, radius: 10
    });
    var controlsY = land ? (h - 48) : (h - 48);
    redeploy.x = leftPad;
    redeploy.y = controlsY;
    endPhase.x = leftPad + redeploy._w + 8;
    endPhase.y = controlsY;
    hit(redeploy, function () {
      if (uiState.attackStep) {
        toast("請先完成或取消目前宣告");
        return;
      }
      uiState.redeployMode = !uiState.redeployMode;
      uiState.pickerSlot = null;
      toast(uiState.redeployMode ? "點槽位換人／放卡" : "已結束換人");
      render();
    });
    hit(endPhase, function () {
      if (uiState.attackStep) {
        toast("請先完成目前宣告");
        return;
      }
      endAttackPhase();
    });

    var fitted = fitSlotsInBand(headerH + 28, controlsY - 10, dim);
    dim = fitted.dim;
    var slotsStartX = land
      ? leftPad
      : Math.floor((w - (dim.slotW * 3 + dim.gap * 2)) / 2);
    drawSlotsRow(fitted.y, "attack", { startX: slotsStartX, dim: dim });
    root.addChild(redeploy);
    root.addChild(endPhase);

    var rightX = land ? Math.floor(w * 0.46) : 14;
    var rightW = land ? w - rightX - 12 : w - 28;
    var rightY = land ? headerH : Math.min(fitted.y + dim.slotH + 8, controlsY - 40);

    if (uiState.pickerSlot && !uiState.attackStep) {
      drawCardPicker(rightX, rightY, rightW, h - rightY - 16);
      return;
    }

    if (!uiState.attackStep) {
      var tip = makeText("點任意有卡的槽開始攻擊；空槽可跳過。可中途換人後再攻。", {
        size: 13, fill: COLORS.muted, wrap: true, wrapWidth: rightW
      });
      tip.x = rightX;
      tip.y = rightY;
      root.addChild(tip);
      return;
    }

    drawAttackWizard(rightX, rightY, rightW, h - rightY - 12);
  }

  function drawAttackWizard(x, y, w, maxH) {
    var d = uiState.draft;
    var panel = new PIXI.Container();
    panel.x = x;
    panel.y = y;
    var panelH = Math.max(160, Math.min(maxH, isLandscape() ? maxH : 360));
    var bg = new PIXI.Graphics();
    gFillRound(bg, 0, 0, w, panelH, 14, COLORS.panel, 1);
    gStrokeRound(bg, 0, 0, w, panelH, 14, COLORS.amber, 1);
    panel.addChild(bg);

    var slotCard = activeStage()[d.slot].card;
    var head = makeText(
      SLOT_LABELS[d.slot] + "・" + (slotCard.name || slotCard.cardNo),
      { size: 14, fill: COLORS.ink, display: true, wrap: true, wrapWidth: w - 20 }
    );
    head.x = 12;
    head.y = 10;
    panel.addChild(head);

    var cancelFlow = makeBtn("中止", 64, 30, COLORS.panel2, {
      size: 12, stroke: COLORS.line, textFill: COLORS.muted, radius: 8
    });
    cancelFlow.x = w - 76;
    cancelFlow.y = 8;
    hit(cancelFlow, function () {
      uiState.draft = null;
      uiState.attackStep = null;
      render();
    });
    panel.addChild(cancelFlow);

    var cy = 48;
    if (uiState.attackStep === "type") {
      cy = drawTypeStep(panel, cy, w);
    } else if (uiState.attackStep === "target") {
      cy = drawTargetStep(panel, cy, w);
    } else if (uiState.attackStep === "damage") {
      cy = drawDamageStep(panel, cy, w);
    } else if (uiState.attackStep === "result") {
      cy = drawResultStep(panel, cy, w);
    } else if (uiState.attackStep === "otherKind") {
      cy = drawOtherKindStep(panel, cy, w);
    }

    root.addChild(panel);
  }

  function drawTypeStep(panel, y, w) {
    var t = makeText("戰鬥類型", { size: 13, fill: COLORS.muted, display: true });
    t.x = 12;
    t.y = y;
    panel.addChild(t);
    y += 26;
    var types = [
      { id: "direct", label: "直接攻擊" },
      { id: "front", label: "正面攻擊" },
      { id: "side", label: "側面攻擊" },
      { id: "effect", label: "效果傷害" }
    ];
    for (var i = 0; i < types.length; i++) {
      var tp = types[i];
      var b = makeBtn(tp.label, w - 24, 42, COLORS.panel2, {
        size: 15, stroke: tp.id === "effect" ? COLORS.amber : COLORS.line,
        textFill: tp.id === "effect" ? COLORS.amber : COLORS.ink,
        radius: 10
      });
      b.x = 12;
      b.y = y;
      (function (id) {
        hit(b, function () {
          uiState.draft.attackType = id;
          if (id === "front") uiState.attackStep = "target";
          else {
            // effect / direct / side → pick damage
            if (id === "effect") {
              uiState.draft.target = { fromSlot: null, freeText: "效果傷害" };
            }
            uiState.attackStep = "damage";
          }
          render();
        });
      })(tp.id);
      panel.addChild(b);
      y += 50;
    }
    return y;
  }

  function drawTargetStep(panel, y, w) {
    var t = makeText("打誰（選填）— 點對手前排或文字", {
      size: 13, fill: COLORS.muted, display: true, wrap: true, wrapWidth: w - 24
    });
    t.x = 12;
    t.y = y;
    panel.addChild(t);
    y += 36;

    var opp = opponentStage();
    var dimW = Math.floor((w - 36) / 3);
    for (var i = 0; i < SLOT_KEYS.length; i++) {
      var key = SLOT_KEYS[i];
      var card = opp[key].card;
      var b = makeBtn(
        card ? (SLOT_LABELS[key] + "\n" + (card.name || "").slice(0, 8)) : (SLOT_LABELS[key] + "・空"),
        dimW,
        56,
        COLORS.panel2,
        { size: 12, stroke: COLORS.line, radius: 10, textFill: card ? COLORS.ink : COLORS.muted }
      );
      // multiline label hack — replace with two texts
      b.removeChild(b._label);
      var l1 = makeText(SLOT_LABELS[key], { size: 12, fill: COLORS.amber, display: true });
      l1.anchor.set(0.5, 0);
      l1.x = dimW / 2;
      l1.y = 8;
      b.addChild(l1);
      var l2 = makeText(card ? String(card.name).slice(0, 10) : "（空）", {
        size: 11, fill: COLORS.ink, wrap: true, wrapWidth: dimW - 8
      });
      l2.anchor.set(0.5, 0);
      l2.x = dimW / 2;
      l2.y = 28;
      b.addChild(l2);
      b.x = 12 + i * (dimW + 6);
      b.y = y;
      (function (slotKey, c) {
        hit(b, function () {
          uiState.draft.target = {
            fromSlot: slotKey,
            freeText: c ? (c.name || c.cardNo || "") : ""
          };
          uiState.attackStep = "damage";
          render();
        });
      })(key, card);
      panel.addChild(b);
    }
    y += 68;

    var textBtn = makeBtn("改用文字輸入", w - 24, 40, COLORS.panel2, {
      size: 14, stroke: COLORS.teal, textFill: COLORS.teal, radius: 10
    });
    textBtn.x = 12;
    textBtn.y = y;
    hit(textBtn, async function () {
      var text = await askText("打誰（文字）");
      if (text == null) return;
      uiState.draft.target = { fromSlot: null, freeText: text || "" };
      uiState.attackStep = "damage";
      render();
    });
    panel.addChild(textBtn);
    y += 48;

    var skip = makeBtn("略過（不指定）", w - 24, 40, COLORS.amber, {
      size: 14, textFill: COLORS.onAccent, radius: 10
    });
    skip.x = 12;
    skip.y = y;
    hit(skip, function () {
      uiState.draft.target = { fromSlot: null, freeText: "" };
      uiState.attackStep = "damage";
      render();
    });
    panel.addChild(skip);
    return y + 48;
  }

  function drawDamageStep(panel, y, w) {
    var t = makeText("選擇打點", { size: 13, fill: COLORS.muted, display: true });
    t.x = 12;
    t.y = y;
    panel.addChild(t);
    y += 28;
    var bw = Math.floor((w - 24 - 12) / 3);
    for (var i = 0; i <= 5; i++) {
      var b = makeBtn(String(i), bw, 44, COLORS.panel2, {
        size: 18, display: true, stroke: COLORS.line, radius: 10
      });
      b.x = 12 + (i % 3) * (bw + 6);
      b.y = y + Math.floor(i / 3) * 52;
      (function (n) {
        hit(b, function () {
          uiState.draft.declaredDamage = n;
          uiState.attackStep = "result";
          render();
        });
      })(i);
      panel.addChild(b);
    }
    y += 112;
    var plus = makeBtn("6+ 自行輸入", w - 24, 44, COLORS.amber, {
      size: 15, textFill: COLORS.onAccent, radius: 10
    });
    plus.x = 12;
    plus.y = y;
    hit(plus, async function () {
      var n = await askNumber("6+ 打點", "輸入正整數（≥ 0）。", true);
      if (n == null) return;
      uiState.draft.declaredDamage = n;
      uiState.attackStep = "result";
      render();
    });
    panel.addChild(plus);
    return y + 52;
  }

  function drawResultStep(panel, y, w) {
    var declared = Number(uiState.draft.declaredDamage) || 0;
    var t = makeText(
      "宣告 " + declared + " 點 → 結果",
      { size: 14, fill: COLORS.ink, display: true }
    );
    t.x = 12;
    t.y = y;
    panel.addChild(t);
    y += 32;

    var eat = makeBtn("吃傷", w - 24, 48, COLORS.coral, {
      size: 17, textFill: 0xffffff, radius: 12
    });
    eat.x = 12;
    eat.y = y;
    hit(eat, function () {
      uiState.draft.result = "damage";
      uiState.draft.actualDamage = uiState.draft.declaredDamage;
      uiState.draft.otherKind = null;
      commitAttack();
    });
    panel.addChild(eat);
    y += 56;

    if (declared > 0) {
      var cancel = makeBtn("取消", w - 24, 48, COLORS.panel2, {
        size: 17, stroke: COLORS.muted, textFill: COLORS.ink, radius: 12
      });
      cancel.x = 12;
      cancel.y = y;
      hit(cancel, function () {
        uiState.draft.result = "cancel";
        uiState.draft.actualDamage = 0;
        uiState.draft.otherKind = null;
        commitAttack();
      });
      panel.addChild(cancel);
      y += 56;
    } else {
      var tip = makeText("宣告 0 點不能算取消", {
        size: 13, fill: COLORS.muted, display: true
      });
      tip.x = 12;
      tip.y = y + 12;
      panel.addChild(tip);
      y += 44;
    }

    var other = makeBtn("其他（觸發取消／擋傷／減傷）", w - 24, 48, COLORS.teal, {
      size: 14, textFill: COLORS.bg, radius: 12
    });
    other.x = 12;
    other.y = y;
    hit(other, function () {
      if (declared <= 0) {
        toast("宣告 0 點不能算取消（請選吃傷或改打點）");
        return;
      }
      uiState.draft.result = "other";
      uiState.attackStep = "otherKind";
      render();
    });
    panel.addChild(other);
    return y + 56;
  }

  function drawOtherKindStep(panel, y, w) {
    var t = makeText("其他結果", { size: 13, fill: COLORS.muted, display: true });
    t.x = 12;
    t.y = y;
    panel.addChild(t);
    y += 28;
    var kinds = [
      { id: "triggerCancel", label: "觸發取消（0 傷）", dmg: 0 },
      { id: "block", label: "擋傷（0 傷）", dmg: 0 },
      { id: "reduce", label: "減傷（輸入實際點數）", dmg: null }
    ];
    for (var i = 0; i < kinds.length; i++) {
      var k = kinds[i];
      var b = makeBtn(k.label, w - 24, 44, COLORS.panel2, {
        size: 14, stroke: COLORS.line, radius: 10
      });
      b.x = 12;
      b.y = y;
      (function (kind) {
        hit(b, async function () {
          uiState.draft.otherKind = kind.id;
          if (kind.dmg === 0) {
            uiState.draft.actualDamage = 0;
            commitAttack();
          } else {
            var n = await askNumber("減傷後實際點數", "輸入實際吃到的非負整數。", true);
            if (n == null) return;
            uiState.draft.actualDamage = n;
            commitAttack();
          }
        });
      })(k);
      panel.addChild(b);
      y += 52;
    }
    return y;
  }

  function drawSummary(w, h) {
    // HTML dashboard owns the summary UI; keep a quiet Pixi backdrop.
    var title = makeText("MATCH REPORT", { size: 22, weight: "700", fill: COLORS.muted, display: true });
    title.anchor.set(0.5);
    title.x = w / 2;
    title.y = h / 2;
    root.addChild(title);
    showSummaryUI();
  }

  function drawToast(w, h, msg) {
    var t = makeText(msg, { size: 13, fill: COLORS.ink, display: true });
    var padX = 14;
    var tw = Math.min(w - 48, Math.ceil(t.width) + padX * 2);
    var box = new PIXI.Graphics();
    gFillRound(box, 0, 0, tw, 36, 10, COLORS.panel2, 0.96);
    gStrokeRound(box, 0, 0, tw, 36, 10, COLORS.teal, 1);
    box.x = (w - tw) / 2;
    box.y = h - 88;
    root.addChild(box);
    t.anchor.set(0.5);
    t.x = box.x + tw / 2;
    t.y = box.y + 18;
    root.addChild(t);
  }

  /* ——— Boot ——— */
  async function boot() {
    bindOverlays();
    applyVisualViewport();
    syncOrientGate();
    window.addEventListener("orientationchange", function () {
      setTimeout(function () {
        syncOrientGate();
        if (app) render();
      }, 180);
    });
    window.addEventListener("resize", function () {
      applyVisualViewport();
      syncOrientGate();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", function () {
        applyVisualViewport();
        if (app) render();
      });
      window.visualViewport.addEventListener("scroll", function () {
        applyVisualViewport();
      });
    }
    ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach(function (ev) {
      document.addEventListener(ev, function () {
        applyVisualViewport();
        if (app) setTimeout(function () { render(); }, 60);
      });
    });

    var bootEl = $("agl-boot");
    var host = $("pixi-host");
    try {
      app = new PIXI.Application({
        resizeTo: host || window,
        backgroundColor: COLORS.bg,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        forceCanvas: false
      });
    } catch (err1) {
      try {
        app = new PIXI.Application({
          resizeTo: host || window,
          backgroundColor: COLORS.bg,
          antialias: false,
          resolution: 1,
          autoDensity: true,
          forceCanvas: true
        });
      } catch (err2) {
        if (bootEl) {
          bootEl.hidden = false;
          bootEl.innerHTML = "<strong>無法啟動畫面</strong><span>" +
            String((err2 && err2.message) || err2 || err1) +
            "</span>";
        }
        console.error(err1, err2);
        return;
      }
    }
    host.appendChild(app.view);
    root = new PIXI.Container();
    app.stage.addChild(root);

    var restored = restore();
    if (restored && state.first && state.second && state.phase !== "setup") {
      closeOverlay("overlay-setup");
      toast("已還原本機紀錄");
    } else {
      state = createEmptyState();
      openOverlay("overlay-setup");
    }

    if (bootEl) bootEl.hidden = true;

    window.addEventListener("resize", function () {
      applyVisualViewport();
      syncOrientGate();
      render();
    });

    app.ticker.add(function () {
      var needRender = false;
      var target = uiState.panelAnimTarget || 0;
      var cur = uiState.panelAnim || 0;
      if (Math.abs(cur - target) > 0.004) {
        var next = cur + (target - cur) * 0.22;
        if (Math.abs(next - target) < 0.004) next = target;
        uiState.panelAnim = next;
        needRender = true;
      }
      if (uiState.toast && performance.now() >= uiState.toastUntil) {
        uiState.toast = "";
        needRender = true;
      }
      if (needRender) render();
    });

    syncOrientGate();
    render();
  }

  // Test / debug hooks (used by automated checks; no UI dependency)
  window.__AGL = {
    getState: function () { return state; },
    getUi: function () { return uiState; },
    isLandscape: isLandscape,
    syncOrientGate: syncOrientGate,
    applyVisualViewport: applyVisualViewport,
    softCollapseBrowserChrome: softCollapseBrowserChrome,
    isAppFullscreen: isAppFullscreen,
    render: render,
    setCardOnSlot: setCardOnSlot,
    openPicker: openPicker,
    startAttackOnSlot: startAttackOnSlot,
    beginRecording: beginRecording,
    endAttackPhase: endAttackPhase,
    endEncorePhase: endEncorePhase,
    applyClockDamage: applyClockDamage,
    adjustLife: adjustLife,
    applySelfDamage: applySelfDamage,
    checkLevelOut: checkLevelOut,
    cardAttackDamageStats: cardAttackDamageStats,
    standStage: standStage,
    endGame: endGame,
    undoLast: undoLast,
    resetGame: resetGame,
    exportMatchImage: exportMatchImage,
    buildMatchReport: buildMatchReport,
    buildBattleDetail: buildBattleDetail,
    showSummaryUI: showSummaryUI,
    commitDraft: function (partial) {
      if (!uiState.draft) return false;
      Object.assign(uiState.draft, partial || {});
      if (uiState.draft.actualDamage == null && uiState.draft.result === "damage") {
        uiState.draft.actualDamage = uiState.draft.declaredDamage;
      }
      if (uiState.draft.actualDamage == null && (uiState.draft.result === "cancel" || uiState.draft.otherKind === "triggerCancel" || uiState.draft.otherKind === "block")) {
        uiState.draft.actualDamage = 0;
      }
      if (uiState.draft.result === "cancel" && !(Number(uiState.draft.declaredDamage) > 0)) {
        return false;
      }
      commitAttack();
      return true;
    },
    doOtherSelfDamage: doOtherSelfDamage,
    closeSelfDamageSheet: closeSelfDamageSheet,
    forcePhase: function (phase) {
      state.phase = phase;
      persist();
      render();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
