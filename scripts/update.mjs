// Ежедневное обновление site/data.json: новые объявления с Kufar и проверка, не сняты ли старые.
// Три детали: бампер (data.fresh), парктроники (data.pdc.fresh), лобовое стекло (data.glass.fresh).
// Запускается GitHub Actions (node scripts/update.mjs). Внешних зависимостей нет.
import { readFile, writeFile } from 'node:fs/promises';

const DATA_PATH = process.env.DATA_PATH || new URL('../site/data.json', import.meta.url);   // DATA_PATH — для проверки на копии
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const PAUSE = 3000;   // Kufar отвечает 429, если спрашивать чаще

const now = new Date();
const minsk = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dm = d => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit' }).format(d);
const stamp = minsk.format(now).replace(' г.', '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9' }, redirect: 'follow' });
    if (r.status === 429 && i < 2) { await sleep(15000 * (i + 1)); continue; }
    const text = r.status < 400 ? await r.text() : '';
    await sleep(PAUSE);
    return { status: r.status, text };
  }
}
function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}
const param = (a, key) => (a.ad_parameters || []).find(p => p.p === key) || {};
const account = (a, key) => ((a.account_parameters || []).find(p => p.p === key) || {}).v || '';
const adText = a => [a.subject, a.body_short, a.body, param(a, 'spares_parts_number').vl, param(a, 'spares_parts_code').vl].filter(Boolean).join(' ');

// Общие поля объявления Kufar
function baseItem(a, prev, task) {
  return {
    id: 'kufar-' + a.ad_id,
    source: 'kufar',
    seller: account(a, 'name') || (a.company_ad ? 'Компания' : 'Частное лицо'),
    what: a.subject,
    price: a.price_byn && Number(a.price_byn) > 0 ? Math.round(Number(a.price_byn) / 100) : null,
    phones: [],
    link: a.ad_link || ('https://auto.kufar.by/vi/' + a.ad_id),
    found: prev?.found || dm(new Date(a.list_time || now)),
    includes: (a.body_short || a.body || '').replace(/\s+/g, ' ').trim().slice(0, 200) || 'Описание в объявлении. Телефон — по кнопке «Позвонить» на Kufar.',
    city: param(a, 'area').vl || param(a, 'region').vl || undefined
  };
}

/* ---------- Бампер ---------- */
const B_WRONG = /52119-?(4A90[45]|0R911|42A00|42B20|0R920|4A91[6-9]|4A92\d|0R280|0R92[56])/i;   // дорестайлинг и XA50
const B_RIGHT = /52119-?4A911/i;
const bumper = {
  key: 'bumper', name: 'бампер',
  list: d => d,
  searches: [
    'https://auto.kufar.by/l/zapchasti/z~toyota-rav4-iv-ca40-restajling?query=%D0%B1%D0%B0%D0%BC%D0%BF%D0%B5%D1%80',
    'https://auto.kufar.by/l/zapchasti/z~toyota-rav4?query=4A911'
  ],
  accept(a) {
    const part = param(a, 'spares_passenger_group').vl || '';
    const t = [a.subject, a.body_short].join(' ');
    const front = /^бампер передний$/i.test(part.trim()) || B_RIGHT.test(t) || (!part && /^\s*бампер\s+передн/i.test(a.subject || ''));
    return front && !/задн/i.test(part) && !B_WRONG.test(t);
  },
  item(a, prev) {
    const text = adText(a);
    const part = param(a, 'spares_passenger_group').vl || '';
    const cond = param(a, 'condition').vl || '';
    const pn = (text.match(/52119-?[0-9A-Z]{5}/i) || [null])[0];
    return Object.assign(baseItem(a, prev), {
      group: cond === 'Новое' ? 'copy' : (/в\s*сбор|в\s*комплект/i.test(text) ? 'assembly' : 'cover'),
      what: a.subject + (part && !a.subject.toLowerCase().includes(part.toLowerCase()) ? ' (' + part + ')' : ''),
      partno: pn ? pn.toUpperCase().replace(/^52119-?/, '52119-') : null,
      holes: {
        washers: /без\s+омыват/i.test(text) ? false : (/(под|с)\s+омыват/i.test(text) ? true : null),
        pdc: /без\s+(отверстий\s+под\s+)?парктрон/i.test(text) ? false : (/(под|с\s+отверстиями\s+под)\s+парктрон/i.test(text) ? true : null)
      },
      exact: B_RIGHT.test(text) || undefined
    });
  },
  max: 16
};

/* ---------- Парктроники: 89341-42060 (-B2 — уже в цвете 1G3) ---------- */
const P_RIGHT = /89341-?42060/i;
const RAV = /rav\s*-?\s*4|рав\s*-?\s*4|раф\s*-?\s*4/i;
const NOT_XA40 = /xa50|xa30|ca30|ca50|rav\s*-?\s*4\s*(3|5|iii|v)\b|201[0-2]|2019\s*-|20(2\d)/i;
const pdc = {
  key: 'pdc', name: 'парктроники',
  list: d => d.pdc,
  searches: [
    'https://auto.kufar.by/l/zapchasti/z~toyota?spg=193',                      // все «Датчик парктроника» для Toyota
    'https://auto.kufar.by/l/zapchasti/z~toyota-rav4?query=%D0%BF%D0%B0%D1%80%D0%BA%D1%82%D1%80%D0%BE%D0%BD%D0%B8%D0%BA'
  ],
  accept(a) {
    const part = param(a, 'spares_passenger_group').vl || '';
    const t = adText(a);
    if (P_RIGHT.test(t)) return true;
    if (!/датчик парктроника/i.test(part) && !/датчик\s+(парктроника|парковки)/i.test(a.subject || '')) return false;
    const year = +param(a, 'spares_regdate').vl || 0;
    const gen = param(a, 'cars_gen_v2').vl || '';
    return RAV.test(t) && !NOT_XA40.test(a.subject || '') && (/CA40/.test(gen) || (!gen && (!year || (year >= 2013 && year <= 2019))));
  },
  item(a, prev) {
    const text = adText(a);
    const cond = param(a, 'condition').vl || '';
    return Object.assign(baseItem(a, prev), {
      group: cond === 'Новое' ? 'new' : 'used',
      partno: P_RIGHT.test(text) ? (text.match(/89341-?42060(-?[A-Z0-9]{2})?/i)[0].toUpperCase().replace(/^89341-?42060-?/, '89341-42060-').replace(/-$/, '')) : null,
      painted: /42060-?B2|1G3/i.test(text) ? true : null,
      exact: P_RIGHT.test(text) || undefined
    });
  },
  max: 16
};

