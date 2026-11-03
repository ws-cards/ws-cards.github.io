/*!
 * Shared Weiss Schwarz card-face fingerprint helpers for deck photo tools.
 * algo: mobilenetv2-gap-v1
 *   - @tensorflow-models/mobilenet v2 alpha=1.0
 *   - 224x224, preprocess x/127.5-1 (handled by the package)
 *   - 1280-D GAP embedding → L2-normalize → cosine
 * Must stay in sync with scripts/mobilenet-face/build_face_index.mjs
 */
(function (global) {
  'use strict';

  var FACE_ALGO = 'mobilenetv2-gap-v1';
  var FACE_INDEX_GCS_BASE =
    'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/face-index/';
  var FACE_INDEX_LOCAL_BASE = './json/face-index/';
  /** @deprecated use FACE_INDEX_GCS_BASE / FACE_INDEX_LOCAL_BASE; kept as primary (GCS) for callers */
  var FACE_INDEX_BASE = FACE_INDEX_GCS_BASE;
  var CONTENT_WS_BASE = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/content/ws/';
  var CARD_TITLE_URL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardTitle.json';
  var IMG_BASE = 'https://imgs.devilfox.net/ws/';
  var WS_CARD_IMAGE_BASE = 'https://ws-tcg.com/wordpress/wp-content/images/cardlist';

  var TFJS_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  var MOBILENET_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js';
  var FP_INPUT = 224;
  var FP_DIMS = 1280;

  var mobilenetModel = null;
  var modelLoading = null;
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

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-ws-face-src="' + src + '"]');
      if (existing) {
        if (existing.getAttribute('data-ws-face-loaded') === '1') resolve();
        else existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('script ' + src)); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.setAttribute('data-ws-face-src', src);
      s.onload = function () {
        s.setAttribute('data-ws-face-loaded', '1');
        resolve();
      };
      s.onerror = function () { reject(new Error('無法載入 ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureFpCanvas() {
    if (fpCanvas) return fpCanvas;
    fpCanvas = document.createElement('canvas');
    fpCanvas.width = FP_INPUT;
    fpCanvas.height = FP_INPUT;
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

  async function ensureMobilenet() {
    if (mobilenetModel) return mobilenetModel;
    if (modelLoading) return modelLoading;
    modelLoading = (async function () {
      if (!global.tf) await loadScriptOnce(TFJS_URL);
      if (!global.mobilenet) await loadScriptOnce(MOBILENET_URL);
      await global.tf.ready();
      mobilenetModel = await global.mobilenet.load({ version: 2, alpha: 1.0 });
      return mobilenetModel;
    })();
    try {
      return await modelLoading;
    } finally {
      modelLoading = null;
    }
  }

  /**
   * Async MobileNet embedding. Optional sx,sy,sw,sh crop from source.
   * @returns {Promise<Float32Array>}
   */
  async function fingerprintFromImageSource(source, sx, sy, sw, sh) {
    var model = await ensureMobilenet();
    var canvas = ensureFpCanvas();
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, FP_INPUT, FP_INPUT);
    if (sx == null) {
      ctx.drawImage(source, 0, 0, FP_INPUT, FP_INPUT);
    } else {
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, FP_INPUT, FP_INPUT);
    }
    var emb = model.infer(canvas, true);
    var data = await emb.data();
    emb.dispose();
    if (data.length !== FP_DIMS) {
      throw new Error('MobileNet 維度異常：' + data.length);
    }
    return normalizeVec(Array.prototype.slice.call(data));
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
    FP_INPUT: FP_INPUT,
    FP_DIMS: FP_DIMS,
    FP_W: FP_INPUT,
    FP_H: FP_INPUT,
    normalizeCardNo: normalizeCardNo,
    looksLikeWSCardNo: looksLikeWSCardNo,
    baseCardNo: baseCardNo,
    buildCardImageUrls: buildCardImageUrls,
    ensureMobilenet: ensureMobilenet,
    fingerprintFromImageSource: fingerprintFromImageSource,
    matchFace: matchFace,
    cosine: cosine,
    loadSeriesTitles: loadSeriesTitles,
    loadFaceIndexMeta: loadFaceIndexMeta,
    loadStaticIndex: loadStaticIndex,
    fetchFaceIndexJson: fetchFaceIndexJson
  };
})(window);
