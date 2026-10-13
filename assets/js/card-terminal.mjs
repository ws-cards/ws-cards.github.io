import { getJSON, loadSet, cardImages, pointsFor, quoteFor, sortQuotes, clearDataCache } from './card-terminal-data.mjs';

const element = id => document.getElementById(id);
const money = value => Number.isFinite(value) ? `¥${value.toLocaleString('en-US')}` : '—';
const state = { id: '', card: null, set: null, metric: 'price', months: 12, points: [], cursor: 0, sequence: 0, chart: null, dictionary: [], favorites: [] };
let toastTimer;
let searchTimer;
let requestedId = 'NIK/S117-002EX';
const watch = { records: new Map(), filter: 'all', sort: 'added', generation: 0, loading: false };
const comparison = { selected: new Set(), base: '', chart: null, asOf: null };
const validCardId = id => typeof id === 'string' && /^[A-Z0-9]+\/[A-Z0-9]+-[A-Z0-9+_-]+$/i.test(id);
try {
  const saved = JSON.parse(localStorage.getItem('terminal-favorites') || '[]');
  state.favorites = Array.isArray(saved) ? [...new Map(saved.filter(card => card && validCardId(card.id) && typeof card.name === 'string').map(card => [card.id.toUpperCase(), { id: card.id.toUpperCase(), name: card.name }])).values()] : [];
} catch {}

function text(id, value) { element(id).textContent = value; }
function toast(message) {
  text('toast', message);
  element('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element('toast').hidden = true; }, 3000);
}
function notice(message = '', retry = false) {
  text('notice-text', message);
  element('notice').hidden = !message;
  element('retry-button').hidden = !retry;
}
function imageFor(image, id) {
  const sources = cardImages(id);
  image.onerror = () => {
    if (image.src === sources[0]) image.src = sources[1];
    else {
      image.onerror = null;
      image.style.visibility = 'hidden';
      if (image.id === 'card-image') element('image-failure').hidden = false;
    }
  };
  image.onload = () => { image.style.visibility = ''; };
  image.style.visibility = '';
  image.src = sources[0];
}
function updateFavorites() {
  const selected = state.favorites.some(card => card.id === state.id);
  const button = element('favorite-button');
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', selected ? '取消追蹤' : '加入追蹤');
  button.title = button.getAttribute('aria-label');
  button.firstElementChild.className = selected ? 'fas fa-star' : 'far fa-star';
  text('collection-count', state.favorites.length);
}
function saveFavorites() {
  try { localStorage.setItem('terminal-favorites', JSON.stringify(state.favorites)); }
  catch { toast('瀏覽器無法儲存，收藏僅保留於本次瀏覽。'); }
  updateFavorites();
  renderWatchlist();
}

function makeIconButton(iconName, label, action) {
  const button = document.createElement('button');
  button.className = 'icon-button';
  button.title = label;
  button.setAttribute('aria-label', label);
  const icon = document.createElement('i');
  icon.className = iconName;
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon);
  button.addEventListener('click', action);
  return button;
}

function changeText(value) {
  return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '—';
}

