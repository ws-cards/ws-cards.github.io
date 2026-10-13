const localPreview = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
const BASE = localPreview ? '/__terminal-data' : 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com';
const cache = new Map();

export function clearDataCache() {
  cache.clear();
}

export function quoteFor(set, id, asOf) {
  const cutoff = asOf ? Date.parse(asOf) : Infinity;
  const prices = pointsFor(set?.prices?.[id], 'cardPrice').filter(point => Date.parse(point.date) <= cutoff);
  const stocks = pointsFor(set?.stocks?.[id], 'cardPrice').filter(point => Date.parse(point.date) <= cutoff);
  const latest = prices.at(-1);
  const end = asOf ? cutoff : latest ? Date.parse(latest.date) : NaN;
  const baseline = prices.filter(point => Date.parse(point.date) <= end - 7 * 86400000).at(-1);
  return {
    price: latest?.value ?? null,
    date: latest?.date ?? null,
    stock: stocks.at(-1)?.value ?? null,
    stockDate: stocks.at(-1)?.date ?? null,
    change: latest && baseline?.value > 0 ? (latest.value / baseline.value - 1) * 100 : null,
    prices
  };
}

export function sortQuotes(records, mode) {
  return [...records].sort((first, second) => {
    if (mode === 'added') return 0;
    const key = mode.startsWith('price') ? 'price' : 'change';
    const firstValue = first.quote?.[key];
    const secondValue = second.quote?.[key];
    if (!Number.isFinite(firstValue)) return Number.isFinite(secondValue) ? 1 : 0;
    if (!Number.isFinite(secondValue)) return -1;
    return (mode.endsWith('asc') ? 1 : -1) * (firstValue - secondValue);
  });
}

export async function getJSON(url) {
  if (!cache.has(url)) {
    const request = fetch(url, { signal: AbortSignal.timeout(20000) }).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }).catch(error => {
      cache.delete(url);
      throw error;
    });
    cache.set(url, request);
  }
  return cache.get(url);
}

export function normalizeCards(data) {
  const cards = Array.isArray(data.cards) ? data.cards : Object.entries(data).map(([id, value]) => ({ ...value, id }));
  return cards.map(card => ({
    id: card.id || card.cardno,
    name: card.name || card.cardname || card.id,
    rarity: card.rarity || card.cardrare || '-',
    color: card.color || card.cardcolor || '-',
    level: card.level ?? card.cardlevel ?? '-',
    cost: card.cost ?? card.cardcost ?? '-',
    power: card.power ?? card.cardpower ?? '-',
    soul: card.soul ?? card.cardsoul ?? '-',
    features: Array.isArray(card.features) ? card.features.join(' / ') : card.cardfeatures || '-',
    text: Array.isArray(card.text) ? card.text : [card.cardtext || '此卡暫無效果資料。']
  })).filter(card => card.id);
}

export function cardImages(id) {
  const set = id.split('-')[0].replace('/', '_').toLowerCase();
  const file = id.replace('/', '_').replace('-', '_').toLowerCase();
  const side = id.split('/')[1][0].toLowerCase();
  return [
    `https://imgs.devilfox.net/ws/${set}/${file}.png`,
    `https://ws-tcg.com/wordpress/wp-content/images/cardlist/${side}/${set}/${file}.png`
  ];
}

export function pointsFor(entry, key) {
  return (entry?.upddate || []).map((date, index) => ({
    date: String(date).slice(0, 10).replaceAll('/', '-').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
    value: entry[key]?.[index] === null || entry[key]?.[index] === '' || entry[key]?.[index] === undefined ? null : Number(entry[key][index])
  })).filter(point => Number.isFinite(point.value) && Number.isFinite(Date.parse(point.date))).sort((first, second) => first.date.localeCompare(second.date));
}

export async function loadSet(id) {
  const set = id.split('-')[0].replace('/', '_');
  const [content, prices, stocks] = await Promise.allSettled([
    getJSON(`${BASE}/cardDataInfo/content/ws/${set}.json`),
    getJSON(`${BASE}/json/cardData/${set}.json`),
    getJSON(`${BASE}/cardDataInfo/stockJson/${set}.json`)
  ]);
  if (content.status === 'rejected' && prices.status === 'rejected') throw new Error('無法載入此商品，請確認卡號或稍後重試。');
  return {
    cards: content.status === 'fulfilled' ? normalizeCards(content.value) : [],
    prices: prices.status === 'fulfilled' ? prices.value : {},
    stocks: stocks.status === 'fulfilled' ? stocks.value : {},
    incomplete: [content, prices, stocks].some(result => result.status === 'rejected')
  };
}