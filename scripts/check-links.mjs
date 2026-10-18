// Проверяет ссылки в site/data.json: каждая должна вести на само объявление
// (или, если помечена linkKind:"donor", на страницу машины-донора на bamper.by).
// Поиск, каталоги и прочие страницы — ошибка: мама откроет их и не найдёт бампер.
// Те же правила — в linkKind() в dev/site_template.html.
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../site/data.json', import.meta.url), 'utf8'));
const AD = [
  /^https:\/\/(auto\.)?kufar\.by\/(vi\/[^/?#]+|item)\/\d+\/?$/,
  /^https:\/\/bamper\.by\/zapchast_[a-z-]+\/[\w-]+\/?$/,
];
const DONOR = /^https:\/\/bamper\.by\/zchbu\/vin_[A-HJ-NPR-Z0-9]{17}\/?$/;

let bad = 0;
for (const o of [...(data.offers || []), ...(data.fresh || [])]) {
  if (!o.link) { console.log(`::warning::${o.id}: нет ссылки на объявление`); continue; }
  const url = o.link.replace(/\?PAGEN_1=\d+$/, '');
  const ok = o.linkKind === 'donor' ? DONOR.test(url) : AD.some(r => r.test(url));
  if (!ok) { bad++; console.log(`::error::${o.id}: ссылка не на объявление — ${o.link}`); }
}
console.log(bad ? `Плохих ссылок: ${bad}` : 'Все ссылки ведут на объявления');
process.exit(bad ? 1 : 0);