/* ---------- Лобовое стекло: 56101-42511 (с камерой Pre-Collision и датчиком дождя) ---------- */
const G_RIGHT = /56101-?42511/i;
const glass = {
  key: 'glass', name: 'стекло',
  list: d => d.glass,
  searches: [
    'https://auto.kufar.by/l/zapchasti/z~toyota-rav4?spg=918',   // «Стекло лобовое»
    'https://auto.kufar.by/l/zapchasti/z~toyota-rav4?spg=139'    // «Ветровое стекло»
  ],
  accept(a) {
    const t = adText(a);
    if (G_RIGHT.test(t)) return true;
    const gen = param(a, 'cars_gen_v2').vl || '';
    const year = +param(a, 'spares_regdate').vl || 0;
    if (gen) return gen === 'IV (CA40) Рестайлинг';
    return /лобов|ветров/i.test(a.subject || '') && year >= 2016 && year <= 2019 && !NOT_XA40.test(a.subject || '');
  },
  item(a, prev) {
    const text = adText(a);
    const cond = param(a, 'condition').vl || '';
    return Object.assign(baseItem(a, prev), {
      group: cond === 'Новое' ? 'new' : 'used',
      partno: G_RIGHT.test(text) ? '56101-42511' : null,
      camera: /без\s+(кронштейна\s+)?камер/i.test(text) ? false : (/(под|с|кронштейн\S*)\s+камер/i.test(text) ? true : null),
      exact: G_RIGHT.test(text) || undefined
    });
  },
  max: 12
};

const TASKS = [bumper, pdc, glass];

async function runTask(data, task) {
  const box = task.list(data);
  if (!box) return { ok: 0 };
  const known = (box.offers || []).map(o => o.link || '');
  const prevFresh = new Map((box.fresh || []).map(o => [o.id, o]));
  const found = new Map();
  let ok = 0;
  for (const url of task.searches) {
    try {
      const { status, text } = await get(url);
      const nd = text && nextData(text);
      const ads = nd?.props?.initialState?.listing?.ads;
      if (!Array.isArray(ads)) { console.log('Kufar (' + task.name + '): нет данных', status, url); continue; }
      ok++;
      for (const a of ads) {
        if (!task.accept(a)) continue;
        if (known.some(k => k.includes(String(a.ad_id)))) continue;
        found.set('kufar-' + a.ad_id, task.item(a, prevFresh.get('kufar-' + a.ad_id)));
      }
    } catch (e) { console.log('Kufar (' + task.name + '): ошибка', url, e.message); }
  }

  // Живы ли объявления Kufar из основного списка этой детали
  let gone = 0;
  for (const o of box.offers || []) {
    if (!/kufar\.by/.test(o.link || '')) continue;
    try {
      const { status, text } = await get(o.link);
      const alive = status < 400 && /__NEXT_DATA__/.test(text) && !/объявление (удалено|снято|не найдено)/i.test(text);
      if (!alive) { o.gone = o.gone || dm(now); gone++; } else delete o.gone;
    } catch (e) { console.log('Проверка не удалась', o.link, e.message); }
  }

  box.sources = box.sources || {};
  if (ok) {
    const others = (box.fresh || []).filter(o => o.source !== 'kufar');
    const kufar = [...found.values()].sort((a, b) => (b.exact ? 1 : 0) - (a.exact ? 1 : 0));
    box.fresh = others.concat(kufar).slice(0, task.max);
    box.sources.kufar = { updated: stamp, ok: true, count: kufar.length };
    return { ok, count: kufar.length, newOnes: kufar.filter(k => !prevFresh.has(k.id)).length, gone };
  }
  box.sources.kufar = { updated: stamp, ok: false, count: 0 };
  return { ok: 0, gone };
}

async function main() {
  const data = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  const notes = [];
  let any = false;
  for (const task of TASKS) {
    const r = await runTask(data, task);
    if (r.ok) {
      any = true;
      notes.push(task.name + ' — ' + r.count + (r.newOnes ? ' (новых ' + r.newOnes + ')' : '') + (r.gone ? ', снято из списка ' + r.gone : ''));
    } else notes.push(task.name + ' — Kufar не ответил');
  }
  if (any) {
    data.updated = stamp;
    data.updateNote = 'Kufar проверен. Подходящих объявлений вне основного списка: ' + notes.join('; ') + '.';
  }
  await writeFile(DATA_PATH, JSON.stringify(data, null, 1) + '\n');
  console.log(data.updateNote || 'Kufar недоступен');
}
main().catch(e => { console.error(e); process.exit(1); });
