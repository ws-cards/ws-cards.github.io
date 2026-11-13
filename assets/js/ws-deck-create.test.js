/**
 * 聚焦測試：新增牌組三種入口、匯入檢查、草稿空位、來源列。
 * 執行：node assets/js/ws-deck-create.test.js
 */
'use strict';

var assert = require('assert');
var WsDeckCreate = require('./ws-deck-create.js');

var passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('ok - ' + name);
  } catch (err) {
    console.error('not ok - ' + name);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test('三種入口文案完全一致', function () {
  assert.strictEqual(WsDeckCreate.METHODS.length, 3);
  assert.deepStrictEqual(
    WsDeckCreate.METHODS.map(function (m) { return [m.id, m.title, m.subtitle]; }),
    [
      ['blank', '從零組牌', '自己選擇每一張牌'],
      ['tournament', '比賽牌表', '挑選官方優勝牌組作為你的牌組'],
      ['favorites', '從喜歡的牌開始', '按照提示,選擇你喜愛的牌快速組牌']
    ]
  );
});

test('記住上次選擇的方式', function () {
  var mem = {
    data: {},
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null; },
    setItem: function (k, v) { this.data[k] = String(v); }
  };
  assert.strictEqual(WsDeckCreate.getLastMethod(mem), '');
  assert.strictEqual(WsDeckCreate.setLastMethod('tournament', mem), true);
  assert.strictEqual(WsDeckCreate.getLastMethod(mem), 'tournament');
  assert.strictEqual(WsDeckCreate.setLastMethod('nope', mem), false);
  assert.strictEqual(WsDeckCreate.getLastMethod(mem), 'tournament');
});

test('來源列：空白／比賽／草稿', function () {
  assert.strictEqual(
    WsDeckCreate.formatSourceRow(WsDeckCreate.buildCreateMetaBlank('BanG Dream!', 'BD')),
    '空白牌組・BanG Dream!'
  );
  var legal = { isReference: false, label: '合法' };
  assert.strictEqual(
    WsDeckCreate.formatSourceRow(WsDeckCreate.buildCreateMetaTournament({
      eventName: 'ネオスタンダード in 測試',
      rank: '優勝',
      eventDate: '2026-09-28'
    }, legal)),
    '來自：ネオスタンダード in 測試、優勝、2026-09-28・已依目前規則檢查'
  );
  var ref = { isReference: true, label: '參考牌組' };
  assert.ok(
    WsDeckCreate.formatSourceRow(WsDeckCreate.buildCreateMetaTournament({
      eventName: '測試賽',
      rank: '4位',
      eventDate: '2026-01-01'
    }, ref)).indexOf('參考牌組') >= 0
  );
  var fav = WsDeckCreate.buildCreateMetaFavorites([
    { cardNumber: 'BD/W54-001', cardName: '燈' }
  ], 42);
  assert.strictEqual(
    WsDeckCreate.formatSourceRow(fav),
    '草稿・以所選核心卡為中心（燈）・還缺 42 張'
  );
});

test('匯入檢查：50／同名4／CX8／作品範圍／制限', function () {
  function make50() {
    var cards = [];
    for (var i = 0; i < 42; i++) {
      cards.push({ cardNumber: 'BD/W54-' + String(100 + i), qty: 1, cardName: '角色' + i, kindClass: '角色' });
    }
    for (var j = 0; j < 8; j++) {
      cards.push({ cardNumber: 'BD/W54-CX' + j, qty: 1, cardName: 'CX' + j, kindClass: 'CX' });
    }
    return cards;
  }

  var ok = WsDeckCreate.validateNeoStandard(make50(), { allowedPrefixes: ['BD'] });
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.isReference, false);

  var overName = make50();
  overName[0].cardName = '同名';
  overName[1].cardName = '同名';
  overName[2].cardName = '同名';
  overName[3].cardName = '同名';
  overName[4].cardName = '同名';
  var same = WsDeckCreate.validateNeoStandard(overName, { allowedPrefixes: ['BD'] });
  assert.strictEqual(same.ok, false);
  assert.strictEqual(same.isReference, true);
  assert.ok(same.issues.some(function (i) { return i.code === 'same-name'; }));

  var overCx = make50();
  overCx.push({ cardNumber: 'BD/W54-CX9', qty: 1, cardName: 'CX9', kindClass: 'CX' });
  overCx[0].qty = 0;
  // 仍可能因張數失敗；刻意做成 50 張但 9 CX
  overCx = make50();
  overCx[0].kindClass = 'CX';
  overCx[0].cardName = 'ExtraCX';
  var cx = WsDeckCreate.validateNeoStandard(overCx, { allowedPrefixes: ['BD'] });
  assert.strictEqual(cx.ok, false);
  assert.ok(cx.issues.some(function (i) { return i.code === 'cx'; }));

  var wrongTitle = make50();
  wrongTitle[0].cardNumber = 'SAO/S20-001';
  var scope = WsDeckCreate.validateNeoStandard(wrongTitle, { allowedPrefixes: ['BD'] });
  assert.strictEqual(scope.ok, false);
  assert.ok(scope.issues.some(function (i) { return i.code === 'title-scope'; }));
  assert.ok(scope.flaggedCards.some(function (f) { return f.code === 'title-scope'; }));

  var banned = WsDeckCreate.validateNeoStandard(make50(), {
    allowedPrefixes: ['BD'],
    restrictions: { bannedNames: ['角色0'] }
  });
  assert.strictEqual(banned.ok, false);
  assert.ok(banned.issues.some(function (i) { return i.code === 'banned'; }));

  var shortDeck = [{ cardNumber: 'BD/W54-001', qty: 4, cardName: 'A', kindClass: '角色' }];
  var count = WsDeckCreate.validateNeoStandard(shortDeck, { allowedPrefixes: ['BD'] });
  assert.strictEqual(count.isReference, true);
  assert.ok(count.issues.some(function (i) { return i.code === 'count'; }));
});

