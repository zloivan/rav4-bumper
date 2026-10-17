// Записывает адрес развёрнутого чат-помощника в site/data.json (chatEndpoint).
import { readFile, writeFile } from 'node:fs/promises';

const DATA_PATH = new URL('../site/data.json', import.meta.url);
const raw = (process.env.URL || '') + '\n' + (process.env.OUT || '');
const m = raw.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i);
if (!m) { console.log('Адрес чата не найден в выводе wrangler'); process.exit(0); }
const data = JSON.parse(await readFile(DATA_PATH, 'utf8'));
if (data.chatEndpoint !== m[0]) {
  data.chatEndpoint = m[0];
  await writeFile(DATA_PATH, JSON.stringify(data, null, 1) + '\n');
}
console.log('Чат:', m[0]);