function renderWatchlist() {
  const records = state.favorites.map(card => ({ card, ...watch.records.get(card.id) }));
  text('tracked-total', records.length);
  text('falling-total', records.filter(record => record.quote?.change < 0).length);
  text('stock-total', records.filter(record => record.quote?.stock > 0).length);
  const ready = records.filter(record => record.status === 'ready').length;
  const unavailable = records.filter(record => record.status === 'error' || record.status === 'partial').length;
  text('watch-status', watch.loading ? `正在更新 ${ready} / ${records.length} 張` : records.length ? `${ready} 張資料完整${unavailable ? ` · ${unavailable} 張資料不完整或無法載入` : ''}` : '本機儲存 · 未加入任何卡片');
  element('refresh-watchlist').disabled = watch.loading || !records.length;
  element('watchlist').setAttribute('aria-busy', String(watch.loading));
  const visible = sortQuotes(records.filter(record => watch.filter === 'all' || (watch.filter === 'falling' ? record.quote?.change < 0 : record.quote?.stock > 0)), watch.sort);
  element('watch-empty').hidden = records.length > 0;
  element('watch-table-wrap').hidden = !visible.length;
  element('filter-empty').hidden = !records.length || !!visible.length;
  element('watch-rows').replaceChildren(...visible.map(record => {
    const row = document.createElement('tr');
    row.dataset.id = record.card.id;
    const identity = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'watch-card';
    const image = document.createElement('img');
    image.alt = '';
    image.loading = 'lazy';
    imageFor(image, record.card.id);
    const info = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = record.card.name;
    const code = document.createElement('small');
    code.textContent = `${record.card.id}${record.card.rarity ? ` · ${record.card.rarity}` : ''}`;
    info.append(name, code);
    button.append(image, info);
    button.addEventListener('click', () => selectCard(record.card.id));
    identity.append(button);
    row.append(identity);
    const quote = record.quote;
    const cells = [
      ['最新售價', quote ? money(quote.price) : record.status === 'error' ? '載入失敗' : '載入中', 'row-price'],
      ['近 7 日', changeText(quote?.change), `row-change ${quote?.change > 0 ? 'up' : quote?.change < 0 ? 'down' : ''}`],
      ['庫存', Number.isFinite(quote?.stock) ? `${quote.stock} 張` : '—', 'row-stock'],
      ['報價日期', quote?.date || '—', 'row-date']
    ];
    for (const [label, value, className] of cells) {
      const cell = document.createElement('td');
      cell.dataset.label = label;
      cell.className = className;
      cell.textContent = value;
      if (className === 'row-stock') cell.title = quote?.stockDate ? `庫存資料日 ${quote.stockDate}` : '無庫存資料';
      row.append(cell);
    }
    const actions = document.createElement('td');
    actions.className = 'row-actions';
    actions.append(makeIconButton('fas fa-columns', `比較 ${record.card.id} 的稀有度`, () => selectCard(record.card.id, true)), makeIconButton('far fa-trash-alt', `取消追蹤 ${record.card.id}`, () => {
      state.favorites = state.favorites.filter(card => card.id !== record.card.id);
      saveFavorites();
      element('add-watch').focus({ preventScroll: true });
    }));
    row.append(actions);
    return row;
  }));
}

async function refreshWatchlist(fresh = false) {
  const generation = ++watch.generation;
  if (fresh) { clearDataCache(); watch.records.clear(); }
  watch.loading = true;
  renderWatchlist();
  const queue = [...state.favorites];
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length && generation === watch.generation) {
      const saved = queue.shift();
      try {
        const set = await loadSet(saved.id);
        if (generation !== watch.generation) return;
        const card = set.cards.find(item => item.id === saved.id) || saved;
        const quote = quoteFor(set, saved.id);
        watch.records.set(saved.id, { card, quote, status: set.incomplete || quote.price === null || quote.stock === null ? 'partial' : 'ready' });
      } catch {
        if (generation !== watch.generation) return;
        watch.records.set(saved.id, { card: saved, status: 'error' });
      }
      renderWatchlist();
    }
  }));
  if (generation === watch.generation) { watch.loading = false; renderWatchlist(); }
}
function latestPoints(type) {
  return pointsFor(state.set?.[type === 'price' ? 'prices' : 'stocks']?.[state.id], 'cardPrice');
}
function renderQuote() {
  const prices = latestPoints('price');
  const stocks = latestPoints('stock');
  const latest = prices.at(-1);
  const price = element('current-price');
  price.replaceChildren();
  if (latest) {
    const currency = document.createElement('span');
    currency.className = 'currency';
    currency.textContent = '¥';
    price.append(currency, latest.value.toLocaleString('en-US'));
  } else price.textContent = '—';
  text('as-of', latest?.date || '無價格資料');
  const end = latest ? Date.parse(latest.date) : Date.now();
  const recent = prices.filter(point => Date.parse(point.date) >= end - 30 * 86400000);
  text('high-price', recent.length ? money(Math.max(...recent.map(point => point.value))) : '—');
  text('low-price', recent.length ? money(Math.min(...recent.map(point => point.value))) : '—');
  const before = prices.filter(point => Date.parse(point.date) <= end - 7 * 86400000).at(-1);
  const change = before?.value > 0 && latest ? (latest.value / before.value - 1) * 100 : null;
  text('week-change', change === null ? '—' : `${change > 0 ? '↗ +' : change < 0 ? '↘ ' : '→ '}${change.toFixed(1)}%`);
  element('week-change').className = `change-badge${change > 0 ? ' up' : change < 0 ? ' down' : ''}`;
  text('current-stock', stocks.length ? `庫存 ${stocks.at(-1).value} 張` : '庫存 —');
  element('current-stock').title = stocks.length ? `庫存資料日 ${stocks.at(-1).date}` : '無庫存資料';
}
function variants() {
  const base = state.id.match(/^(.+-\d+)/)?.[1] || state.id;
  return state.set.cards.filter(card => (card.id.match(/^(.+-\d+)/)?.[1] || card.id) === base);
}
function renderVariants(reset = false) {
  const cards = variants();
  text('variant-count', ` / ${String(cards.length).padStart(2, '0')}`);
  if (reset) {
    element('rarity-filter').replaceChildren(new Option('全部稀有度', 'all'), ...[...new Set(cards.map(card => card.rarity))].map(rarity => new Option(rarity, rarity)));
    comparison.selected = new Set([state.id, ...cards.map(card => card.id).filter(id => id !== state.id)].filter(id => cards.some(card => card.id === id)).slice(0, 2));
  }
  const filter = element('rarity-filter').value;
  element('variants-track').replaceChildren(...cards.filter(card => filter === 'all' || card.rarity === filter).map(card => {
    const button = document.createElement('label');
    button.className = 'variant';
    button.classList.toggle('selected', comparison.selected.has(card.id));
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = card.id;
    checkbox.checked = comparison.selected.has(card.id);
    checkbox.setAttribute('aria-label', `比較 ${card.rarity} ${card.id}`);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) comparison.selected.add(card.id);
      else comparison.selected.delete(card.id);
      button.classList.toggle('selected', checkbox.checked);
      updateComparisonSelection();
    });
    const image = document.createElement('img');
    image.alt = card.name;
    image.loading = 'lazy';
    imageFor(image, card.id);
    const info = document.createElement('div');
    info.className = 'variant-info';
    const rarity = document.createElement('span');
    rarity.textContent = card.rarity;
    const price = document.createElement('strong');
    price.textContent = money(pointsFor(state.set.prices[card.id], 'cardPrice').at(-1)?.value);
    const suffix = document.createElement('small');
    suffix.textContent = card.id === state.id ? '目前版本' : card.id.split('-').at(-1);
    info.append(rarity, price, suffix);
    button.append(checkbox, image, info);
    return button;
  }));
  if (!cards.length) text('variants-track', '暫無其他版本資料');
  updateComparisonSelection();
}

