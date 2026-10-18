// Проверяет ссылки в site/data.json: каждая должна вести на само объявление
// (или, если помечена linkKind:"donor", на страницу машины-донора на bamper.by,
// или, если linkKind:"shop", на страницу товара в интернет-магазине — не на поиск и не на главную;
// исключение — страница точного номера детали у магазинов запчастей, где цены только там).
// Поиск, каталоги и прочие страницы — ошибка: мама откроет их и не найдёт деталь.
// Те же правила — в linkKind() в dev/site_template.html.
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../site/data.json', import.meta.url), 'utf8'));
const AD = [
  /^https:\/\/(auto\.)?kufar\.by\/(vi\/([^/?#]+\/)?|item\/)\d+\/?$/,
  /^https:\/\/bamper\.by\/zapchast_[a-z-]+\/[\w-]+\/?$/,
];
const DONOR = /^https:\/\/bamper\.by\/zchbu\/vin_[A-HJ-NPR-Z0-9]{17}\/?$/;
const SHOP_BAD = /[?&](q|query|search|s)=|\/search\b|^https:\/\/[^/]+\/?$/i;
const BY_NUMBER = /\/search\/number\/\?article=[0-9A-Z]{8,}$/i;   // магазин запчастей показывает цены только на странице номера детали

const lists = [
  ['бампер', data],
  ['парктроники', data.pdc || {}],
  ['стекло', data.glass || {}],
];
let bad = 0;
for (const [name, box] of lists) {
  for (const o of [...(box.offers || []), ...(box.fresh || [])]) {
    if (!o.link) { console.log(`::warning::${name}/${o.id}: нет ссылки на объявление`); continue; }
    const url = o.link.replace(/\?PAGEN_1=\d+$/, '');
    const ok = o.linkKind === 'donor' ? DONOR.test(url)
      : o.linkKind === 'shop' ? /^https:\/\//.test(url) && (!SHOP_BAD.test(url) || BY_NUMBER.test(url))
      : AD.some(r => r.test(url));
    if (!ok) { bad++; console.log(`::error::${name}/${o.id}: ссылка не на объявление — ${o.link}`); }
  }
}
console.log(bad ? `Плохих ссылок: ${bad}` : 'Все ссылки ведут на объявления');
process.exit(bad ? 1 : 0);
