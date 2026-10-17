// Ежедневное обновление site/data.json: новые объявления с Kufar и проверка, не сняты ли старые.
// Запускается GitHub Actions (node scripts/update.mjs). Внешних зависимостей нет.
import { readFile, writeFile } from 'node:fs/promises';

const DATA_PATH = new URL('../site/data.json', import.meta.url);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const SEARCHES = [
  'https://auto.kufar.by/l/zapchasti/z~toyota-rav4-iv-ca40-restajling?query=%D0%B1%D0%B0%D0%BC%D0%BF%D0%B5%D1%80',
  'https://auto.kufar.by/l/zapchasti/z~toyota-rav4?query=4A911'
];
const WRONG = /52119-?(4A90[45]|0R911|42A00|42B20|0R920|4A91[6-9]|4A92\d|0R280|0R92[56])/i;   // дорестайлинг и XA50
const RIGHT = /52119-?4A911/i;

const now = new Date();
const minsk = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dm = d => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit' }).format(d);
const stamp = minsk.format(now).replace(' г.', '');

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9' }, redirect: 'follow' });
  return { status: r.status, text: r.status < 400 ? await r.text() : '' };
}
function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}
const param = (a, key) => (a.ad_parameters || []).find(p => p.p === key) || {};
const account = (a, key) => ((a.account_parameters || []).find(p => p.p === key) || {}).v || '';

function toItem(a, prev) {
  const text = [a.subject, a.body_short, a.body].filter(Boolean).join(' ');
  const part = param(a, 'spares_passenger_group').vl || '';
  const cond = param(a, 'condition').vl || '';
  const pn = (text.match(/52119-?[0-9A-Z]{5}/i) || [null])[0];
  const assembly = /в\s*сбор|в\s*комплект/i.test(text);
  return {
    id: 'kufar-' + a.ad_id,
    source: 'kufar',
    group: cond === 'Новое' ? 'copy' : (assembly ? 'assembly' : 'cover'),
    seller: account(a, 'name') || (a.company_ad ? 'Компания' : 'Частное лицо'),
    what: a.subject + (part && !a.subject.toLowerCase().includes(part.toLowerCase()) ? ' (' + part + ')' : ''),
    price: a.price_byn ? Math.round(Number(a.price_byn) / 100) : null,
    phones: [],
    link: a.ad_link || ('https://auto.kufar.by/vi/' + a.ad_id),
    found: prev?.found || dm(new Date(a.list_time || now)),
    includes: (a.body_short || a.body || '').replace(/\s+/g, ' ').trim().slice(0, 200) || 'Описание в объявлении. Телефон — по кнопке «Позвонить» на Kufar.',
    partno: pn ? pn.toUpperCase().replace(/^52119-?/, '52119-') : null,
    holes: {
      washers: /без\s+омыват/i.test(text) ? false : (/(под|с)\s+омыват/i.test(text) ? true : null),
      pdc: /без\s+(отверстий\s+под\s+)?парктрон/i.test(text) ? false : (/(под|с\s+отверстиями\s+под)\s+парктрон/i.test(text) ? true : null)
    },
    exact: RIGHT.test(text) || undefined
  };
}

async function main() {
  const data = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  const known = new Set((data.offers || []).map(o => o.link));
  const prevFresh = new Map((data.fresh || []).map(o => [o.id, o]));
  const found = new Map();
  let ok = 0;
  for (const url of SEARCHES) {
    try {
      const { status, text } = await get(url);
      const nd = text && nextData(text);
      const ads = nd?.props?.initialState?.listing?.ads;
      if (!Array.isArray(ads)) { console.log('Kufar: нет данных', status, url); continue; }
      ok++;
      for (const a of ads) {
        const part = param(a, 'spares_passenger_group').vl || '';
        const t = [a.subject, a.body_short].join(' ');
        const front = /^бампер передний$/i.test(part.trim()) || RIGHT.test(t) || (!part && /^\s*бампер\s+передн/i.test(a.subject || ''));
        if (!front || /задн/i.test(part) || WRONG.test(t)) continue;
        if ([...known].some(k => k.includes(String(a.ad_id)))) continue;
        found.set('kufar-' + a.ad_id, toItem(a, prevFresh.get('kufar-' + a.ad_id)));
      }
    } catch (e) { console.log('Kufar: ошибка', url, e.message); }
  }

  // Проверка, живы ли объявления Kufar из основного списка
  let gone = 0;
  for (const o of data.offers || []) {
    if (!/kufar\.by/.test(o.link || '')) continue;
    try {
      const { status, text } = await get(o.link);
      const alive = status < 400 && /__NEXT_DATA__/.test(text) && !/объявление (удалено|снято|не найдено)/i.test(text);
      if (!alive) { o.gone = o.gone || dm(now); gone++; } else delete o.gone;
    } catch (e) { console.log('Проверка не удалась', o.link, e.message); }
  }

  if (ok) {
    const others = (data.fresh || []).filter(o => o.source !== 'kufar');
    const kufar = [...found.values()].sort((a, b) => (b.exact ? 1 : 0) - (a.exact ? 1 : 0));
    data.fresh = others.concat(kufar).slice(0, 16);
    data.sources = data.sources || {};
    data.sources.kufar = { updated: stamp, ok: true, count: kufar.length };
    data.updated = stamp;
    const newOnes = kufar.filter(k => !prevFresh.has(k.id)).length;
    data.updateNote = 'Kufar проверен: подходящих объявлений вне основного списка — ' + kufar.length + (newOnes ? ', новых — ' + newOnes : '') + (gone ? '; снято объявлений из списка — ' + gone : '') + '.';
  } else {
    data.sources = data.sources || {};
    data.sources.kufar = { updated: stamp, ok: false, count: 0 };
  }
  await writeFile(DATA_PATH, JSON.stringify(data, null, 1) + '\n');
  console.log(data.updateNote || 'Kufar недоступен', '| fresh:', (data.fresh || []).length);
}
main().catch(e => { console.error(e); process.exit(1); });