function updateComparisonSelection() {
  const count = comparison.selected.size;
  text('comparison-selection', `已選 ${count} / 3 個版本`);
  element('open-comparison').disabled = count < 2;
  element('variants-track').querySelectorAll('input').forEach(input => { input.disabled = count >= 3 && !input.checked; });
}

function comparisonCards() {
  return [...comparison.selected].map(id => state.set.cards.find(card => card.id === id)).filter(Boolean);
}

function openComparison() {
  const cards = comparisonCards();
  if (cards.length < 2) { toast('此卡沒有兩種可比較的版本。'); return; }
  comparison.base = cards[0].id;
  const dates = cards.map(card => quoteFor(state.set, card.id).date).filter(Boolean).sort();
  comparison.asOf = dates[0] || null;
  text('comparison-title', state.card.name);
  text('comparison-asof', comparison.asOf ? `共同截止日 ${comparison.asOf}` : '目前沒有價格紀錄');
  element('comparison-baseline').replaceChildren(...cards.map(card => new Option(`${card.rarity} · ${card.id.split('-').at(-1)}`, card.id)));
  element('comparison-dialog').showModal();
  renderComparison();
}

function renderComparison() {
  const cards = comparisonCards();
  const base = quoteFor(state.set, comparison.base, comparison.asOf);
  element('comparison-grid').style.setProperty('--comparison-count', cards.length);
  element('comparison-grid').replaceChildren(...cards.map(card => {
    const quote = quoteFor(state.set, card.id, comparison.asOf);
    const column = document.createElement('article');
    column.className = 'comparison-column';
    column.dataset.id = card.id;
    const heading = document.createElement('h3');
    heading.textContent = card.rarity;
    const code = document.createElement('p');
    code.className = 'comparison-code';
    code.textContent = card.id;
    const image = document.createElement('img');
    image.alt = `${card.name} ${card.rarity}`;
    imageFor(image, card.id);
    column.append(heading, code, image);
    const difference = Number.isFinite(quote.price) && Number.isFinite(base.price) ? quote.price - base.price : null;
    const fields = [['售價', money(quote.price)], ['相對基準價差', card.id === comparison.base ? '基準版本' : difference === null ? '—' : `${difference >= 0 ? '+' : '-'}${money(Math.abs(difference))}`], ['近 7 日', changeText(quote.change)], ['庫存', Number.isFinite(quote.stock) ? `${quote.stock} 張` : '—'], ['報價日期', quote.date || '—'], ['庫存日期', quote.stockDate || '—']];
    const details = document.createElement('dl');
    fields.forEach(([label, value]) => {
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      details.append(term, description);
    });
    const tracked = state.favorites.some(item => item.id === card.id);
    const trackButton = document.createElement('button');
    trackButton.className = 'comparison-track';
    trackButton.setAttribute('aria-pressed', String(tracked));
    trackButton.setAttribute('aria-label', `${tracked ? '取消追蹤' : '追蹤'} ${card.id}`);
    const icon = document.createElement('i');
    icon.className = tracked ? 'fas fa-check' : 'fas fa-plus';
    icon.setAttribute('aria-hidden', 'true');
    trackButton.append(icon, tracked ? ' 已追蹤' : ' 追蹤版本');
    trackButton.addEventListener('click', () => {
      if (state.favorites.some(item => item.id === card.id)) state.favorites = state.favorites.filter(item => item.id !== card.id);
      else state.favorites.push({ id: card.id, name: card.name });
      saveFavorites();
      refreshWatchlist();
      renderComparison();
      element('comparison-grid').querySelector(`[data-id="${card.id}"] button`).focus({ preventScroll: true });
    });
    column.append(details, trackButton);
    return column;
  }));
  renderComparisonChart();
}

