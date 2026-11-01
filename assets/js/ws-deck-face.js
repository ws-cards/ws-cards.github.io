/*!
 * Shared Weiss Schwarz card-face fingerprint helpers for deck photo tools.
 * algo: rgb-grid-v1 (keep in sync with scripts/build_face_index.py)
 */
(function (global) {
  'use strict';

  var FACE_ALGO = 'rgb-grid-v1';
  var FACE_INDEX_GCS_BASE =
    'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/face-index/';
  var FACE_INDEX_LOCAL_BASE = './json/face-index/';
  /** @deprecated use FACE_INDEX_GCS_BASE / FACE_INDEX_LOCAL_BASE; kept as primary (GCS) for callers */
  var FACE_INDEX_BASE = FACE_INDEX_GCS_BASE;
  var CONTENT_WS_BASE = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/content/ws/';
  var CARD_TITLE_URL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardTitle.json';
  var IMG_BASE = 'https://imgs.devilfox.net/ws/';
  var WS_CARD_IMAGE_BASE = 'https://ws-tcg.com/wordpress/wp-content/images/cardlist';

  function faceIndexBases() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('faceIndex') === 'local') return [FACE_INDEX_LOCAL_BASE];
      if (q.get('faceIndex') === 'gcs') return [FACE_INDEX_GCS_BASE];
    } catch (e) { /* ignore */ }
    // 預設：GCP 優先，失敗再回退站內
    return [FACE_INDEX_GCS_BASE, FACE_INDEX_LOCAL_BASE];
  }

  async function fetchFaceIndexJson(relativePath, bases) {
    var list = bases || faceIndexBases();
    var lastErr = null;
    for (var i = 0; i < list.length; i++) {
      var base = list[i];
      try {
        var res = await fetch(base + relativePath, { cache: 'no-cache' });
        if (!res.ok) {
          lastErr = new Error('HTTP ' + res.status + ' @ ' + base + relativePath);
          continue;
        }
        return { data: await res.json(), base: base, url: base + relativePath };
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('無法載入 ' + relativePath);
  }

  var FP_W = 48;
  var FP_H = 66;
  var FP_COLS = 6;
  var FP_ROWS = 8;

  var fpCanvas = null;

  function ensureFpCanvas() {
    if (fpCanvas) return fpCanvas;
    fpCanvas = document.createElement('canvas');
    fpCanvas.width = FP_W;
    fpCanvas.height = FP_H;
    return fpCanvas;
  }

  function normalizeCardNo(cardNo) {
    return String(cardNo || '').trim().replace(/\\/g, '/').toUpperCase();
  }

  function looksLikeWSCardNo(s) {
    return /^[A-Z0-9]+\/[A-Z0-9]+-[A-Z0-9]+$/i.test(String(s || '').trim());
  }

  function baseCardNo(cardNo) {
    var m = String(cardNo || '').match(/^([A-Za-z0-9]+\/[A-Za-z0-9]+-\d+)/i);
    return m ? m[1].toUpperCase() : normalizeCardNo(cardNo);
  }

  function buildCardImageUrls(cardNumberDisplay) {
    var cardNum = String(cardNumberDisplay || '').trim();
    if (cardNum.indexOf(' ') >= 0) cardNum = cardNum.substr(0, cardNum.indexOf(' '));
    if (!cardNum || cardNum.indexOf('-') < 0) return { primary: '', fallback: '' };
    var cardFirst = cardNum.substr(0, 1);
    var cardSecond = cardNum.substr(0, cardNum.indexOf('-')).replace('/', '_');
    var cardThird = cardNum.replace('/', '_').replace('-', '_');
    return {
      primary: IMG_BASE + cardSecond.toLowerCase() + '/' + cardThird.toLowerCase() + '.png',
      fallback: WS_CARD_IMAGE_BASE + '/' +
        cardFirst.toLowerCase() + '/' + cardSecond.toLowerCase() + '/' + cardThird.toLowerCase() + '.png'
    };
  }

  function normalizeVec(vec) {
    var sum = 0;
    for (var i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
    var n = Math.sqrt(sum) || 1;
    var out = new Float32Array(vec.length);
    for (var j = 0; j < vec.length; j++) out[j] = vec[j] / n;
    return out;
  }

  function cosine(a, b) {
    var n = Math.min(a.length, b.length);
    var s = 0;
    for (var i = 0; i < n; i++) s += a[i] * b[i];
    return s;
  }

  function fingerprintFromImageSource(source, sx, sy, sw, sh) {
    var fp = ensureFpCanvas();
    var ctx = fp.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, FP_W, FP_H);
    if (sx == null) ctx.drawImage(source, 0, 0, FP_W, FP_H);
    else ctx.drawImage(source, sx, sy, sw, sh, 0, 0, FP_W, FP_H);
    var data = ctx.getImageData(0, 0, FP_W, FP_H).data;
    var vec = [];
    var cellW = FP_W / FP_COLS;
    var cellH = FP_H / FP_ROWS;
    for (var ry = 0; ry < FP_ROWS; ry++) {
      for (var cx = 0; cx < FP_COLS; cx++) {
        var r = 0, g = 0, b = 0, n = 0;
        var x0 = Math.floor(cx * cellW);
        var x1 = Math.floor((cx + 1) * cellW);
        var y0 = Math.floor(ry * cellH);
        var y1 = Math.floor((ry + 1) * cellH);
        for (var y = y0; y < y1; y++) {
          for (var x = x0; x < x1; x++) {
            var i = (y * FP_W + x) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
          }
        }
        vec.push(r / n / 255, g / n / 255, b / n / 255);
      }
    }
    var mx0 = Math.floor(FP_W * 0.12);
    var mx1 = Math.floor(FP_W * 0.88);
    var my0 = Math.floor(FP_H * 0.1);
    var my1 = Math.floor(FP_H * 0.72);
    var cr = 0, cg = 0, cb = 0, cn = 0;
    for (var yy = my0; yy < my1; yy++) {
      for (var xx = mx0; xx < mx1; xx++) {
        var ii = (yy * FP_W + xx) * 4;
        cr += data[ii];
        cg += data[ii + 1];
        cb += data[ii + 2];
        cn++;
      }
    }
    vec.push(cr / cn / 255, cg / cn / 255, cb / cn / 255);
    return normalizeVec(vec);
  }

  function reNormalizeFp(arr) {
    return normalizeVec(Array.prototype.slice.call(arr || []));
  }

  function matchFace(queryFp, indexCards, topK) {
    var scored = [];
    for (var i = 0; i < indexCards.length; i++) {
      var c = indexCards[i];
      if (!c || !c.fp) continue;
      scored.push({ card: c, score: cosine(queryFp, c.fp) });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, topK || 5);
  }

  async function loadSeriesTitles() {
    var res = null;
    try {
      res = await fetch(CARD_TITLE_URL);
      if (!res.ok) res = null;
    } catch (e) {
      res = null;
    }
    if (!res) {
      res = await fetch('./cardTitle.json');
    }
    if (!res || !res.ok) throw new Error('無法載入系列清單');
    var seriesMap = await res.json();
    var seriesList = Object.keys(seriesMap).map(function (code) {
      return { code: code, label: seriesMap[code] || code, titleCode: code.replace('/', '_') };
    }).sort(function (a, b) { return a.code.localeCompare(b.code); });
    return { seriesMap: seriesMap, seriesList: seriesList };
  }

  async function loadFaceIndexMeta() {
    var byCode = {};
    var sources = [];
    var bases = faceIndexBases();
    for (var i = 0; i < bases.length; i++) {
      var base = bases[i];
      try {
        var res = await fetch(base + 'meta.json', { cache: 'no-cache' });
        if (!res.ok) continue;
        var meta = await res.json();
        sources.push({ base: base, meta: meta });
        (meta.series || []).forEach(function (row) {
          if (!row || !row.code) return;
          // 略過與前端算法不符者（例如 GCP 上殘留的 mean-gray-grid）
          if (row.algo && row.algo !== FACE_ALGO) return;
          var code = String(row.code);
          var next = Object.assign({}, row, { _base: base });
          // 同系列兩來源：先讀到的優先（預設 GCS → local）
          if (!byCode[code]) byCode[code] = next;
        });
      } catch (e) {
        /* try next base */
      }
    }
    if (!sources.length) return { meta: null, byCode: byCode, sources: sources };
    return {
      meta: {
        version: 1,
        algo: FACE_ALGO,
        sources: sources.map(function (s) { return s.base; }),
        series: Object.keys(byCode).sort().map(function (k) { return byCode[k]; })
      },
      byCode: byCode,
      sources: sources
    };
  }

  async function loadStaticIndex(seriesCode, titleCode, metaByCode) {
    var metaRow = metaByCode && metaByCode[seriesCode];
    var fileName = (metaRow && metaRow.file) || (titleCode + '.json');
    var preferred = metaRow && metaRow._base;
    var bases = faceIndexBases().slice();
    if (preferred) {
      bases = [preferred].concat(bases.filter(function (b) { return b !== preferred; }));
    }
    var got = null;
    var lastErr = null;
    for (var i = 0; i < bases.length; i++) {
      try {
        var res = await fetch(bases[i] + fileName, { cache: 'no-cache' });
        if (!res.ok) {
          lastErr = new Error('HTTP ' + res.status);
          continue;
        }
        var data = await res.json();
        if (data.algo && data.algo !== FACE_ALGO) {
          lastErr = new Error('靜態索引算法不符（' + data.algo + '，需要 ' + FACE_ALGO + '）');
          continue;
        }
        got = { data: data, base: bases[i] };
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!got) {
      throw lastErr || new Error('找不到預建索引 ' + fileName);
    }
    var data = got.data;
    var indexCards = [];
    (data.cards || []).forEach(function (c) {
      if (!c || !c.cardNo || !c.fp || !c.fp.length) return;
      var no = normalizeCardNo(c.cardNo);
      indexCards.push({
        cardNo: no,
        name: c.name || no,
        kindLabel: c.kindLabel || '',
        kind: c.kind,
        level: c.level != null ? Number(c.level) : null,
        color: c.color || '',
        imageUrl: c.imageUrl || buildCardImageUrls(no).primary,
        fp: reNormalizeFp(c.fp)
      });
    });
    if (!indexCards.length) throw new Error('靜態索引沒有可用卡面');
    return { indexCards: indexCards, payload: data, base: got.base };
  }

  global.WsDeckFace = {
    FACE_ALGO: FACE_ALGO,
    FACE_INDEX_BASE: FACE_INDEX_BASE,
    FACE_INDEX_GCS_BASE: FACE_INDEX_GCS_BASE,
    FACE_INDEX_LOCAL_BASE: FACE_INDEX_LOCAL_BASE,
    CONTENT_WS_BASE: CONTENT_WS_BASE,
    CARD_TITLE_URL: CARD_TITLE_URL,
    FP_W: FP_W,
    FP_H: FP_H,
    normalizeCardNo: normalizeCardNo,
    looksLikeWSCardNo: looksLikeWSCardNo,
    baseCardNo: baseCardNo,
    buildCardImageUrls: buildCardImageUrls,
    fingerprintFromImageSource: fingerprintFromImageSource,
    matchFace: matchFace,
    loadSeriesTitles: loadSeriesTitles,
    loadFaceIndexMeta: loadFaceIndexMeta,
    loadStaticIndex: loadStaticIndex,
    fetchFaceIndexJson: fetchFaceIndexJson
  };
})(window);
