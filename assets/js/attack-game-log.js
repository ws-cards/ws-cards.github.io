/**
 * Attack Game Log — PixiJS full-screen WS attack phase recorder.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "ws-attack-game-log-v1";
  var SLOT_KEYS = ["left", "center", "right"];
  var SLOT_LABELS = { left: "左", center: "中", right: "右" };
  var COLORS = {
    bg: 0x141820,
    panel: 0x1c222d,
    panel2: 0x252c3a,
    line: 0x3a4558,
    ink: 0xe8ecf2,
    muted: 0x8b95a8,
    amber: 0xf0a202,
    teal: 0x2ec4b6,
    coral: 0xe85d4c,
    good: 0x5dce8a,
    yellow: 0xeab308,
    green: 0x22c55e,
    red: 0xef4444,
    blue: 0x3b82f6
  };

  var app = null;
  var root = null;
  var ui = { layers: {}, nodes: {} };
  var numberResolver = null;
  var textResolver = null;
  var summaryChart = null;
  var summaryTab = "stats";

  var state = createEmptyState();
  var uiState = {
    filterLevel: "all",
    filterColor: "all",
    pickerSlot: null,
    attackStep: null,
    draft: null,
    listScroll: 0,
    redeployMode: false,
    sidePanelOpen: false,
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
      logs: [],
      lastUndo: null,
      ended: false,
      startedAt: null,
      endedAt: null
    };
  }

  function emptyStage() {
    return {
      left: { card: null, resolvedOnce: false },
      center: { card: null, resolvedOnce: false },
      right: { card: null, resolvedOnce: false }
    };
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

  function totalsFor(side) {
    var logs = state.logs.filter(function (l) { return l.side === side; });
    var out = {
      declared: logs.length,
      damageHits: 0,
      cancels: 0,
      others: 0,
      actualDamage: 0,
      byType: { direct: 0, front: 0, side: 0 },
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
    var logs = state.logs.filter(function (l) { return l.side === opp; });
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
      var cancelled = 0;
      if (l.result === "cancel") cancelled = declared;
      else if (l.result === "other") cancelled = Math.max(0, declared - actual);
      if (cancelled > 0 || l.result === "cancel" || (l.result === "other" && actual === 0)) {
        cancelDamage += cancelled;
        cancelTimes += 1;
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
        if (l.turn !== turn) continue;
        var declared = Number(l.declaredDamage) || 0;
        var actual = Number(l.actualDamage) || 0;
        var cancelled = 0;
        if (l.result === "cancel") cancelled = declared;
        else if (l.result === "other") cancelled = Math.max(0, declared - actual);
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
    var winner = "平手";
    if (s1.damageReceived < s2.damageReceived) winner = "玩家 1（先攻）";
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
      first: s1,
      second: s2,
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
    if ($("btnSumExport")) $("btnSumExport").onclick = exportMatchJson;
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
        "直 / 正 / 側",
        report.first.byType.direct + "/" + report.first.byType.front + "/" + report.first.byType.side,
        report.second.byType.direct + "/" + report.second.byType.front + "/" + report.second.byType.side
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

    fillDeckList("first", "sumDeckTitle1", "sumDeckCode1", "sumDeckList1", report.p1Name);
    fillDeckList("second", "sumDeckTitle2", "sumDeckCode2", "sumDeckList2", report.p2Name);
    setSummaryTab(summaryTab || "stats");
  }

  function fillDeckList(side, titleId, codeId, listId, name) {
    $(titleId).textContent = name + "（" + sideLabel(side) + "）";
    var p = state[side];
    $(codeId).textContent = p && p.code ? ("DeckLog: " + p.code) : "DeckLog: —";
    var ul = $(listId);
    ul.innerHTML = "";
    var used = totalsFor(side).cards;
    var keys = Object.keys(used);
    if (!keys.length) {
      var empty = document.createElement("li");
      empty.innerHTML = "<span>（本局未宣告攻擊）</span><span></span>";
      ul.appendChild(empty);
      return;
    }
    keys.sort(function (a, b) { return used[b] - used[a]; });
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var display = key;
      for (var li = 0; li < state.logs.length; li++) {
        var ac = state.logs[li].attackerCard;
        if (ac && (ac.cardNo === key || ac.name === key)) {
          display = ac.name || ac.cardNo || key;
          break;
        }
      }
      var item = document.createElement("li");
      item.innerHTML =
        "<span>" + escapeHtml(display) + "</span>" +
        "<strong>×" + used[key] + "</strong>";
      ul.appendChild(item);
    }
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
        borderColor: "#2ec4b6",
        backgroundColor: "rgba(46,196,182,0.14)",
        tension: 0.15,
        pointRadius: 3,
        borderWidth: 2
      });
    }
    if (show2) {
      datasets.push({
        label: "玩家 2",
        data: series.second,
        borderColor: "#f0a202",
        backgroundColor: "rgba(240,162,2,0.14)",
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
            title: { display: true, text: "Turn", color: "#8b95a8" },
            ticks: { stepSize: 1, color: "#8b95a8" },
            grid: { color: "rgba(232,236,242,0.08)" }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: metric === "attacks" ? "Attacks" : "Damage",
              color: "#8b95a8"
            },
            ticks: { color: "#8b95a8" },
            grid: { color: "rgba(232,236,242,0.08)" }
          }
        }
      }
    });
  }

  function exportMatchJson() {
    var payload = {
      exportedAt: Date.now(),
      report: buildMatchReport(),
      state: state
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "attack-game-log-" + Date.now() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
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
    state.logs = [];
    state.lastUndo = null;
    state.ended = false;
    state.startedAt = Date.now();
    state.endedAt = null;
    uiState.attackStep = null;
    uiState.draft = null;
    uiState.pickerSlot = null;
    uiState.redeployMode = false;
    uiState.sidePanelOpen = false;
    closeOverlay("overlay-setup");
    hideSummaryUI();
    persist();
    render();
    toast("記錄開始・先攻布陣");
  }

  /* ——— Pixi helpers ——— */
  function makeText(str, opts) {
    opts = opts || {};
    var style = new PIXI.TextStyle({
      fontFamily: opts.display ? '"Chakra Petch", "Noto Sans TC", sans-serif' : '"Noto Sans TC", sans-serif',
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

    if (deployHero && land) {
      // leave room for title + bottom CTA
      var maxH = Math.max(170, h - 118);
      var maxStageW = Math.floor(w * 0.9);
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
    var maxH = Math.max(120, h - (land ? 78 : 96));
    if (slotH > maxH) {
      slotH = maxH;
      slotW = Math.floor(slotH / 1.4);
    }
    return { slotW: slotW, slotH: slotH, gap: gap, colW: colW };
  }

  function tryLockLandscape() {
    try {
      var ori = screen.orientation || screen.mozOrientation || screen.msOrientation;
      if (ori && typeof ori.lock === "function") {
        return ori.lock("landscape").catch(function () { /* iOS / denied */ });
      }
    } catch (e) { /* ignore */ }
    return Promise.resolve();
  }

  function syncOrientGate() {
    var gate = $("orient-gate");
    if (!gate) return;
    var portrait = !isLandscape();
    gate.style.display = portrait ? "flex" : "none";
    gate.setAttribute("aria-hidden", portrait ? "false" : "true");
    document.body.classList.toggle("is-portrait", portrait);
    document.body.classList.toggle("is-landscape", !portrait);
  }

  function clearCardArtLayer() {
    var layer = $("agl-card-layer");
    if (layer) layer.innerHTML = "";
  }

  function syncCardArtLayer(rects) {
    var layer = $("agl-card-layer");
    if (!layer) return;
    layer.innerHTML = "";
    if (!rects || !rects.length) return;
    if (state.phase !== "deploy" && state.phase !== "attack") return;
    if (state.phase === "summary" || state.ended) return;

    var panelLeft = Infinity;
    if (state.phase === "deploy" && isSidePanelOpen()) {
      var w = app.screen.width;
      var panelW = isLandscape() ? Math.floor(Math.min(w * 0.4, 360)) : w;
      panelLeft = isLandscape() ? (w - panelW) : 0;
    }

    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (!r || !r.url) continue;
      // Hide art under the open side panel
      if (r.x + r.w * 0.45 > panelLeft) continue;
      var img = document.createElement("img");
      img.className = "agl-slot-art";
      img.alt = "";
      img.draggable = false;
      img.src = r.url;
      img.style.left = Math.round(r.x + 6) + "px";
      img.style.top = Math.round(r.y + 22) + "px";
      img.style.width = Math.max(8, Math.round(r.w - 12)) + "px";
      img.style.height = Math.max(8, Math.round(r.h - 44)) + "px";
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
    stage[slotKey].card = card ? Object.assign({}, card) : null;
    if (!card) stage[slotKey].resolvedOnce = false;
    persist();
    render();
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
      countsAsCancel: d.result === "cancel",
      timestamp: Date.now()
    };
    state.logs.push(log);
    state.lastUndo = { logId: log.id };
    activeStage()[d.slot].resolvedOnce = true;
    uiState.draft = null;
    uiState.attackStep = null;
    persist();
    render();
    toast(d.result === "cancel" ? "已取消（仍計使用）" : "已記錄");
  }

  function undoLast() {
    if (!state.lastUndo || !state.logs.length) {
      toast("沒有可撤銷的攻擊");
      return;
    }
    var last = state.logs[state.logs.length - 1];
    if (!last || last.id !== state.lastUndo.logId) {
      toast("只能撤銷上一筆攻擊");
      return;
    }
    state.logs.pop();
    state.lastUndo = null;
    persist();
    render();
    toast("已撤銷上一筆");
  }

  function endAttackPhase() {
    uiState.draft = null;
    uiState.attackStep = null;
    uiState.pickerSlot = null;
    if (state.activeSide === "first") {
      state.activeSide = "second";
      state.phase = "deploy";
      toast("換後攻布陣");
    } else {
      state.turn += 1;
      state.activeSide = "first";
      state.phase = "deploy";
      state.stages.first = emptyStage();
      state.stages.second = emptyStage();
      toast("第 " + state.turn + " 回合・先攻布陣");
    }
    persist();
    render();
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
    gFillRect(bg, 0, 0, w, h * 0.35, 0x1a2433, 0.9);
    gFillEllipse(bg, w * 0.15, 0, w * 0.45, h * 0.28, 0x2ec4b6, 0.08);
    gFillEllipse(bg, w * 0.9, h * 0.85, w * 0.4, h * 0.3, 0xf0a202, 0.07);
    root.addChild(bg);

    if (state.phase === "setup") {
      hideSummaryUI();
      clearCardArtLayer();
      drawIdleBrand(w, h);
      return;
    }
    if (state.phase === "summary" || state.ended) {
      clearCardArtLayer();
      drawSummary(w, h);
      return;
    }

    hideSummaryUI();
    drawHeader(w);
    if (state.phase === "deploy") drawDeploy(w, h);
    else if (state.phase === "attack") drawAttack(w, h);

    if (uiState.toast && performance.now() < uiState.toastUntil) {
      drawToast(w, h, uiState.toast);
    } else {
      uiState.toast = "";
    }
  }

  function drawIdleBrand(w, h) {
    var title = makeText("ATTACK LOG", { size: 34, weight: "700", fill: COLORS.ink, display: true });
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

  function drawHeader(w) {
    var pad = 12;
    var side = sideLabel(state.activeSide);
    var sideColor = state.activeSide === "first" ? COLORS.teal : COLORS.amber;
    var dmgSide = totalsFor(state.activeSide);
    var land = isLandscape();

    var badge = makeText(side, { size: land ? 16 : 18, weight: "700", fill: sideColor, display: true });
    badge.x = pad;
    badge.y = pad + (land ? 6 : 4);
    root.addChild(badge);

    if (land) {
      var line = makeText(
        "回合 " + state.turn + "   累計傷 " + dmgSide.actualDamage + "  ·  取消 " + dmgSide.cancels,
        { size: 13, fill: COLORS.ink, display: true }
      );
      line.x = pad + 52;
      line.y = pad + 10;
      root.addChild(line);
    } else {
      var turn = makeText("回合 " + state.turn, { size: 14, fill: COLORS.muted, display: true });
      turn.x = pad;
      turn.y = pad + 28;
      root.addChild(turn);
      var stats = makeText(
        "累計傷 " + dmgSide.actualDamage + "  ·  取消 " + dmgSide.cancels,
        { size: 13, fill: COLORS.ink, display: true }
      );
      stats.x = pad;
      stats.y = pad + 48;
      root.addChild(stats);
    }

    var endBtn = makeBtn("結束對局", 96, 34, COLORS.panel2, {
      size: 13, stroke: COLORS.line, textFill: COLORS.muted, radius: 10
    });
    endBtn.x = w - 96 - pad;
    endBtn.y = pad;
    hit(endBtn, endGame);
    root.addChild(endBtn);

    if (state.phase === "attack" && state.lastUndo) {
      var undoBtn = makeBtn("撤銷", 72, 34, COLORS.panel2, {
        size: 13, stroke: COLORS.coral, textFill: COLORS.coral, radius: 10
      });
      undoBtn.x = w - 96 - 72 - pad - 8;
      undoBtn.y = pad;
      hit(undoBtn, undoLast);
      root.addChild(undoBtn);
    }
  }

  function drawSlotsRow(y, interactiveMode, opts) {
    opts = opts || {};
    var dim = opts.dim || cardAspect();
    var totalW = dim.slotW * 3 + dim.gap * 2;
    var startX = opts.startX != null
      ? opts.startX
      : Math.floor((app.screen.width - totalW) / 2);
    var stage = activeStage();
    var draftSlot = uiState.draft && uiState.draft.slot;
    var artRects = [];

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
      var selected = draftSlot === key || uiState.pickerSlot === key;
      gFillRound(g, 0, 0, dim.slotW, dim.slotH, 12, COLORS.panel, 1);
      gStrokeRound(g, 0, 0, dim.slotW, dim.slotH, 12,
        selected ? COLORS.amber : (slot.resolvedOnce ? COLORS.good : COLORS.line),
        selected ? 2.5 : 1.5);
      box.addChild(g);

      var tag = makeText(SLOT_LABELS[key] + (slot.resolvedOnce ? " ✓" : ""), {
        size: 11, fill: COLORS.muted, display: true
      });
      tag.x = 8;
      tag.y = 6;
      box.addChild(tag);

      if (slot.card) {
        drawCardFace(box, slot.card, dim.slotW, dim.slotH);
        if (slot.card.imageUrl) {
          artRects.push({
            key: key,
            x: x,
            y: y,
            w: dim.slotW,
            h: dim.slotH,
            url: slot.card.imageUrl
          });
        }
      } else {
        var empty = makeText("點擊放卡", { size: 13, fill: COLORS.muted });
        empty.anchor.set(0.5);
        empty.x = dim.slotW / 2;
        empty.y = dim.slotH / 2;
        box.addChild(empty);
      }

      (function (slotKey) {
        hit(box, function () {
          if (interactiveMode === "deploy" || uiState.redeployMode) {
            openPicker(slotKey);
          } else if (interactiveMode === "attack") {
            if (uiState.attackStep) return;
            startAttackOnSlot(slotKey);
          }
        });
      })(key);

      root.addChild(box);
    }
    syncCardArtLayer(artRects);
    return y + dim.slotH;
  }

  function drawCardFace(parent, card, w, h) {
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
    name.alpha = 0.35;
    parent.addChild(name);

    var meta = makeText(
      "Lv" + (card.level != null ? card.level : "?") + " · " + (card.color || "—"),
      { size: 11, fill: COLORS.muted, display: true }
    );
    meta.x = 6;
    meta.y = h - 22;
    parent.addChild(meta);
  }

  function drawDeploy(w, h) {
    var land = isLandscape();
    var dim = cardAspect("hero");
    var totalW = dim.slotW * 3 + dim.gap * 2;
    var panelOpen = isSidePanelOpen();

    var title = makeText("前排布陣", { size: land ? 18 : 20, weight: "700", fill: COLORS.ink, display: true });
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    title.y = land ? 50 : 86;
    root.addChild(title);

    var sub = makeText(
      panelOpen
        ? (uiState.pickerSlot ? ("選卡中・" + SLOT_LABELS[uiState.pickerSlot] + "槽") : "選卡面板已展開")
        : "點槽位選卡・右側「選卡」可展開篩選",
      { size: 12, fill: COLORS.muted }
    );
    sub.anchor.set(0.5, 0);
    sub.x = w / 2;
    sub.y = title.y + 24;
    root.addChild(sub);

    var slotsStartX = Math.floor((w - totalW) / 2);
    var slotsY = land
      ? Math.max(title.y + 44, Math.floor((h - dim.slotH - 58) / 2))
      : title.y + 48;
    drawSlotsRow(slotsY, "deploy", { startX: slotsStartX, dim: dim });

    var startBtn = makeBtn("戰階開始", Math.min(w - 28, land ? 240 : 280), 44, COLORS.amber, {
      textFill: 0x1a1200, size: 16, radius: 12
    });
    startBtn.x = (w - startBtn._w) / 2;
    startBtn.y = h - 56;
    hit(startBtn, function () {
      uiState.pickerSlot = null;
      uiState.sidePanelOpen = false;
      uiState.redeployMode = false;
      clearToast();
      state.phase = "attack";
      persist();
      render();
      toast("戰階開始・任選槽攻擊");
    });
    root.addChild(startBtn);

    if (panelOpen) drawDeploySidePanel(w, h);
    drawSidePanelTab(w, h, panelOpen);
  }

  function drawSidePanelTab(w, h, panelOpen) {
    var tabW = 36;
    var tabH = 112;
    var land = isLandscape();
    var panelW = land ? Math.floor(Math.min(w * 0.4, 360)) : Math.floor(w * 0.92);
    var tab = new PIXI.Container();
    tab.eventMode = "static";
    tab.cursor = "pointer";
    tab.x = panelOpen ? (w - panelW - tabW + 2) : (w - tabW);
    tab.y = Math.floor((h - tabH) / 2);

    var g = new PIXI.Graphics();
    gFillRound(g, 0, 0, tabW, tabH, 10, panelOpen ? COLORS.amber : COLORS.panel2, 1);
    gStrokeRound(g, 0, 0, tabW, tabH, 10, panelOpen ? 0x1a1200 : COLORS.teal, 1.5);
    tab.addChild(g);

    var t1 = makeText(panelOpen ? "◂" : "▸", {
      size: 16, weight: "700", fill: panelOpen ? 0x1a1200 : COLORS.teal, display: true
    });
    t1.anchor.set(0.5);
    t1.x = tabW / 2;
    t1.y = 28;
    tab.addChild(t1);
    var t2 = makeText(panelOpen ? "收合" : "選卡", {
      size: 12, weight: "700", fill: panelOpen ? 0x1a1200 : COLORS.ink, display: true
    });
    t2.anchor.set(0.5);
    t2.x = tabW / 2;
    t2.y = 64;
    tab.addChild(t2);

    hit(tab, function () {
      if (isSidePanelOpen()) {
        uiState.sidePanelOpen = false;
        render();
      } else {
        uiState.sidePanelOpen = true;
        if (!uiState.pickerSlot) uiState.pickerSlot = "left";
        render();
      }
    });
    root.addChild(tab);
  }

  function drawDeploySidePanel(w, h) {
    var land = isLandscape();
    var panelW = land ? Math.floor(Math.min(w * 0.4, 360)) : Math.floor(w * 0.92);
    var panelX = land ? w - panelW : Math.floor((w - panelW) / 2);
    var panelY = land ? 44 : 70;
    var panelH = h - panelY - 10;

    var backdrop = new PIXI.Graphics();
    gFillRect(backdrop, 0, 0, Math.max(0, panelX), h, 0x000000, 0.32);
    backdrop.eventMode = "static";
    backdrop.cursor = "pointer";
    hit(backdrop, function () {
      uiState.sidePanelOpen = false;
      render();
    });
    root.addChild(backdrop);

    var panel = new PIXI.Container();
    panel.x = panelX;
    panel.y = panelY;
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
    hit(closeBtn, function () {
      uiState.sidePanelOpen = false;
      render();
    });
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
        panel
      );
    } else {
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
        textFill: on ? 0x1a1200 : COLORS.ink,
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
        textFill: onC && col.id !== "all" ? 0xffffff : (onC ? 0x1a1200 : COLORS.ink),
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
    uiState.sidePanelOpen = true;
    uiState.listScroll = 0;
    render();
  }

  function toggleSidePanel(force) {
    uiState.sidePanelOpen = typeof force === "boolean" ? force : !isSidePanelOpen();
    render();
  }

  function drawCardPicker(x, y, w, maxH, parent) {
    parent = parent || root;
    var panelH = Math.min(maxH, 280);
    var panel = new PIXI.Container();
    panel.x = x;
    panel.y = y;

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
      toast("已清空");
    });
    panel.addChild(clearBtn);

    var list = filteredCharacters();
    var rowH = 52;
    var listTop = 40;
    var listH = panelH - listTop - 8;
    var mask = new PIXI.Graphics();
    gFillRect(mask, 0, listTop, w, listH, 0xffffff, 1);

    var listC = new PIXI.Container();
    listC.y = listTop - uiState.listScroll;
    panel.addChild(listC);
    panel.addChild(mask);
    listC.mask = mask;

    if (!list.length) {
      var empty = makeText("沒有符合的角色", { size: 13, fill: COLORS.muted });
      empty.x = 12;
      empty.y = listTop + 16;
      panel.addChild(empty);
    }

    for (var i = 0; i < list.length; i++) {
      var card = list[i];
      var row = new PIXI.Container();
      row.y = i * rowH;
      row.eventMode = "static";
      row.cursor = "pointer";
      var rg = new PIXI.Graphics();
      gFillRect(rg, 0, 0, w, rowH - 2, i % 2 ? 0x1a2030 : 0x222a3a, 1);
      row.addChild(rg);
      var sw = new PIXI.Graphics();
      gFillRect(sw, 0, 0, 5, rowH - 2, colorTint(card.color), 1);
      row.addChild(sw);
      var nm = makeText(card.name || card.cardNo, {
        size: 13, fill: COLORS.ink, wrap: true, wrapWidth: w - 100
      });
      nm.x = 12;
      nm.y = 8;
      row.addChild(nm);
      var meta = makeText(
        (card.cardNo || "") + "  Lv" + (card.level != null ? card.level : "?") + " ×" + (card.qty || 1),
        { size: 11, fill: COLORS.muted }
      );
      meta.x = 12;
      meta.y = 30;
      row.addChild(meta);
      (function (c, slotKey) {
        hit(row, function () {
          setCardOnSlot(slotKey, c);
          uiState.pickerSlot = null;
          uiState.redeployMode = false;
          toast("已放入" + SLOT_LABELS[slotKey]);
        });
      })(card, uiState.pickerSlot);
      listC.addChild(row);
    }

    // scroll buttons
    var maxScroll = Math.max(0, list.length * rowH - listH);
    var up = makeBtn("▲", 44, 32, COLORS.panel, { size: 12, stroke: COLORS.line, radius: 8 });
    up.x = w - 100;
    up.y = panelH - 40;
    hit(up, function () {
      uiState.listScroll = Math.max(0, uiState.listScroll - rowH * 3);
      render();
    });
    panel.addChild(up);
    var down = makeBtn("▼", 44, 32, COLORS.panel, { size: 12, stroke: COLORS.line, radius: 8 });
    down.x = w - 50;
    down.y = panelH - 40;
    hit(down, function () {
      uiState.listScroll = Math.min(maxScroll, uiState.listScroll + rowH * 3);
      render();
    });
    panel.addChild(down);

    parent.addChild(panel);
    return y + panelH;
  }

  function drawAttack(w, h) {
    var land = isLandscape();
    var headerH = land ? 52 : 86;
    var dim = cardAspect();
    var leftPad = 12;
    var title = makeText(
      uiState.attackStep ? "攻擊宣告中" : "選擇攻擊角色",
      { size: land ? 18 : 20, weight: "700", fill: COLORS.ink, display: true }
    );
    title.x = leftPad;
    title.y = headerH;
    root.addChild(title);

    var slotsY = headerH + 28;
    var slotsStartX = land
      ? leftPad
      : Math.floor((w - (dim.slotW * 3 + dim.gap * 2)) / 2);
    drawSlotsRow(slotsY, "attack", { startX: slotsStartX });

    var controlsY = slotsY + dim.slotH + 10;
    var redeploy = makeBtn(
      uiState.redeployMode ? "完成換人" : "中途換人／放卡",
      land ? 128 : 140,
      34,
      uiState.redeployMode ? COLORS.amber : COLORS.panel2,
      {
        size: 12,
        stroke: COLORS.line,
        textFill: uiState.redeployMode ? 0x1a1200 : COLORS.muted,
        radius: 10
      }
    );
    redeploy.x = leftPad;
    redeploy.y = land ? h - 48 : controlsY;
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
    root.addChild(redeploy);

    var endPhase = makeBtn("結束本戰階", 120, 34, COLORS.teal, {
      size: 12, textFill: 0x06221f, radius: 10
    });
    if (land) {
      endPhase.x = leftPad + 136;
      endPhase.y = h - 48;
    } else {
      endPhase.x = w - 134;
      endPhase.y = controlsY;
    }
    hit(endPhase, function () {
      if (uiState.attackStep) {
        toast("請先完成目前宣告");
        return;
      }
      endAttackPhase();
    });
    root.addChild(endPhase);

    var rightX = land ? Math.floor(w * 0.46) : 14;
    var rightW = land ? w - rightX - 12 : w - 28;
    var rightY = land ? headerH : controlsY + 44;

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
      { id: "side", label: "側面攻擊" }
    ];
    for (var i = 0; i < types.length; i++) {
      var tp = types[i];
      var b = makeBtn(tp.label, w - 24, 42, COLORS.panel2, {
        size: 15, stroke: COLORS.line, radius: 10
      });
      b.x = 12;
      b.y = y;
      (function (id) {
        hit(b, function () {
          uiState.draft.attackType = id;
          if (id === "front") uiState.attackStep = "target";
          else uiState.attackStep = "damage";
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
      size: 14, textFill: 0x1a1200, radius: 10
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
      size: 15, textFill: 0x1a1200, radius: 10
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
    var t = makeText(
      "宣告 " + uiState.draft.declaredDamage + " 點 → 結果",
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

    var other = makeBtn("其他（觸發取消／擋傷／減傷）", w - 24, 48, COLORS.teal, {
      size: 14, textFill: 0x06221f, radius: 12
    });
    other.x = 12;
    other.y = y;
    hit(other, function () {
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
    syncOrientGate();
    window.addEventListener("orientationchange", function () {
      setTimeout(function () {
        syncOrientGate();
        if (app) render();
      }, 120);
    });
    window.addEventListener("resize", function () {
      syncOrientGate();
    });
    document.addEventListener("pointerdown", function () {
      tryLockLandscape();
    }, { once: true, passive: true });

    var bootEl = $("agl-boot");
    try {
      app = new PIXI.Application({
        resizeTo: window,
        backgroundColor: COLORS.bg,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        forceCanvas: false
      });
    } catch (err1) {
      try {
        app = new PIXI.Application({
          resizeTo: window,
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
    $("pixi-host").appendChild(app.view);
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
      syncOrientGate();
      render();
    });

    app.ticker.add(function () {
      if (uiState.toast && performance.now() >= uiState.toastUntil) {
        uiState.toast = "";
        render();
      }
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
    render: render,
    setCardOnSlot: setCardOnSlot,
    openPicker: openPicker,
    startAttackOnSlot: startAttackOnSlot,
    beginRecording: beginRecording,
    endAttackPhase: endAttackPhase,
    endGame: endGame,
    undoLast: undoLast,
    resetGame: resetGame,
    commitDraft: function (partial) {
      if (!uiState.draft) return false;
      Object.assign(uiState.draft, partial || {});
      if (uiState.draft.actualDamage == null && uiState.draft.result === "damage") {
        uiState.draft.actualDamage = uiState.draft.declaredDamage;
      }
      if (uiState.draft.actualDamage == null && (uiState.draft.result === "cancel" || uiState.draft.otherKind === "triggerCancel" || uiState.draft.otherKind === "block")) {
        uiState.draft.actualDamage = 0;
      }
      commitAttack();
      return true;
    },
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
