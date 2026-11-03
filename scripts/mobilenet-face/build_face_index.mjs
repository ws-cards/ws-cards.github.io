#!/usr/bin/env node
/**
 * Build face-index JSON with @tensorflow-models/mobilenet (v2, alpha=1.0).
 * Must stay in sync with assets/js/ws-deck-face.js (algo=mobilenetv2-gap-v1).
 *
 * Usage:
 *   node scripts/mobilenet-face/build_face_index.mjs --series BD/W54
 *   node scripts/mobilenet-face/build_face_index.mjs --series HOL/W91 --concurrency 4
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Prefer native tfjs-node when available (much faster builds)
try {
  await import('@tensorflow/tfjs-node');
} catch (_) {
  /* fall back to pure-js tfjs */
}
import tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const ALGO = 'mobilenetv2-gap-v1';
const VERSION = 1;
const INPUT = 224;
const DIMS = 1280;
const CONTENT_WS_BASE =
  'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/content/ws/';
const IMG_BASE = 'https://imgs.devilfox.net/ws/';
const WS_CARD_IMAGE_BASE = 'https://ws-tcg.com/wordpress/wp-content/images/cardlist';
const UA = 'ws-cards-face-index-mobilenet/1.0';

const CARD_NO_RE = /^[A-Za-z0-9]+\/[A-Za-z0-9]+-[A-Za-z0-9]+$/;
const BASE_NO_RE = /^([A-Za-z0-9]+\/[A-Za-z0-9]+-\d+)/i;
const KIND_GCS = { '0': '角色', '1': '事件', '2': 'CX' };
const KIND_DECKLOG = { '2': '角色', '3': '事件', '4': 'CX' };