test('比賽牌表清單不展開 50 張卡，只列賽事／成績／code', function () {
  var data = {
    events: {
      '1': { date: '2026-09-28', title: 'ネオスタンダード in 測試' }
    },
    decks: [
      {
        e: '1',
        b: 'ブロックA',
        r: '優勝',
        rs: 1,
        k: 'ネオスタンダード構築',
        t: 'BanG Dream!',
        n: '測試牌',
        code: 'ABC123',
        c: [['BD/W54-001', 4], ['BD/W54-002', 4]]
      },
      {
        e: '1',
        r: '4位',
        rs: 4,
        k: 'タイトル限定',
        code: 'TITLE1',
        c: []
      }
    ]
  };
  var rows = WsDeckCreate.listOfficialDeckRows(data, { format: 'neo' });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].eventName, 'ネオスタンダード in 測試');
  assert.strictEqual(rows[0].rank, '優勝');
  assert.strictEqual(rows[0].deckCode, 'ABC123');
  assert.ok(!Object.prototype.hasOwnProperty.call(rows[0], 'cardFaces'));
});

test('草稿空位保持可見，不自動湊滿 50', function () {
  var cores = [
    { cardNumber: 'BD/W54-001', cardName: '燈', kindClass: '角色', level: 3 }
  ];
  var catalog = [
    { id: 'BD/W54-010', name: '愛音', kindClass: '角色', level: 3, linkTag: '迷星叫' },
    { id: 'BD/W54-020', name: '立希', kindClass: '角色', level: 1 },
    { id: 'BD/W54-098', name: '迷星叫', kindClass: 'CX' }
  ];
  var rec = WsDeckCreate.buildFavoriteRecommendations(cores, catalog, { 'BD/W54-010': 5 });
  assert.strictEqual(rec.askCxQuestion, true);
  assert.strictEqual(rec.cxQuestion, '想主打哪種 CX？');
  var cards = WsDeckCreate.recommendationsToDeckCards(cores, rec, true);
  var total = WsDeckCreate.deckTotalQty(cards);
  assert.ok(total < 50, '推薦不應偽裝成完整 50 張');
  var miss = WsDeckCreate.missingSlots(cards);
  assert.strictEqual(miss, 50 - total);
  var slots = WsDeckCreate.buildEmptySlotPlaceholders(miss);
  assert.strictEqual(slots.length, miss);
  assert.ok(slots[0].placeholder);
  var meta = WsDeckCreate.buildCreateMetaFavorites(cores, miss);
  assert.strictEqual(meta.showEmptySlots, true);
  assert.ok(WsDeckCreate.formatSourceRow(meta).indexOf('還缺 ' + miss + ' 張') >= 0);
});

test('無公開牌表時 index 判定為 false', function () {
  var index = { prefixes: { BD: { decks: 205 }, ZZ: { decks: 0 } } };
  assert.strictEqual(WsDeckCreate.prefixHasOfficialDecks(index, 'BD'), true);
  assert.strictEqual(WsDeckCreate.prefixHasOfficialDecks(index, 'ZZ'), false);
  assert.strictEqual(WsDeckCreate.prefixHasOfficialDecks(index, 'NOPE'), false);
});

console.log(passed + ' tests passed');
