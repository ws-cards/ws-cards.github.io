/*!
 * Shared Weiss Schwarz card-face fingerprint helpers for deck photo tools.
 * algo: norm-grad-v1 (keep in sync with scripts/build_face_index.py)
 *
 * Why not rgb-grid-v1:
 *   Absolute RGB cell means collapse under phone WB / exposure / glare.
 * norm-grad-v1 uses:
 *   - global luminance z-score (exposure invariant structure)
 *   - per-cell |gx|,|gy| (edge layout)
 *   - rg chromaticity (color without brightness)
 */
(function (global) {
  'use strict';

  var FACE_ALGO = 'norm-grad-v1';
  var FACE_INDEX_GCS_BASE =
    'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/face-index/';
  var FACE_INDEX_LOCAL_BASE = './json/face-index/';
  /** @deprecated use FACE_INDEX_GCS_BASE / FACE_INDEX_LOCAL_BASE; kept as primary (GCS) for callers */
  var FACE_INDEX_BASE = FACE_INDEX_GCS_BASE;
  var CONTENT_WS_BASE = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/content/ws/';
  var CARD_TITLE_URL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardTitle.json';
  var IMG_BASE = 'https://imgs.devilfox.net/ws/';
  var WS_CARD_IMAGE_BASE = 'https://ws-tcg.com/wordpress/wp-content/images/cardlist';

  var FP_W = 48;
  var FP_H = 66;
  var FP_COLS = 6;
  var FP_ROWS = 8;
  var FP_CELL_FEATS = 5; // Yz, |gx|, |gy|, Cr, Cg
  var FP_DIMS = FP_COLS * FP_ROWS * FP_CELL_FEATS + FP_CELL_FEATS; // 245

  var fpCanvas = null;

  function faceIndexBases() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('faceIndex') === 'local') return [FACE_INDEX_LOCAL_BASE];
      if (q.get('faceIndex') === 'gcs') return [FACE_INDEX_GCS_BASE];
    } catch (e) { /* ignore */ }
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

  function regionFeats(Yz, Gx, Gy, Cr, Cg, x0, x1, y0, y1) {
    var my = 0, mgx = 0, mgy = 0, mcr = 0, mcg = 0, n = 0;
    for (var y = y0; y < y1; y++) {
      var row = y * FP_W;
      for (var x = x0; x < x1; x++) {
        var i = row + x;
        my += Yz[i];
        mgx += Gx[i];
        mgy += Gy[i];
        mcr += Cr[i];
        mcg += Cg[i];
        n++;
      }
    }
    var inv = 1 / Math.max(n, 1);
    return [my * inv, mgx * inv, mgy * inv, mcr * inv, mcg * inv];
  }

  function fingerprintFromImageSource(source, sx, sy, sw, sh) {
    var fp = ensureFpCanvas();
    var ctx = fp.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, FP_W, FP_H);
    if (sx == null) ctx.drawImage(source, 0, 0, FP_W, FP_H);
    else ctx.drawImage(source, sx, sy, sw, sh, 0, 0, FP_W, FP_H);
    var data = ctx.getImageData(0, 0, FP_W, FP_H).data;
    var nPix = FP_W * FP_H;
    var Y = new Float32Array(nPix);
    var Cr = new Float32Array(nPix);
    var Cg = new Float32Array(nPix);
    var i, p, r, g, b, s, meanY, varY, stdY;
    meanY = 0;
    for (i = 0; i < nPix; i++) {
      p = i * 4;
      r = data[p] / 255;
      g = data[p + 1] / 255;
      b = data[p + 2] / 255;
      Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      s = r + g + b + 1e-6;
      Cr[i] = r / s;
      Cg[i] = g / s;
      meanY += Y[i];
    }
    meanY /= nPix;
    varY = 0;
    for (i = 0; i < nPix; i++) {
      var d = Y[i] - meanY;
      varY += d * d;
    }
    stdY = Math.sqrt(varY / nPix) + 1e-6;

    var Yz = new Float32Array(nPix);
    var Gx = new Float32Array(nPix);
    var Gy = new Float32Array(nPix);
    for (i = 0; i < nPix; i++) {
      var z = (Y[i] - meanY) / stdY;
      if (z > 3) z = 3;
      else if (z < -3) z = -3;
      Yz[i] = z / 3;
    }
    for (var y = 0; y < FP_H; y++) {
      for (var x = 0; x < FP_W; x++) {
        i = y * FP_W + x;
        var xm = x > 0 ? x - 1 : x;
        var xp = x < FP_W - 1 ? x + 1 : x;
        var ym = y > 0 ? y - 1 : y;
        var yp = y < FP_H - 1 ? y + 1 : y;
        Gx[i] = Math.abs(Yz[y * FP_W + xp] - Yz[y * FP_W + xm]);
        Gy[i] = Math.abs(Yz[yp * FP_W + x] - Yz[ym * FP_W + x]);
      }
    }

    var vec = [];
    var cellW = FP_W / FP_COLS;
    var cellH = FP_H / FP_ROWS;
    for (var ry = 0; ry < FP_ROWS; ry++) {
      for (var cx = 0; cx < FP_COLS; cx++) {
        var x0 = Math.floor(cx * cellW);
        var x1 = Math.floor((cx + 1) * cellW);
        var y0 = Math.floor(ry * cellH);
        var y1 = Math.floor((ry + 1) * cellH);
        vec.push.apply(vec, regionFeats(Yz, Gx, Gy, Cr, Cg, x0, x1, y0, y1));
      }
    }
    vec.push.apply(vec, regionFeats(
      Yz, Gx, Gy, Cr, Cg,
      Math.floor(FP_W * 0.12), Math.floor(FP_W * 0.88),
      Math.floor(FP_H * 0.1), Math.floor(FP_H * 0.72)
    ));
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
          if (row.algo && row.algo !== FACE_ALGO) return;
          var code = String(row.code);
          var next = Object.assign({}, row, { _base: base });
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
    FP_COLS: FP_COLS,
    FP_ROWS: FP_ROWS,
    FP_DIMS: FP_DIMS,
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