function parseArgs(argv) {
  const out = { series: null, outDir: path.join(ROOT, 'json/face-index'), concurrency: 4, limit: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--series') out.series = argv[++i];
    else if (a === '--out-dir') out.outDir = path.resolve(argv[++i]);
    else if (a === '--concurrency') out.concurrency = Math.max(1, Number(argv[++i]) || 4);
    else if (a === '--limit') out.limit = Math.max(0, Number(argv[++i]) || 0);
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function normalizeSeries(raw) {
  let s = String(raw || '').trim().replace(/\\/g, '/');
  if (s.includes('_') && !s.includes('/')) s = s.replace('_', '/');
  const parts = s.split('/');
  if (parts.length !== 2) throw new Error(`系列代碼格式錯誤：${raw}（例：BD/W54）`);
  const code = `${parts[0]}/${parts[1]}`;
  return { code, titleCode: code.replace('/', '_') };
}

function normalizeCardNo(cardNo) {
  return String(cardNo || '').trim().replace(/\\/g, '/').toUpperCase();
}

function looksLikeWs(cardNo) {
  return CARD_NO_RE.test(String(cardNo || '').trim());
}

function kindLabelOf(raw) {
  if (!raw || typeof raw !== 'object') return '';
  const k = raw.kind ?? raw.cardkind;
  const key = k == null ? '' : String(k);
  return KIND_GCS[key] || KIND_DECKLOG[key] || '';
}

function buildImageUrls(cardNumber) {
  let cardNum = String(cardNumber || '').trim();
  if (cardNum.includes(' ')) cardNum = cardNum.split(' ')[0];
  if (!cardNum || !cardNum.includes('-')) return { primary: '', fallback: '' };
  const cardFirst = cardNum[0];
  const cardSecond = cardNum.slice(0, cardNum.indexOf('-')).replace('/', '_');
  const cardThird = cardNum.replace('/', '_').replace('-', '_');
  return {
    primary: `${IMG_BASE}${cardSecond.toLowerCase()}/${cardThird.toLowerCase()}.png`,
    fallback:
      `${WS_CARD_IMAGE_BASE}/` +
      `${cardFirst.toLowerCase()}/${cardSecond.toLowerCase()}/${cardThird.toLowerCase()}.png`,
  };
}

async function httpGetJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function httpGetBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadSetPayload(titleCode) {
  const remote = `${CONTENT_WS_BASE}${titleCode}.json`;
  const local = path.join(ROOT, 'json', `${titleCode}.json`);
  try {
    return await httpGetJson(remote);
  } catch (err) {
    if (fs.existsSync(local)) return JSON.parse(fs.readFileSync(local, 'utf8'));
    throw new Error(`無法載入卡表 ${titleCode}: ${err.message || err}`);
  }
}

function indexSetPayload(data) {
  const byId = {};
  if (!data || typeof data !== 'object') return byId;
  if (Array.isArray(data.cards)) {
    for (const c of data.cards) {
      if (!c || typeof c !== 'object') continue;
      const cid = c.id || c.cardno;
      if (cid) byId[String(cid)] = c;
    }
    return byId;
  }
  for (const [k, v] of Object.entries(data)) {
    if (k === 'metadata') continue;
    byId[String(k)] = v;
  }
  return byId;
}

function pickIndexCards(byId) {
  const rows = [];
  const seen = new Set();
  for (const [cid, raw] of Object.entries(byId)) {
    const cardNo = normalizeCardNo(cid);
    if (!looksLikeWs(cardNo) || seen.has(cardNo)) continue;
    seen.add(cardNo);
    let level = raw && typeof raw === 'object' ? raw.level ?? raw.cardlevel : null;
    let levelN = null;
    if (level != null && String(level) !== '') {
      const n = Number(level);
      if (!Number.isNaN(n)) levelN = n;
    }
    rows.push({
      cardNo,
      name: (raw && (raw.name || raw.cardname)) || cardNo,
      kindLabel: kindLabelOf(raw),
      kind: raw && raw.kind,
      level: levelN,
      color: (raw && (raw.color || raw.cardcolor)) || '',
    });
  }
  rows.sort((a, b) => a.cardNo.localeCompare(b.cardNo));
  return rows;
}

function l2Normalize(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i];
  const n = Math.sqrt(sum) || 1;
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = Math.round((arr[i] / n) * 1e6) / 1e6;
  return out;
}

async function loadRgb224(buf) {
  const { data, info } = await sharp(buf)
    .rotate() // honor EXIF
    .resize(INPUT, INPUT, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== INPUT || info.height !== INPUT || info.channels !== 3) {
    throw new Error(`unexpected sharp output ${info.width}x${info.height}x${info.channels}`);
  }
  return data; // Uint8Array RGB
}

async function embedRgb(model, rgbBuf) {
  return tf.tidy(() => {
    const input = tf.tensor3d(rgbBuf, [INPUT, INPUT, 3]);
    const emb = model.infer(input, true);
    return emb;
  });
}

async function fingerprintBuffer(model, buf) {
  const rgb = await loadRgb224(buf);
  const emb = await embedRgb(model, rgb);
  const data = await emb.data();
  emb.dispose();
  if (data.length !== DIMS) throw new Error(`bad dims ${data.length}`);
  return l2Normalize(Array.from(data));
}

async function loadCardImage(cardNo) {
  const { primary, fallback } = buildImageUrls(cardNo);
  let lastErr = null;
  for (const url of [primary, fallback].filter(Boolean)) {
    try {
      const buf = await httpGetBuffer(url);
      return { buf, url };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('image load failed');
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
      done++;
      if (done % 20 === 0 || done === items.length) {
        process.stdout.write(`  progress ${done}/${items.length}\n`);
      }
    }
  }
  const n = Math.min(concurrency, items.length || 1);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

function updateMeta(metaPath, entry, fpMeta) {
  let meta = { version: VERSION, algo: ALGO, fp: fpMeta, series: [] };
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch (_) { /* replace */ }
  }
  meta.version = VERSION;
  meta.algo = ALGO;
  meta.fp = fpMeta;
  meta.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  let series = Array.isArray(meta.series) ? meta.series : [];
  series = series.filter((s) => s && s.code !== entry.code);
  series.push(entry);
  series.sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
  meta.series = series;
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.series) {
    console.log(`Usage: node scripts/mobilenet-face/build_face_index.mjs --series BD/W54 [--concurrency 4] [--limit 0]`);
    process.exit(args.help ? 0 : 1);
  }

  const { code: seriesCode, titleCode } = normalizeSeries(args.series);
  const outDir = args.outDir;
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${titleCode}.json`);
  const metaPath = path.join(outDir, 'meta.json');

  console.log(`algo=${ALGO} series=${seriesCode} titleCode=${titleCode}`);
  await tf.ready();
  console.log(`tf backend=${tf.getBackend()}`);
  const model = await mobilenet.load({ version: 2, alpha: 1.0 });
  console.log('mobilenet v2 loaded');

  const data = await loadSetPayload(titleCode);
  let cards = pickIndexCards(indexSetPayload(data));
  if (args.limit > 0) cards = cards.slice(0, args.limit);
  if (!cards.length) throw new Error('此系列沒有可用卡號');
  console.log(`cards to index: ${cards.length}`);

  const t0 = Date.now();
  let failed = 0;
  const built = [];
  const rows = await mapPool(cards, args.concurrency, async (card) => {
    try {
      const { buf, url } = await loadCardImage(card.cardNo);
      const fp = await fingerprintBuffer(model, buf);
      const out = {
        cardNo: card.cardNo,
        name: card.name || card.cardNo,
        kindLabel: card.kindLabel || '',
        imageUrl: url,
        fp,
      };
      if (card.level != null) out.level = card.level;
      if (card.color) out.color = card.color;
      if (card.kind != null) out.kind = card.kind;
      return out;
    } catch (err) {
      failed++;
      console.error(`  skip ${card.cardNo}: ${err.message || err}`);
      return null;
    }
  });
  for (const row of rows) if (row) built.push(row);
  built.sort((a, b) => a.cardNo.localeCompare(b.cardNo));
  if (!built.length) throw new Error('沒有成功建立任何指紋');

  const fpMeta = { w: INPUT, h: INPUT, dims: DIMS, backbone: 'mobilenet-v2-1.0', package: '@tensorflow-models/mobilenet@2' };
  const builtAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const payload = {
    series: seriesCode,
    titleCode,
    version: VERSION,
    algo: ALGO,
    fp: fpMeta,
    builtAt,
    cardCount: built.length,
    skipped: failed,
    cards: built,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload) + '\n');
  updateMeta(
    metaPath,
    {
      code: seriesCode,
      titleCode,
      file: `${titleCode}.json`,
      cards: built.length,
      skipped: failed,
      builtAt,
      algo: ALGO,
      version: VERSION,
    },
    fpMeta
  );

  const sizeKb = fs.statSync(outPath).size / 1024;
  console.log(
    `wrote ${path.relative(ROOT, outPath)} (${sizeKb.toFixed(1)} KiB), ` +
      `ok=${built.length} skip=${failed} in ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
