// Чат-помощник для сайта «Бампер для RAV4». Cloudflare Worker + Workers AI (бесплатный план).
// Ключей в коде нет: модель вызывается через привязку env.AI. На бесплатном плане сверх дневного лимита
// запросы просто перестают отвечать — денег не списывается.

const MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct'];

function json(body, status, cors) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors } });
}

let cache = { at: 0, data: null };
async function loadData(env) {
  if (cache.data && Date.now() - cache.at < 10 * 60 * 1000) return cache.data;
  try {
    const r = await fetch(env.SITE_URL + 'data.json?t=' + Date.now());
    if (r.ok) cache = { at: Date.now(), data: await r.json() };
  } catch (e) { /* оставляем старые данные */ }
  return cache.data || {};
}

const G = { assembly: 'б/у оригинал в сборе', cover: 'б/у оригинал, только бампер', copy: 'новый неоригинал', donor: 'разборка, спросить' };

function offerLine(o) {
  const phones = (o.phones || []).map(p => p[0] + (p[1] ? ' (' + p[1] + ')' : '')).join(', ') || 'телефон в объявлении';
  const price = o.price ? o.price + ' BYN' + (o.pricePdc ? ' (с отверстиями под парктроники ' + o.pricePdc + ' BYN)' : '') : 'цена не указана';
  return '- ' + o.seller + ' — ' + (G[o.group] || o.group) + '. ' + o.what + '. Цена: ' + price + '. Тел.: ' + phones +
    (o.address ? '. Адрес: ' + o.address : '') + (o.hours ? '. Часы: ' + o.hours : '') + (o.delivery ? '. Наличие: ' + o.delivery : '') +
    (o.say ? '. ' + o.say : '') + (o.includes ? '. Подробности: ' + o.includes : '') + (o.gone ? '. ВНИМАНИЕ: объявление, похоже, снято ' + o.gone : '') +
    (o.link ? '. Ссылка: ' + o.link : '');
}

function systemPrompt(d, state) {
  const v = d.vin || {};
  return [
    'Ты — помощник на сайте «Бампер для RAV4». Ты помогаешь пожилой женщине в Минске найти и поставить передний бампер на её машину как можно дешевле и без лишних хлопот. Её сын Ваня живёт в другой стране и помогает удалённо.',
    'Отвечай по-русски, коротко, простыми словами, без технического жаргона. Обращайся на «вы». Если нужен порядок действий — пиши нумерованным списком из 2–5 пунктов.',
    'Опирайся ТОЛЬКО на данные ниже. Не выдумывай продавцов, телефоны, цены и наличие. Если чего-то нет в данных — так и скажи и посоветуй позвонить продавцу или написать Ване.',
    'Никогда не советуй платить вперёд, пока деталь не увидели вживую или на фото с номером. Не давай юридических и финансовых гарантий.',
    '',
    'МАШИНА (по VIN из техпаспорта, каталог Toyota для Европы): ' + (v.model || 'Toyota RAV4 2018 гибрид') + '. Код краски ' + (v.paint || '1G3') + ' (тёмно-серый). Спереди есть парктроники и радар защиты от столкновения. Омывателей фар и противотуманок нет (стоят заглушки). Нужный бампер: ' + (v.partno || '52119-4A911') + ' — под парктроники, без омывателей фар.',
    'Номера деталей: ' + (v.parts || []).map(p => p[0] + ' — ' + p[1]).join('; ') + '.',
    'Повреждение: порван правый передний угол бампера, разбиты нижняя решётка и площадка под номер. Наезд на косулю.',
    'Не подходят: бамперы до рестайлинга 2013–2015 и новой модели 2019+.',
    '',
    'ПРОДАВЦЫ (проверено ' + (d.checked || '') + ', обновлено ' + (d.updated || '') + '):',
    ...(d.offers || []).map(offerLine),
    ...((d.fresh || []).length ? ['НОВЫЕ ОБЪЯВЛЕНИЯ:', ...(d.fresh || []).map(offerLine)] : []),
    '',
    'ПРИМЕРНЫЕ ЦЕНЫ РАБОТ В МИНСКЕ: покраска бампера 450–750 BYN, снять и поставить бампер 40–80 BYN, мелочи (нижняя решётка, площадка под номер, заглушка, клипсы) около 150 BYN. Бампер в сборе вашего цвета можно не красить.',
    'КУЗОВНЫЕ СТО: KUZOV.BY (ул. Куприянова, 4; +375 29 655-10-47) — продают копию и ставят сами; «Лак и Мастер» (ул. Свердлова, 23; +375 29 329-40-00) — «бампер 750 BYN под ключ»; JDM Motors (Брилевский тупик, 16; +375 29 130-85-85) — Toyota/Lexus; СТО Миура (пер. Промышленный, 11/2; +375 29 555-11-88); pokrasimavto.by (ул. Рогачевская, 16 к8; +375 29 388-08-60).',
    'ПАМЯТКА ДЛЯ МАСТЕРА: значок Toyota на решётке не красить — за ним радар; лишние отверстия заделать до покраски; клипсы новые; решётку со значком и серебристую накладку перенести со старого бампера, если целы.',
    'РАДАР: после замены бампера нужна настройка радара у дилера («Настройка датчиков Safety Sense»): Тойота Центр Минск Восток, пр. Независимости, 202/1, +375 44 561-77-77; Тойота Центр Минск, ул. Орловская, 88, +375 17 356-65-55.',
    'СТРАХОВКА: ремонт своей машины после наезда на дикое животное оплачивает только КАСКО (сообщить страховой до ремонта); обычная ОСГО не платит. Штрафа за случайно сбитую косулю нет.',
    '',
    'ЧТО УЖЕ ОТМЕЧЕНО НА САЙТЕ (звонки и выбор):',
    state || 'ничего'
  ].join('\n');
}

export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGIN || '';
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return new Response('Помощник работает.', { headers: cors });
    if (allowed && origin !== allowed) return json({ error: 'forbidden' }, 403, cors);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400, cors); }
    const messages = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 1500) }))
      .filter(m => m.content);
    if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'empty' }, 400, cors);

    const data = await loadData(env);
    const system = systemPrompt(data, String(body.state || '').slice(0, 3000));
    for (const model of MODELS) {
      try {
        const r = await env.AI.run(model, { messages: [{ role: 'system', content: system }, ...messages], max_tokens: 700, temperature: 0.3 });
        const text = (r && (r.response || (r.result && r.result.response))) || '';
        if (text) return json({ reply: String(text).trim(), model }, 200, cors);
      } catch (e) { /* пробуем следующую модель */ }
    }
    return json({ error: 'unavailable' }, 503, cors);
  }
};
