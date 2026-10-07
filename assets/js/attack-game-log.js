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
  var textureCache = new Map();
  var resolvedTextures = new Map();
  var numberResolver = null;
  var textResolver = null;

  var state = createEmptyState();
  var uiState = {
    filterLevel: "all",
    filterColor: "all",
    pickerSlot: null,
    attackStep: null,
    draft: null,
    listScroll: 0,
    redeployMode: false,
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
      ended: false
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
    uiState.toastUntil = performance.now() + (ms || 1600);
    render();
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
    uiState.attackStep = null;
    uiState.draft = null;
    uiState.pickerSlot = null;
    closeOverlay("overlay-setup");
    persist();
    render();
    toast("記錄開始・先攻布陣");
  }

  /* ——— Pixi helpers ——— */
  function makeText(str, opts) {
    opts = opts || {};
    return new PIXI.Text({
      text: String(str == null ? "" : str),
      style: {
        fontFamily: opts.display ? ' "Chakra Petch", "Noto Sans TC", sans-serif' : '"Noto Sans TC", sans-serif',
        fontSize: opts.size || 14,
        fontWeight: opts.weight || "500",
        fill: opts.fill != null ? opts.fill : COLORS.ink,
        align: opts.align || "left",
        wordWrap: !!opts.wrap,
        wordWrapWidth: opts.wrapWidth || 200,
        breakWords: true
      }
    });
  }

  function makeBtn(label, w, h, fill, opts) {
    opts = opts || {};
    var c = new PIXI.Container();
    c.eventMode = "static";
    c.cursor = "pointer";
    var g = new PIXI.Graphics();
    var radius = opts.radius != null ? opts.radius : 12;
    g.roundRect(0, 0, w, h, radius);
    g.fill(fill);
    if (opts.stroke) {
      g.roundRect(0, 0, w, h, radius);
      g.stroke({ width: 1.5, color: opts.stroke });
    }
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

  function cardAspect() {
    var w = Math.min(app.screen.width, 430);
    var slotW = Math.floor((w - 36) / 3);
    var slotH = Math.floor(slotW * 1.4);
    return { slotW: slotW, slotH: slotH, gap: 8 };
  }

  function loadCardTexture(url) {
    if (!url) return Promise.resolve(null);
    if (resolvedTextures.has(url)) return Promise.resolve(resolvedTextures.get(url));
    if (textureCache.has(url)) return textureCache.get(url);
    var p = PIXI.Assets.load({
      src: url,
      loadParser: "loadTextures",
      data: { crossOrigin: "anonymous" }
    }).then(function (tex) {
      resolvedTextures.set(url, tex || null);
      return tex;
    }).catch(function () {
      resolvedTextures.set(url, null);
      return null;
    });
    textureCache.set(url, p);
    return p;
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
    uiState.draft = null;
    uiState.attackStep = null;
    persist();
    render();
  }

  function resetGame() {
    state = createEmptyState();
    uiState = {
      filterLevel: "all",
      filterColor: "all",
      pickerSlot: null,
      attackStep: null,
      draft: null,
      listScroll: 0,
      redeployMode: false,
      toast: "",
      toastUntil: 0
    };
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
    bg.rect(0, 0, w, h);
    bg.fill(COLORS.bg);
    // atmosphere bands
    bg.rect(0, 0, w, h * 0.35);
    bg.fill({ color: 0x1a2433, alpha: 0.9 });
    bg.ellipse(w * 0.15, 0, w * 0.45, h * 0.28);
    bg.fill({ color: 0x2ec4b6, alpha: 0.08 });
    bg.ellipse(w * 0.9, h * 0.85, w * 0.4, h * 0.3);
    bg.fill({ color: 0xf0a202, alpha: 0.07 });
    root.addChild(bg);

    if (state.phase === "setup") {
      drawIdleBrand(w, h);
      return;
    }
    if (state.phase === "summary" || state.ended) {
      drawSummary(w, h);
      return;
    }

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
    var pad = 14;
    var side = sideLabel(state.activeSide);
    var sideColor = state.activeSide === "first" ? COLORS.teal : COLORS.amber;
    var badge = makeText(side, { size: 18, weight: "700", fill: sideColor, display: true });
    badge.x = pad;
    badge.y = pad + 4;
    root.addChild(badge);

    var turn = makeText("回合 " + state.turn, { size: 14, fill: COLORS.muted, display: true });
    turn.x = pad;
    turn.y = pad + 28;
    root.addChild(turn);

    var tot = sessionTotals();
    var dmgSide = totalsFor(state.activeSide);
    var stats = makeText(
      "累計傷 " + dmgSide.actualDamage + "  ·  取消 " + dmgSide.cancels,
      { size: 13, fill: COLORS.ink, display: true }
    );
    stats.x = pad;
    stats.y = pad + 48;
    root.addChild(stats);

    var endBtn = makeBtn("結束對局", 96, 36, COLORS.panel2, {
      size: 13, stroke: COLORS.line, textFill: COLORS.muted, radius: 10
    });
    endBtn.x = w - 96 - pad;
    endBtn.y = pad;
    hit(endBtn, endGame);
    root.addChild(endBtn);

    if (state.phase === "attack" && state.lastUndo) {
      var undoBtn = makeBtn("撤銷", 72, 36, COLORS.panel2, {
        size: 13, stroke: COLORS.coral, textFill: COLORS.coral, radius: 10
      });
      undoBtn.x = w - 96 - 72 - pad - 8;
      undoBtn.y = pad;
      hit(undoBtn, undoLast);
      root.addChild(undoBtn);
    }
  }

  function drawSlotsRow(y, interactiveMode) {
    var dim = cardAspect();
    var totalW = dim.slotW * 3 + dim.gap * 2;
    var startX = Math.floor((app.screen.width - totalW) / 2);
    var stage = activeStage();
    var draftSlot = uiState.draft && uiState.draft.slot;

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
      g.roundRect(0, 0, dim.slotW, dim.slotH, 12);
      g.fill(COLORS.panel);
      g.roundRect(0, 0, dim.slotW, dim.slotH, 12);
      g.stroke({
        width: selected ? 2.5 : 1.5,
        color: selected ? COLORS.amber : (slot.resolvedOnce ? COLORS.good : COLORS.line)
      });
      box.addChild(g);

      var tag = makeText(SLOT_LABELS[key] + (slot.resolvedOnce ? " ✓" : ""), {
        size: 11, fill: COLORS.muted, display: true
      });
      tag.x = 8;
      tag.y = 6;
      box.addChild(tag);

      if (slot.card) {
        drawCardFace(box, slot.card, dim.slotW, dim.slotH);
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
    return y + dim.slotH;
  }

  function drawCardFace(parent, card, w, h) {
    var tex = card.imageUrl ? resolvedTextures.get(card.imageUrl) : null;
    if (tex) {
      var sprite = new PIXI.Sprite(tex);
      var scale = Math.min((w - 8) / tex.width, (h - 28) / tex.height);
      sprite.scale.set(scale);
      sprite.x = (w - sprite.width) / 2;
      sprite.y = 24;
      parent.addChild(sprite);
    } else {
      if (card.imageUrl && !resolvedTextures.has(card.imageUrl)) {
        loadCardTexture(card.imageUrl).then(function (loaded) {
          if (loaded) render();
        });
      }
      var stripe = new PIXI.Graphics();
      stripe.rect(0, 22, w, 4);
      stripe.fill(colorTint(card.color));
      parent.addChild(stripe);

      var name = makeText(card.name || card.cardNo || "", {
        size: 11, fill: COLORS.ink, wrap: true, wrapWidth: w - 12
      });
      name.x = 6;
      name.y = 32;
      parent.addChild(name);
    }

    var meta = makeText(
      "Lv" + (card.level != null ? card.level : "?") + " · " + (card.color || "—"),
      { size: 11, fill: COLORS.muted, display: true }
    );
    meta.x = 6;
    meta.y = h - 22;
    parent.addChild(meta);
  }

  function drawDeploy(w, h) {
    var y = 86;
    var title = makeText("前排布陣", { size: 20, weight: "700", fill: COLORS.ink, display: true });
    title.x = 14;
    title.y = y;
    root.addChild(title);
    y += 32;

    y = drawSlotsRow(y, "deploy") + 14;

    // filters
    y = drawFilters(14, y) + 10;

    if (uiState.pickerSlot) {
      y = drawCardPicker(14, y, w - 28, h - y - 90) + 10;
    } else {
      var hint = makeText("點選方塊 → 篩選角色 → 放入；可重選或清空。", {
        size: 13, fill: COLORS.muted, wrap: true, wrapWidth: w - 28
      });
      hint.x = 14;
      hint.y = y;
      root.addChild(hint);
    }

    var startBtn = makeBtn("戰階開始", Math.min(w - 28, 280), 48, COLORS.amber, {
      textFill: 0x1a1200, size: 17, radius: 14
    });
    startBtn.x = (w - startBtn._w) / 2;
    startBtn.y = h - 64 - Math.max(0, (window.visualViewport && (window.innerHeight - window.visualViewport.height)) || 0);
    // safe bottom
    startBtn.y = h - 72;
    hit(startBtn, function () {
      uiState.pickerSlot = null;
      state.phase = "attack";
      persist();
      render();
      toast("戰階開始・任選槽攻擊");
    });
    root.addChild(startBtn);
  }

  function drawFilters(x, y) {
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
    root.addChild(label);
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
      root.addChild(b);
      bx += 46;
    }

    y += 38;
    var cl = makeText("顏色", { size: 12, fill: COLORS.muted, display: true });
    cl.x = x;
    cl.y = y;
    root.addChild(cl);
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
      root.addChild(cb);
      bx += 46;
    }
    return y + 34;
  }

  function openPicker(slotKey) {
    uiState.pickerSlot = slotKey;
    uiState.listScroll = 0;
    render();
  }

  function drawCardPicker(x, y, w, maxH) {
    var panelH = Math.min(maxH, 280);
    var panel = new PIXI.Container();
    panel.x = x;
    panel.y = y;

    var bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, panelH, 14);
    bg.fill(COLORS.panel2);
    bg.roundRect(0, 0, w, panelH, 14);
    bg.stroke({ width: 1, color: COLORS.line });
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
    mask.rect(0, listTop, w, listH);
    mask.fill(0xffffff);

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
      rg.rect(0, 0, w, rowH - 2);
      rg.fill(i % 2 ? 0x1a2030 : 0x222a3a);
      row.addChild(rg);
      var sw = new PIXI.Graphics();
      sw.rect(0, 0, 5, rowH - 2);
      sw.fill(colorTint(card.color));
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

    root.addChild(panel);
    return y + panelH;
  }

  function drawAttack(w, h) {
    var y = 86;
    var title = makeText(
      uiState.attackStep ? "攻擊宣告中" : "選擇攻擊角色",
      { size: 20, weight: "700", fill: COLORS.ink, display: true }
    );
    title.x = 14;
    title.y = y;
    root.addChild(title);
    y += 30;

    y = drawSlotsRow(y, "attack") + 12;

    // mid-battle redeploy hint + picker
    var redeploy = makeBtn(
      uiState.redeployMode ? "完成換人" : "中途換人／放卡",
      140,
      34,
      uiState.redeployMode ? COLORS.amber : COLORS.panel2,
      {
        size: 12,
        stroke: COLORS.line,
        textFill: uiState.redeployMode ? 0x1a1200 : COLORS.muted,
        radius: 10
      }
    );
    redeploy.x = 14;
    redeploy.y = y;
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
    endPhase.x = w - 134;
    endPhase.y = y;
    hit(endPhase, function () {
      if (uiState.attackStep) {
        toast("請先完成目前宣告");
        return;
      }
      endAttackPhase();
    });
    root.addChild(endPhase);
    y += 44;

    if (uiState.pickerSlot && !uiState.attackStep) {
      drawCardPicker(14, y, w - 28, h - y - 24);
      return;
    }

    if (!uiState.attackStep) {
      var tip = makeText("點任意有卡的槽開始攻擊；空槽可跳過。可中途換人後再攻。", {
        size: 13, fill: COLORS.muted, wrap: true, wrapWidth: w - 28
      });
      tip.x = 14;
      tip.y = y;
      root.addChild(tip);
      return;
    }

    drawAttackWizard(14, y, w - 28, h - y - 16);
  }

  function drawAttackWizard(x, y, w, maxH) {
    var d = uiState.draft;
    var panel = new PIXI.Container();
    panel.x = x;
    panel.y = y;
    var bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, Math.min(maxH, 360), 14);
    bg.fill(COLORS.panel);
    bg.roundRect(0, 0, w, Math.min(maxH, 360), 14);
    bg.stroke({ width: 1, color: COLORS.amber });
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
    var title = makeText("雙方總結算", { size: 26, weight: "700", fill: COLORS.ink, display: true });
    title.x = 16;
    title.y = 20;
    root.addChild(title);

    var colW = Math.floor((w - 40) / 2);
    drawSummaryCol(16, 64, colW, h - 140, "first");
    drawSummaryCol(24 + colW, 64, colW, h - 140, "second");

    var again = makeBtn("新對局", Math.min(w - 32, 240), 48, COLORS.amber, {
      textFill: 0x1a1200, size: 16, radius: 14
    });
    again.x = (w - again._w) / 2;
    again.y = h - 72;
    hit(again, resetGame);
    root.addChild(again);
  }

  function drawSummaryCol(x, y, w, h, side) {
    var c = new PIXI.Container();
    c.x = x;
    c.y = y;
    var bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, h, 14);
    bg.fill(COLORS.panel);
    bg.roundRect(0, 0, w, h, 14);
    bg.stroke({ width: 1.5, color: side === "first" ? COLORS.teal : COLORS.amber });
    c.addChild(bg);

    var tot = totalsFor(side);
    var head = makeText(sideLabel(side), {
      size: 18, weight: "700", fill: side === "first" ? COLORS.teal : COLORS.amber, display: true
    });
    head.x = 12;
    head.y = 12;
    c.addChild(head);

    var lines = [
      "宣告 " + tot.declared,
      "吃傷 " + tot.damageHits,
      "取消 " + tot.cancels,
      "其他 " + tot.others,
      "總傷 " + tot.actualDamage,
      "直/正/側 " + tot.byType.direct + "/" + tot.byType.front + "/" + tot.byType.side
    ];
    for (var i = 0; i < lines.length; i++) {
      var ln = makeText(lines[i], { size: 13, fill: COLORS.ink });
      ln.x = 12;
      ln.y = 44 + i * 22;
      c.addChild(ln);
    }

    var cardTitle = makeText("使用牌", { size: 13, fill: COLORS.muted, display: true });
    cardTitle.x = 12;
    cardTitle.y = 44 + lines.length * 22 + 8;
    c.addChild(cardTitle);

    var keys = Object.keys(tot.cards);
    var cy = cardTitle.y + 22;
    for (var k = 0; k < Math.min(keys.length, 8); k++) {
      var nm = keys[k];
      // find name from logs
      var display = nm;
      for (var li = 0; li < state.logs.length; li++) {
        var ac = state.logs[li].attackerCard;
        if (ac && (ac.cardNo === nm || ac.name === nm)) {
          display = (ac.name || ac.cardNo || nm).slice(0, 14);
          break;
        }
      }
      var row = makeText("×" + tot.cards[nm] + " " + display, {
        size: 12, fill: COLORS.ink, wrap: true, wrapWidth: w - 20
      });
      row.x = 12;
      row.y = cy;
      c.addChild(row);
      cy += 20;
    }
    if (!keys.length) {
      var none = makeText("（尚無）", { size: 12, fill: COLORS.muted });
      none.x = 12;
      none.y = cy;
      c.addChild(none);
    }

    root.addChild(c);
  }

  function drawToast(w, h, msg) {
    var t = makeText(msg, { size: 14, fill: 0x1a1200, display: true });
    var padX = 16;
    var tw = Math.min(w - 40, t.width + padX * 2);
    var box = new PIXI.Graphics();
    box.roundRect(0, 0, tw, 40, 20);
    box.fill(COLORS.amber);
    box.x = (w - tw) / 2;
    box.y = h - 100;
    root.addChild(box);
    t.anchor.set(0.5);
    t.x = box.x + tw / 2;
    t.y = box.y + 20;
    root.addChild(t);
  }

  /* ——— Boot ——— */
  async function boot() {
    bindOverlays();
    app = new PIXI.Application();
    await app.init({
      resizeTo: window,
      background: COLORS.bg,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: "webgl"
    });
    $("pixi-host").appendChild(app.canvas);
    root = new PIXI.Container();
    app.stage.addChild(root);

    var restored = restore();
    if (restored && state.phase !== "setup" && state.first && state.second) {
      closeOverlay("overlay-setup");
      toast("已還原本機紀錄");
    } else {
      state = createEmptyState();
      openOverlay("overlay-setup");
    }

    $("agl-boot").hidden = true;

    window.addEventListener("resize", function () {
      render();
    });

    // toast ticker
    app.ticker.add(function () {
      if (uiState.toast && performance.now() >= uiState.toastUntil) {
        uiState.toast = "";
        render();
      }
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