function renderComparisonChart() {
  comparison.chart?.destroy();
  comparison.chart = null;
  const cards = comparisonCards();
  const end = comparison.asOf ? Date.parse(comparison.asOf) : Date.now();
  const start = end - Number(element('comparison-period').value) * 86400000;
  const dark = document.documentElement.dataset.theme === 'dark';
  const colors = dark ? ['#d6ff38', '#65d5e9', '#ff98ac'] : ['#16181b', '#08778a', '#b02f55'];
  const datasets = cards.map((card, index) => ({
    label: `${card.rarity} / ${card.id.split('-').at(-1)}`,
    data: quoteFor(state.set, card.id, comparison.asOf).prices.filter(point => Date.parse(point.date) >= start).map(point => ({ x: Date.parse(point.date), y: point.value })),
    borderColor: colors[index], backgroundColor: colors[index], borderDash: index === 1 ? [6, 3] : [], borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, stepped: true
  }));
  const available = !!window.Chart && datasets.some(dataset => dataset.data.length);
  element('comparison-chart-empty').hidden = available;
  text('comparison-chart-empty', window.Chart ? '此期間沒有價格資料' : '圖表套件未能載入，上方數值仍可比較。');
  if (!available) return;
  const style = getComputedStyle(document.documentElement);
  comparison.chart = new window.Chart(element('comparison-chart'), {
    type: 'line', data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { labels: { color: style.getPropertyValue('--ink'), usePointStyle: true, boxWidth: 8, font: { size: 10 } } }, tooltip: { callbacks: { title: items => new Date(items[0].parsed.x).toISOString().slice(0, 10), label: item => `${item.dataset.label}: ${money(item.parsed.y)}` } } },
      scales: {
        x: { type: 'linear', min: start, max: end, grid: { display: false }, ticks: { maxTicksLimit: 5, maxRotation: 0, color: style.getPropertyValue('--muted'), callback: value => new Date(value).toISOString().slice(5, 10) } },
        y: { grid: { color: style.getPropertyValue('--line') }, ticks: { color: style.getPropertyValue('--muted'), maxTicksLimit: 5, callback: value => money(value) } }
      }
    }
  });
}
function renderLinks() {
  const name = state.card.name || state.id;
  const links = [
    ['Mercari', `https://jp.mercari.com/search?keyword=${encodeURIComponent(name)}`, name],
    ['Yahoo! 拍賣', `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(name)}`, name],
    ['遊遊亭', `https://yuyu-tei.jp/sell/ws/s/search?search_word=${encodeURIComponent(state.id)}`, state.id],
    ['露天拍賣', `https://www.ruten.com.tw/find/?q=${encodeURIComponent(state.id)}`, state.id]
  ];
  element('market-links').replaceChildren(...links.map(([label, href, term]) => {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `在 ${label} 搜尋「${term}」（另開視窗）`);
    const icon = document.createElement('i');
    icon.className = 'fas fa-arrow-up';
    icon.setAttribute('aria-hidden', 'true');
    link.append(label, icon);
    return link;
  }));
}
function readout(index) {
  state.cursor = Math.max(0, Math.min(index, state.points.length - 1));
  const point = state.points[state.cursor];
  text('cursor-date', point?.date || '無歷史資料');
  text('cursor-value', point ? state.metric === 'price' ? money(point.value) : `${point.value} 張` : '—');
  text('history-date', point?.date || '—');
  element('history-slider').value = state.cursor;
  element('history-slider').setAttribute('aria-valuetext', point ? `${point.date} ${state.metric === 'price' ? money(point.value) : `${point.value} 張`}` : '無資料');
}
function renderChart() {
  const all = latestPoints(state.metric);
  const end = all.length ? new Date(`${all.at(-1).date}T00:00:00Z`) : new Date();
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - state.months);
  state.points = all.filter(point => Date.parse(point.date) >= start.getTime());
  element('history-slider').max = Math.max(0, state.points.length - 1);
  element('history-slider').disabled = !state.points.length;
  element('download-button').disabled = !state.points.length || !window.Chart;
  readout(state.points.length - 1);
  if (state.chart) state.chart.destroy();
  state.chart = null;
  element('chart-empty').hidden = !!state.points.length && !!window.Chart;
  text('chart-empty', window.Chart ? '此期間沒有資料' : '圖表套件未能載入，仍可使用下方日期軸查看數值。');
  if (!window.Chart || !state.points.length) return;
  const style = getComputedStyle(document.documentElement);
  const ink = style.getPropertyValue('--ink').trim();
  const muted = style.getPropertyValue('--muted').trim();
  const line = style.getPropertyValue('--line').trim();
  const cursorPlugin = { id: 'historyCursor', afterDraw(chart) {
    const point = state.points[state.cursor];
    if (!point) return;
    const horizontal = chart.scales.x.getPixelForValue(Date.parse(point.date));
    const vertical = chart.scales.y.getPixelForValue(point.value);
    const context = chart.ctx;
    context.save();
    context.beginPath();
    context.setLineDash([3, 4]);
    context.strokeStyle = muted;
    context.moveTo(horizontal, chart.chartArea.top);
    context.lineTo(horizontal, chart.chartArea.bottom);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(horizontal, vertical, 5, 0, Math.PI * 2);
    context.fillStyle = '#d6ff38';
    context.fill();
    context.strokeStyle = '#16181b';
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }};
  state.chart = new window.Chart(element('market-chart'), {
    type: 'line',
    data: { datasets: [{ data: state.points.map(point => ({ x: Date.parse(point.date), y: point.value })), borderColor: ink, backgroundColor: ink, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4, stepped: true, fill: false }] },
    plugins: [cursorPlugin],
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      onHover(event, active) { if (active.length) { readout(active[0].index); state.chart.draw(); } },
      onClick(event, active) { if (active.length) { readout(active[0].index); state.chart.draw(); } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      layout: { padding: { top: 8, right: 8 } },
      scales: {
        x: { type: 'linear', min: Date.parse(state.points[0].date), max: Date.parse(state.points.at(-1).date), grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 5, maxRotation: 0, color: muted, font: { size: 10, family: 'IBM Plex Mono' }, callback: value => new Date(value).toISOString().slice(5, 10).replace('-', '/') } },
        y: { beginAtZero: state.metric === 'stock', grace: '8%', border: { display: false }, grid: { color: line }, ticks: { precision: state.metric === 'stock' ? 0 : undefined, maxTicksLimit: 5, color: muted, font: { size: 10, family: 'IBM Plex Mono' }, callback: value => state.metric === 'stock' ? Number.isInteger(value) ? value : '' : value >= 1000 ? `${Math.round(value / 1000)}k` : value } }
      }
    }
  });
}
async function selectCard(rawId, compare = false) {
  const id = rawId.trim().toUpperCase();
  if (!/^[A-Z0-9]+\/[A-Z0-9]+-[A-Z0-9+_-]+$/.test(id)) { notice('請選擇搜尋結果，或輸入完整卡號。'); return; }
  requestedId = id;
  if (!element('card-panel').open) element('card-panel').showModal();
  document.body.classList.add('sheet-open');
  const sequence = ++state.sequence;
  element('terminal-grid').setAttribute('aria-busy', 'true');
  element('search-results').hidden = true;
  element('card-search').setAttribute('aria-expanded', 'false');
  notice('正在載入卡片與行情…');
  try {
    const set = await loadSet(id);
    if (sequence !== state.sequence) return;
    let card = set.cards.find(item => item.id.toUpperCase() === id);
    if (!card && !set.prices[id]) throw new Error('找不到這張卡片，請確認卡號與稀有度後綴。');
    card ||= { id, name: id, rarity: '—', color: '—', level: '—', cost: '—', power: '—', soul: '—', features: '—', text: ['此卡暫無詳細資料。'] };
    state.id = id;
    state.card = card;
    state.set = set;
    text('card-name', card.name);
    text('context-id', id);
    text('set-name', id.split('-')[0]);
    text('art-id', id);
    text('art-rarity', card.rarity);
    text('rarity-badge', card.rarity);
    element('card-search').value = '';
    element('image-failure').hidden = true;
    element('card-image').alt = `${card.name} ${id}`;
    imageFor(element('card-image'), id);
    renderQuote();
    renderVariants(true);
    renderLinks();
    renderChart();
    updateFavorites();
    history.replaceState(null, '', `${location.pathname}?card=${encodeURIComponent(id)}`);
    element('full-card-link').href = `line_test_v102.html?card=${encodeURIComponent(id)}`;
    element('full-card-link').setAttribute('aria-label', `查看 ${id} 完整卡片資料（另開視窗）`);
    if (compare) openComparison();
    notice(set.incomplete ? '部分資料未能載入，目前僅顯示可取得的資訊。' : !latestPoints('price').length ? '此卡目前沒有售價紀錄。' : '', set.incomplete);
  } catch (error) {
    if (sequence === state.sequence) notice(`${error.message}${state.card ? ' 目前保留上一張卡的資料。' : ''}`, true);
  } finally {
    if (sequence === state.sequence) element('terminal-grid').setAttribute('aria-busy', 'false');
  }
}
function search() {
  const query = element('card-search').value.trim().toLowerCase();
  const results = element('search-results');
  results.replaceChildren();
  if (!query) { results.hidden = true; element('card-search').setAttribute('aria-expanded', 'false'); return; }
  const dataset = state.dictionary.length ? state.dictionary : state.set?.cards.map(card => [card.id, card.name]) || [];
  const matches = dataset.filter(([id, name]) => id.toLowerCase().includes(query) || name.toLowerCase().includes(query)).slice(0, 35);
  for (const [id, name] of matches) {
    const button = document.createElement('button');
    button.className = 'search-result';
    const title = document.createElement('strong');
    title.textContent = name;
    const subtitle = document.createElement('span');
    subtitle.textContent = id;
    button.append(title, subtitle);
    button.addEventListener('click', () => selectCard(id));
    results.append(button);
  }
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-results';
    empty.textContent = '找不到符合的卡片；可直接輸入完整卡號查詢。';
    results.append(empty);
  }
  results.hidden = false;
  element('card-search').setAttribute('aria-expanded', 'true');
}
function openImage() {
  if (!state.card) return;
  text('image-dialog-title', state.card.name);
  imageFor(element('dialog-image'), state.id);
  element('dialog-image').alt = `${state.card.name} ${state.id}`;
  element('image-zoom').value = 100;
  element('dialog-image').style.height = '100%';
  text('zoom-value', '100%');
  element('image-dialog').showModal();
}
function themeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const button = element('theme-button');
  button.setAttribute('aria-pressed', String(dark));
  button.setAttribute('aria-label', dark ? '切換淺色模式' : '切換深色模式');
  button.title = button.getAttribute('aria-label');
  button.firstElementChild.className = dark ? 'far fa-sun' : 'far fa-moon';
}
element('search-form').addEventListener('submit', event => {
  event.preventDefault();
  const query = element('card-search').value.trim();
  if (/^[A-Z0-9]+\/[A-Z0-9]+-/i.test(query)) selectCard(query);
  else { search(); element('search-results').querySelector('button')?.focus(); }
});
element('card-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(search, 160); });
element('card-search').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); element('search-results').querySelector('button')?.focus(); }
});
element('search-results').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const sibling = event.key === 'ArrowDown' ? event.target.nextElementSibling : event.target.previousElementSibling;
    if (sibling?.tagName === 'BUTTON') sibling.focus(); else element('card-search').focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.search-area')) { element('search-results').hidden = true; element('card-search').setAttribute('aria-expanded', 'false'); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !element('search-results').hidden) { element('search-results').hidden = true; element('card-search').setAttribute('aria-expanded', 'false'); element('card-search').focus(); }
});
document.querySelectorAll('[data-card]').forEach(button => button.addEventListener('click', () => selectCard(button.dataset.card)));
document.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => {
  state.metric = button.dataset.metric;
  document.querySelectorAll('[data-metric]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderChart();
}));
document.querySelectorAll('[data-months]').forEach(button => button.addEventListener('click', () => {
  state.months = Number(button.dataset.months);
  document.querySelectorAll('[data-months]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderChart();
}));
element('history-slider').addEventListener('input', event => { readout(Number(event.target.value)); state.chart?.draw(); });
element('rarity-filter').addEventListener('change', () => renderVariants());
element('open-comparison').addEventListener('click', openComparison);
element('comparison-baseline').addEventListener('change', event => { comparison.base = event.target.value; renderComparison(); });
element('comparison-period').addEventListener('change', renderComparisonChart);
element('comparison-dialog').addEventListener('close', () => { comparison.chart?.destroy(); comparison.chart = null; });
for (const [id, direction] of [['variants-prev', -1], ['variants-next', 1]]) {
  element(id).addEventListener('click', () => element('variants-track').scrollBy({ left: direction * 390, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
}
element('favorite-button').addEventListener('click', () => {
  if (!state.card) return;
  if (state.favorites.some(card => card.id === state.id)) state.favorites = state.favorites.filter(card => card.id !== state.id);
  else state.favorites.push({ id: state.id, name: state.card.name });
  saveFavorites();
  refreshWatchlist();
});
element('watch-sort').addEventListener('change', event => { watch.sort = event.target.value; renderWatchlist(); });
document.querySelectorAll('[data-watch-filter]').forEach(button => button.addEventListener('click', () => {
  watch.filter = button.dataset.watchFilter;
  document.querySelectorAll('[data-watch-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderWatchlist();
}));
element('refresh-watchlist').addEventListener('click', () => refreshWatchlist(true));
for (const id of ['add-watch', 'empty-search']) element(id).addEventListener('click', () => { element('card-search').focus(); element('card-search').scrollIntoView({ block: 'center' }); });
element('card-panel').addEventListener('close', () => {
  state.sequence += 1;
  document.body.classList.remove('sheet-open');
  history.replaceState(null, '', location.pathname);
  if (document.activeElement === document.body) element('add-watch').focus({ preventScroll: true });
});
element('theme-button').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('terminal-theme', theme); } catch {}
  themeButton();
  renderChart();
});
element('enlarge-button').addEventListener('click', openImage);
element('zoom-button').addEventListener('click', openImage);
element('image-zoom').addEventListener('input', event => {
  element('dialog-image').style.height = `${event.target.value}%`;
  text('zoom-value', `${event.target.value}%`);
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => element(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const box = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
}));
element('download-button').addEventListener('click', () => {
  if (!state.chart) return;
  const source = element('market-chart');
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height + 100;
  const context = canvas.getContext('2d');
  const style = getComputedStyle(document.documentElement);
  context.fillStyle = style.getPropertyValue('--surface');
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = style.getPropertyValue('--ink');
  context.font = 'bold 18px sans-serif';
  context.fillText(`${state.id} / ${state.metric === 'price' ? 'JPY' : 'STOCK'}`, 20, 30);
  context.drawImage(source, 0, 50);
  context.font = '12px sans-serif';
  context.fillText(`WS-Cards | Yuyutei | ${state.points[0].date} - ${state.points.at(-1).date}`, 20, canvas.height - 18);
  const link = document.createElement('a');
  link.download = `${state.id.replace('/', '_')}-${state.metric}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});
element('retry-button').addEventListener('click', () => selectCard(requestedId));
themeButton();
updateFavorites();
refreshWatchlist();
const initialCard = new URLSearchParams(location.search).get('card');
if (initialCard) selectCard(initialCard);
getJSON('json/cardDictionary.json').then(data => {
  state.dictionary = data.filter(row => Array.isArray(row) && typeof row[0] === 'string' && typeof row[1] === 'string');
  text('search-count', `${state.dictionary.length.toLocaleString()} CARDS`);
  if (element('card-search').value) search();
}).catch(() => { text('search-count', '卡號查詢'); });