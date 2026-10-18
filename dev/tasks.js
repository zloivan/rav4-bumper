/* ---------- Парктроники и лобовое стекло ---------- */
// Две новые детали, у каждой свои 4 шага. Данные — DATA.pdc и DATA.glass (vin, offers, fresh, checked, tip),
// отметки мамы — P (свой ключ в localStorage, бамперные отметки S не трогаем).
I.sensor = '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="3.2" fill="currentColor"/><path d="M11 7.6a6.4 6.4 0 0 1 0 8.8M14.6 5a10.2 10.2 0 0 1 0 14M18.2 2.6a13.6 13.6 0 0 1 0 18.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
I.glass = '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 5h13.6l3 13.5H2.2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="10" y="5" width="4" height="3" rx=".8" fill="currentColor"/><path d="M8 11.5l-1.6 4.5M12.2 11l-2.2 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/></svg>';

const TASK = {
  pdc:{
    title:'Парктроники', sub:'Датчики парковки в переднем бампере', icon:'sensor',
    lead:'Датчики в правом углу бампера разбиты. Находим такие же — их поставит мастер вместе с бампером.',
    doneTitle:'Датчики на месте',
    steps:[
      {n:1, title:'Какие датчики нужны', sub:'Номер по VIN и сколько штук'},
      {n:2, title:'Обзвон продавцов', sub:'Звоним и отмечаем ответы'},
      {n:3, title:'Сравнить и выбрать', sub:'Итог с покраской'},
      {n:4, title:'Установка', sub:'Ставит мастер вместе с бампером'}
    ],
    groups:{orig:{label:'Новый оригинал Toyota', cls:'g-asm'}, used:{label:'Б/у оригинал', cls:'g-cov'}, copy:{label:'Новый, неоригинал', cls:'g-new'}, new:{label:'Новый', cls:'g-new'}},
    addGroups:['orig', 'used', 'copy'],
    costs:{paint:40, install:0},
    live:[
      {name:'Kufar: датчики парктроника Toyota', url:'https://auto.kufar.by/l/zapchasti/z~toyota?spg=193'},
      {name:'Kufar: поиск по номеру 89341-42060', url:'https://auto.kufar.by/l/zapchasti?query=89341-42060'}
    ]
  },
  glass:{
    title:'Лобовое стекло', sub:'С камерой и датчиком дождя', icon:'glass',
    lead:'Меняем лобовое стекло. Главное — чтобы на новом был кронштейн для камеры и место под датчик дождя.',
    doneTitle:'Стекло на месте',
    steps:[
      {n:1, title:'Какое стекло нужно', sub:'Номер по VIN и что на нём есть'},
      {n:2, title:'Обзвон стекольщиков', sub:'Цена стекла с установкой'},
      {n:3, title:'Сравнить и выбрать', sub:'Стекло, установка, настройка камеры'},
      {n:4, title:'Настройка камеры', sub:'После замены — обязательно'}
    ],
    groups:{orig:{label:'Оригинал Toyota', cls:'g-asm'}, new:{label:'Новое, неоригинал', cls:'g-cov'}, used:{label:'Б/у', cls:'g-new'}, service:{label:'Мастерская, цена по телефону', cls:'g-don'}},
    addGroups:['new', 'orig', 'used'],
    costs:{install:80, calib:200},
    live:[
      {name:'Kufar: лобовые стёкла RAV4', url:'https://auto.kufar.by/l/zapchasti/z~toyota-rav4?spg=918'}
    ]
  }
};
const TKEYS = ['pdc', 'glass'];

/* Состояние */
const PKEY = 'rav4-parts-v1';
const tfresh = t => ({screen:'home', done:{}, calls:{}, custom:[], choice:null, qty:null, heat:null, finished:false, costs:Object.assign({}, TASK[t].costs)});
const pfresh = () => ({v:1, view:'hub', pdc:tfresh('pdc'), glass:tfresh('glass')});
let P = pfresh();
function pload(){
  try{
    const o = JSON.parse(localStorage.getItem(PKEY) || 'null');
    if(o && o.v === 1){
      const r = pfresh(); r.view = o.view || 'hub';
      TKEYS.forEach(t => { r[t] = Object.assign(tfresh(t), o[t] || {}); r[t].costs = Object.assign({}, TASK[t].costs, (o[t] || {}).costs || {}); });
      return r;
    }
  }catch(e){}
  return pfresh();
}
function psave(){ try{ localStorage.setItem(PKEY, JSON.stringify(P)); }catch(e){} }

/* Помощники */
const tData = t => DATA[t] || {};
function tOffers(t){
  const d = tData(t);
  return (d.offers || []).concat((d.fresh || []).map(o => Object.assign({phones:[]}, o, {auto:true})), P[t].custom || []);
}
const tFind = (t, id) => tOffers(t).find(o => o.id === id);
const tDone = t => TASK[t].steps.filter(s => P[t].done[s.n]).length;
const tNext = t => { const s = TASK[t].steps.find(x => !P[t].done[x.n]); return s ? s.n : null; };
const tGroup = (t, o) => TASK[t].groups[o.group] || TASK[t].groups.new;
function tPrice(t, o){ const c = P[t].calls[o.id]; if(c && c.status === 'yes' && +c.price > 0) return +c.price; return o.price; }
const qtyN = () => +P.pdc.qty > 0 ? +P.pdc.qty : 1;
const qtyTxt = () => +P.pdc.qty > 0 ? P.pdc.qty + ' шт.' : 'не знаю';
const tOpt = (k, v) => k === 'inst' ? ({yes:'с установкой', no:'без установки'})[v] : k === 'cam' ? ({yes:'кронштейн камеры есть', no:'кронштейна камеры нет'})[v] : colorTxt(v) ? 'цвет: ' + colorTxt(v) : '';
const range2 = (a, b) => a === b ? fmt(a) : fmt(a) + '–' + fmt(b);

/* Итог: деталь + покраска / установка + настройка */
function tTotal(t, o){
  const p = tPrice(t, o);
  if(!(p > 0)) return null;
  const c = P[t].calls[o.id] || {}, k = P[t].costs, ship = +o.shipping || 0;
  if(t === 'pdc'){
    const q = qtyN(), per = +k.paint || 0, inst = +k.install || 0;
    const painted = c.color === 'match' ? true : c.color === 'nomatch' ? false : o.painted;
    const pMin = painted === false ? per * q : 0, pMax = painted === true ? 0 : per * q;
    const base = p * q + inst + ship;
    const lines = [(q > 1 ? q + ' × ' + fmt(p) : 'датчик ' + fmt(p)), 'покраска ' + range2(pMin, pMax)];
    if(inst) lines.push('установка ' + fmt(inst));
    if(ship) lines.push('доставка ' + fmt(ship));
    return {price:p, min:base + pMin, max:base + pMax, lines};
  }
  const inc = c.inst === 'yes' ? true : c.inst === 'no' ? false : o.installIncluded;
  let iMin, iMax;
  if(inc === true){ iMin = iMax = 0; }
  else if(o.installPrice != null && c.inst !== 'no'){ iMin = iMax = +o.installPrice; }
  else if(inc === false){ iMin = iMax = +k.install || 0; }
  else { iMin = 0; iMax = +k.install || 0; }
  const cal = o.calibIncluded ? 0 : (o.calibPrice != null ? +o.calibPrice : +k.calib || 0);
  const lines = ['стекло ' + fmt(p) + (inc === true ? ' (с установкой)' : '')];
  if(inc !== true) lines.push('установка ' + range2(iMin, iMax));
  lines.push(o.calibIncluded ? 'настройка камеры входит' : 'настройка камеры ' + fmt(cal));
  if(ship) lines.push('доставка ' + fmt(ship));
  const base = p + cal + ship;
  return {price:p, min:base + iMin, max:base + iMax, lines};
}

/* Подходит ли вариант и что спросить */
function tIssues(t, o){
  const out = [], c = P[t].calls[o.id] || {};
  if(t === 'pdc'){
    if(o.partno && !o.exact && !/89341-?42060/i.test(o.partno)) out.push({t:'Другой номер (' + o.partno + ') — спросите, подходит ли вместо 89341-42060'});
    const painted = c.color === 'match' ? true : c.color === 'nomatch' ? false : o.painted;
    if(painted === false) out.push({t:'Датчик не вашего цвета — мастер покрасит его в 1G3 вместе с бампером (≈ +' + fmt(+P.pdc.costs.paint || 0) + ' BYN за штуку)'});
  } else {
    const cam = c.cam === 'yes' ? true : c.cam === 'no' ? false : o.camera;
    if(cam === false) out.push({t:'Без кронштейна камеры — не подойдёт: у вас камера системы защиты от столкновения', bad:true});
    if(o.partno && !o.exact && !/56101-?42511/i.test(o.partno)) out.push({t:'Другой номер (' + o.partno + ') — спросите, подходит ли вместо 56101-42511'});
    const need = P.glass.heat;
    if((need === 'full' || need === 'wipers') && o.heat === 'none') out.push({t:'Без обогрева, а у вас стекло с обогревом — обогрев перестанет работать'});
    if(need === 'full' && o.heat === 'yes') out.push({t:'У вас обогрев по всему стеклу — спросите, такой ли обогрев у этого стекла'});
    if((need === 'wipers' || need === 'none') && o.heat === 'full') out.push({t:'Это стекло с обогревом всей площади — вам такой не нужен, есть дешевле'});
  }
  if(o.warn) out.push({t:o.warn});
  return out;
}
function tAsks(t, o){
  const a = [], c = P[t].calls[o.id] || {};
  if(t === 'pdc'){
    if(!o.exact && o.group !== 'copy') a.push('номер датчика (нужен 89341-42060)');
    if(o.painted == null && !c.color) a.push('какого он цвета (у вас 1G3, тёмно-серый)');
    if(o.group === 'used') a.push('проверен ли датчик, работает ли');
  } else {
    if(o.camera == null && !c.cam) a.push('есть ли на стекле кронштейн под камеру и место под датчик дождя');
    if(o.installIncluded == null && o.installPrice == null && !c.inst) a.push('сколько стоит установка');
    if(o.heat == null && P.glass.heat !== 'none') a.push('есть ли обогрев' + (P.glass.heat === 'full' ? ' по всему стеклу' : P.glass.heat === 'wipers' ? ' в зоне дворников' : ''));
    if(o.calibPrice == null && o.calibIncluded == null && !o.noCalib) a.push('делают ли настройку камеры после замены');
    if(!o.delivery) a.push('сколько ждать');
  }
  return a;
}
function tScript(t){
  if(t === 'pdc'){
    return 'Здравствуйте! Мне нужен передний датчик парковки (парктроник) на Toyota RAV4 2018 года, рестайлинг, 40 кузов, гибрид. Номер детали 89341-42060, цвет 1G3 — тёмно-серый.' +
      (+P.pdc.qty > 0 ? ' Нужно ' + P.pdc.qty + ' шт.' : '') + ' Есть в наличии? Новый или б/у, оригинал? Какого цвета? Сколько стоит за штуку?';
  }
  const heat = ({wipers:' С обогревом зоны дворников.', full:' С обогревом всего стекла.', none:' Без обогрева.'})[P.glass.heat] || '';
  return 'Здравствуйте! Нужно лобовое стекло на Toyota RAV4 2018 года, рестайлинг, 40 кузов, гибрид, Европа. Номер детали 56101-42511 — с кронштейном камеры (система Pre-Collision) и датчиком дождя.' + heat +
    ' Какие марки есть и сколько стоит с установкой? Подойдёт ли под камеру рестайлинга 2016–2018? Сколько ждать? Делаете ли настройку камеры после замены?';
}

/* Отчёт */
function tReport(t){
  const T = TASK[t], st = P[t], L = [];
  L.push(T.title.toUpperCase() + ': шагов пройдено ' + tDone(t) + ' из ' + T.steps.length + (t === 'pdc' ? '; нужно датчиков: ' + qtyTxt() :
    '; обогрев стекла: ' + (({wipers:'у дворников', full:'по всему стеклу', none:'нет', unknown:'не знаю'})[st.heat] || 'не отмечено')));
  const called = tOffers(t).filter(o => (st.calls[o.id] || {}).status);
  called.forEach(o => {
    const c = st.calls[o.id], subs = ['color', 'inst', 'cam'].map(k => c[k] ? tOpt(k, c[k]) : '').filter(Boolean);
    L.push((c.status === 'yes' ? '✅ ' : c.status === 'no' ? '❌ ' : '⏳ ') + o.seller + (o.what ? ' (' + o.what + ')' : '') + ' — ' + statusTxt(c.status) +
      (c.status === 'yes' && tPrice(t, o) > 0 ? ', ' + fmt(tPrice(t, o)) + ' BYN' : '') + (subs.length ? ', ' + subs.join(', ') : '') + (c.note ? '. ' + c.note : '') + (o.link ? ' ' + o.link : ''));
  });
  if(!called.length) L.push('Звонков пока не было.');
  const ch = st.choice && tFind(t, st.choice);
  if(ch){ const x = tTotal(t, ch); L.push('Выбрано: ' + ch.seller + (x ? ', итого ≈ ' + rangeTxt(x) + ' BYN' : '')); }
  return L.join('\n');
}
function fullReport(){ return [tReport('pdc'), tReport('glass'), 'БАМПЕР (найден):\n' + report()].join('\n\n'); }

/* Куски интерфейса */
function tChoice(t, key, value, label){
  return '<button class="opt" data-act="tset" data-t="' + t + '" data-key="' + key + '" data-v="' + value + '" aria-pressed="' + (P[t][key] === value) + '">' + label + '</button>';
}
function vinParts(v, title){
  if(!(v.parts || []).length) return '';
  return '<details class="more"><summary>' + esc(title) + '</summary><div class="stack small">' + v.parts.map(p => '<div><span class="mono">' + esc(p[0]) + '</span> — ' + esc(p[1]) + '</div>').join('') + '</div></details>';
}
function tLive(t){
  return '<div class="card"><h3>Свежие объявления</h3>' +
    '<p class="small muted">Список выше обновляется сам каждое утро. Если хочется посмотреть самой — вот поиск.</p>' +
    '<div class="stack">' + TASK[t].live.map(l => '<a class="btn ghost block" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.name) + ' ' + I.ext + '</a>').join('') + '</div>' +
    '<p class="small muted">Нашли вариант сами — добавьте его в шаге 2 кнопкой «Добавить свой вариант».</p></div>';
}
function tAdBlock(t, o){
  const a = adInfo(o), p = tPrice(t, o), d = tData(t);
  if(!a) return '<div class="ad"><p class="small"><strong>Объявления нет.</strong> Цену и наличие называют по телефону.</p>' + (o.say ? '<p class="say">' + esc(o.say) + '</p>' : '') + '</div>';
  const when = o.custom ? 'добавлено вами' : o.auto ? 'найдено ' + (o.found || 'автоматически') : 'проверено ' + (o.checked || d.checked || '');
  const kind = o.linkKind === 'shop' ? 'shop' : a.kind;
  const what = t === 'pdc' ? 'датчик парковки на Toyota RAV4' : 'лобовое стекло на Toyota RAV4 2018';
  let head, btn, phrase, hint;
  if(kind === 'ad'){
    const where = a.site + (a.num ? ', № ' + a.num : '');
    head = '<strong>Объявление:</strong> ' + esc(where) + ' · ' + esc(when);
    btn = 'Открыть объявление';
    phrase = o.say || ('Скажите: «Здравствуйте, я по вашему объявлению на ' + where + ' — ' + what + (o.partno ? ', номер ' + o.partno : '') + (p > 0 ? ', цена ' + fmt(p) + ' р.' : '') + ' Ещё есть?»');
    hint = 'Чего-то не хватает — откройте объявление: там фото, описание и телефоны.';
  } else if(kind === 'shop'){
    head = '<strong>Страница магазина:</strong> ' + esc(a.site) + ' · ' + esc(when);
    btn = 'Открыть страницу магазина';
    phrase = o.say || ('Скажите: «Здравствуйте! Нужно ' + what + (o.partno ? ', ' + o.partno : t === 'pdc' ? ', номер 89341-42060' : ', номер 56101-42511, с камерой') + '. На сайте цена ' + (p > 0 ? fmt(p) + ' р.' : 'не указана') + ' — она актуальна? Есть в наличии?»');
    hint = 'На странице — цена и описание. Цены в магазинах меняются — уточните по телефону.';
  } else {
    head = '<strong>Ссылка не на объявление</strong> (' + esc(a.site) + ') · ' + esc(when);
    btn = 'Открыть страницу';
    phrase = o.say || ('Скажите: «Здравствуйте! Нужно ' + what + '. Есть в наличии?»');
    hint = 'Спросите у продавца номер детали и фото.';
  }
  return '<div class="ad"><p class="small">' + head + '</p>' +
    '<p class="say">' + esc(phrase) + '</p>' +
    '<div class="row" style="gap:8px"><a class="btn quiet" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + btn + ' ' + I.ext + '</a>' +
    '<button class="btn quiet" data-act="copy" data-text="' + esc(a.url) + '">Копировать ссылку</button>' +
    (DATA.chatEndpoint ? '<button class="btn quiet" data-act="askchat" data-id="' + esc(o.id) + '">Спросить помощника</button>' : '') + '</div>' +
    '<p class="small muted">' + hint + '</p></div>';
}
function subQ(t, o, key, q, opts){
  const c = P[t].calls[o.id] || {};
  return '<div class="stack"><p class="small"><strong>' + q + '</strong></p><div class="opts">' +
    opts.map(v => '<button class="opt" data-act="tsub" data-t="' + t + '" data-id="' + esc(o.id) + '" data-k="' + key + '" data-v="' + v[0] + '" aria-pressed="' + (c[key] === v[0]) + '">' + v[1] + '</button>').join('') + '</div></div>';
}
function tOfferCard(t, o){
  const c = P[t].calls[o.id] || {}, g = tGroup(t, o), iss = tIssues(t, o), ask = tAsks(t, o), tot = tTotal(t, o), p = tPrice(t, o);
  const id = esc(o.id), dt = ' data-t="' + t + '" data-id="' + id + '"';
  let h = '<article class="card offer' + (c.status ? ' st-' + c.status : '') + '">';
  h += '<div class="offer-head"><div class="stack" style="gap:6px"><div class="row" style="gap:6px"><span class="chip ' + g.cls + '">' + esc(g.label) + '</span>' +
    (o.exact ? '<span class="chip g-asm">Номер совпадает</span>' : '') + (o.auto ? '<span class="chip g-new">Новое' + (o.found ? ', ' + esc(o.found) : '') + '</span>' : '') +
    '</div><h3>' + esc(o.seller) + '</h3><p class="small">' + esc(o.what) + '</p></div>' +
    (p > 0 ? '<div class="price">' + fmt(p) + '<small>BYN' + (t === 'pdc' ? ' за штуку' : '') + ' · ' + usd(p) + '</small></div>' : '<div class="price small" style="font-size:18px">цена<small>спросить</small></div>') + '</div>';
  if(o.priceNote) h += '<p class="small muted">' + esc(o.priceNote) + '</p>';
  if(o.gone) h += '<div class="note bad"><span>Похоже, объявление снято (проверка ' + esc(o.gone) + '). Можно позвонить — вдруг ещё есть.</span></div>';
  h += tAdBlock(t, o);
  h += (o.phones && o.phones.length ? '' : '<p class="small muted">Телефон — в объявлении, кнопка «Открыть» выше.</p>') +
    '<div class="phones">' + (o.phones || []).map((ph, i) => phoneRow(ph[0], ph[1] || (i === 0 && o.phones.length > 1 ? 'основной' : ''), /WhatsApp/.test(ph[1] || '') ? o.wa : '')).join('') + '</div>';
  if(iss.length || ask.length){
    h += '<div class="flags">' + iss.map(i => '<div class="note ' + (i.bad ? 'bad' : 'warn') + '"><span>' + esc(i.t) + '</span></div>').join('') +
      (ask.length ? '<div class="note info"><span>Спросите: ' + esc(ask.join(', ')) + '.</span></div>' : '') + '</div>';
  }
  h += '<details class="more"><summary>Подробнее: описание, адрес</summary><div class="stack small">' +
    (o.includes ? '<p>' + esc(o.includes) + '</p>' : '') + '<div class="meta">' + (o.address ? '<span>Адрес: ' + esc(o.address) + '</span>' : (o.city ? '<span>Город: ' + esc(o.city) + '</span>' : '')) +
    (o.hours ? '<span>Часы: ' + esc(o.hours) + '</span>' : '') + (o.delivery ? '<span>Наличие: ' + esc(o.delivery) + '</span>' : '') +
    (o.custom ? '<span>Добавлено вами</span>' : o.auto ? '<span>Найдено автоматически' + (o.found ? ' ' + esc(o.found) : '') + '</span>' : '<span>Проверено ' + esc(o.checked || tData(t).checked || '') + '</span>') + '</div>' +
    (o.custom ? (U.tDel === o.id
      ? '<div class="row"><span>Удалить этот вариант?</span><button class="btn quiet" data-act="tdelyes"' + dt + '>Да, удалить</button><button class="btn quiet" data-act="tdelno"' + dt + '>Нет</button></div>'
      : '<button class="linkbtn" data-act="tdel"' + dt + '>Удалить этот вариант</button>') : '') +
    '</div></details>';
  h += '<div class="result"><p><strong>Что ответили?</strong></p><div class="opts">' +
    ['yes', 'no', 'later'].map(v => '<button class="opt ' + v + '" data-act="tcall"' + dt + ' data-v="' + v + '" aria-pressed="' + (c.status === v) + '">' + statusTxt(v).replace(/^./, m => m.toUpperCase()) + '</button>').join('') + '</div>';
  if(c.status === 'yes'){
    h += '<label class="field" for="tp-' + id + '">' + (t === 'pdc' ? 'Цена за один датчик, которую назвали (BYN)' : 'Цена стекла, которую назвали (BYN)') +
      '<input id="tp-' + id + '" type="number" inputmode="decimal" min="0" step="1" data-act="tprice"' + dt + ' value="' + esc(c.price != null ? c.price : (p > 0 ? p : '')) + '"></label>';
    if(t === 'pdc' && o.painted !== true) h += subQ(t, o, 'color', 'Датчик вашего цвета (тёмно-серый)?', [['match', 'Да'], ['nomatch', 'Нет'], ['unknown', 'Не знаю']]);
    if(t === 'glass'){
      if(o.installIncluded == null) h += subQ(t, o, 'inst', 'Цена с установкой?', [['yes', 'Да'], ['no', 'Нет']]);
      if(o.camera !== true) h += subQ(t, o, 'cam', 'Кронштейн для камеры есть?', [['yes', 'Есть'], ['no', 'Нет']]);
    }
  }
  if(c.status) h += '<label class="field" for="tn-' + id + '">Заметка (срок, марка, что сказали)<input id="tn-' + id + '" type="text" data-act="tnote"' + dt + ' value="' + esc(c.note || '') + '" placeholder="например: привезут в четверг"></label>';
  if(tot && c.status !== 'no') h += '<div class="total"><span>Всего' + (t === 'pdc' ? ' за ' + qtyN() + ' шт. с покраской' : ' с установкой и настройкой') + '</span><b>≈ ' + rangeTxt(tot) + ' BYN</b></div>';
  h += '</div></article>';
  return h;
}
function tAddForm(t){
  if(U.tAdd !== t) return '<button class="btn ghost block" data-act="tshowadd" data-t="' + t + '">+ Добавить свой вариант</button>';
  const G = TASK[t].groups;
  return '<form class="card" id="taddform" data-t="' + t + '"><h3>Новый вариант</h3>' +
    '<label class="field" for="ta-seller">Продавец<input id="ta-seller" type="text" required placeholder="например: магазин на Тимирязева"></label>' +
    '<label class="field" for="ta-phone">Телефон<input id="ta-phone" type="tel" required placeholder="+375 29 ..."></label>' +
    '<label class="field" for="ta-price">Цена' + (t === 'pdc' ? ' за штуку' : '') + ', BYN<input id="ta-price" type="number" inputmode="decimal" min="0" step="1" placeholder="например ' + (t === 'pdc' ? '120' : '500') + '"></label>' +
    '<label class="field" for="ta-group">Что это<select id="ta-group">' + TASK[t].addGroups.map((k, i) => '<option value="' + k + '"' + (i === 0 ? ' selected' : '') + '>' + esc(G[k].label) + '</option>').join('') + '</select></label>' +
    '<label class="field" for="ta-link">Ссылка на объявление (если есть)<input id="ta-link" type="url" placeholder="https://..."></label>' +
    '<div class="navrow"><button class="btn ghost" type="button" data-act="thideadd" data-t="' + t + '">Отмена</button><button class="btn" type="submit">Добавить</button></div></form>';
}

/* Экраны детали */
function tShell(t, n, body, opts){
  opts = opts || {};
  const T = TASK[t], s = T.steps[n - 1], N = T.steps.length;
  let h = '<div class="topbar"><button class="btn quiet" data-act="tgo" data-t="' + t + '" data-to="home">← ' + esc(T.title) + '</button><span class="muted small">Шаг ' + n + ' из ' + N + '</span></div>';
  h += '<header class="stack"><p class="eyebrow">' + esc(T.title) + '</p><h2>' + esc(s.title) + '</h2>' + (opts.lead ? '<p class="lead">' + opts.lead + '</p>' : '') + '</header>';
  if(P[t].done[n]) h += '<div class="note good">' + I.check + '<span>Этот шаг уже пройден. Можно вернуться и поменять ответы.</span></div>';
  h += body;
  h += '<div class="navrow">' +
    '<button class="btn ghost" data-act="tgo" data-t="' + t + '" data-to="' + (n > 1 ? n - 1 : 'home') + '">← Назад</button>' +
    '<button class="btn" data-act="tnext" data-t="' + t + '" data-n="' + n + '">' + (n === N ? 'Готово!' : 'Готово, дальше →') + '</button></div>';
  return h;
}
function tHome(t){
  const T = TASK[t], st = P[t], n = tNext(t), d = tDone(t), N = T.steps.length, d0 = tData(t);
  let h = '<div class="topbar"><button class="btn quiet" data-act="view" data-v="hub">← Все задачи</button><span></span></div>';
  h += '<header class="hero"><p class="eyebrow">Toyota RAV4 2018 · гибрид</p><h1>' + esc(T.title) + '</h1><p class="lead">' + esc(T.lead) + '</p></header>';
  h += '<div class="card progress"><strong>Пройдено ' + d + ' из ' + N + '</strong>' +
    '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + N + '" aria-valuenow="' + d + '"><i style="width:' + (d / N * 100) + '%"></i></div></div>';
  if(n){
    const s = T.steps[n - 1];
    h += '<div class="card accent"><p class="eyebrow">Ваш следующий шаг</p><h2>Шаг ' + n + '. ' + esc(s.title) + '</h2><p class="muted">' + esc(s.sub) + '</p>' +
      '<button class="btn block" data-act="tgo" data-t="' + t + '" data-to="' + n + '">Начать шаг ' + n + '</button></div>';
  } else {
    const ch = st.choice && tFind(t, st.choice), x = ch && tTotal(t, ch);
    h += '<div class="card accent"><p class="eyebrow">Всё пройдено</p><h2>' + esc(T.doneTitle) + '</h2>' +
      (ch ? '<p>Ваш выбор: <strong>' + esc(ch.seller) + '</strong>' + (x ? ', всего ≈ <strong>' + rangeTxt(x) + ' BYN</strong>' : '') + '.</p>' : '') + '</div>';
  }
  h += '<section class="road" aria-label="Шаги">';
  T.steps.forEach(s => {
    const cls = st.done[s.n] ? 'done' : (s.n === n ? 'current' : '');
    const dot = st.done[s.n] ? I.check : (s.n === n ? I.car : s.n);
    h += '<div class="stop ' + cls + '"><span class="dot">' + dot + '</span>' +
      '<button class="btn-step" data-act="tgo" data-t="' + t + '" data-to="' + s.n + '"><strong>' + s.n + '. ' + esc(s.title) + '</strong>' +
      '<span class="st">' + (st.done[s.n] ? 'Готово' : esc(s.sub)) + '</span></button></div>';
  });
  h += '<div class="stop ' + (st.finished ? 'done' : '') + '"><span class="dot">' + I.flag + '</span><div class="btn-step"><strong>Финиш</strong><span class="st">' + (st.finished ? 'Готово' : esc(T.doneTitle)) + '</span></div></div>';
  h += '</section>';
  h += reportBlock() + tLive(t);
  h += '<footer class="foot"><p>Список обновлён: ' + esc(DATA.updated || d0.checked || '') + '. Обновляется автоматически каждое утро. Цены и наличие меняются — уточняйте по телефону.</p>' +
    (U.tReset === t
      ? '<div class="row"><span>Стереть отметки по этой детали?</span><button class="btn quiet" data-act="tresetyes" data-t="' + t + '">Да, стереть</button><button class="btn quiet" data-act="tresetno" data-t="' + t + '">Нет</button></div>'
      : '<button class="linkbtn" data-act="treset" data-t="' + t + '">Начать заново</button>') + '</footer>';
  return h;
}

function pdc1(){
  const v = tData('pdc').vin || {};
  let b = '<div class="card accent"><p class="eyebrow">Уже узнали по VIN</p><h3>Датчик <span class="mono">' + esc(v.partno || '89341-42060-B2') + '</span></h3><ul class="plain">' +
    '<li>Он уже покрашен в ваш цвет <strong class="mono">1G3</strong> (тёмно-серый) — красить не нужно.</li>' +
    '<li>Тот же номер на всех четырёх местах спереди (и сзади тоже).</li>' +
    '<li>Без краски — <span class="mono">89341-42060-C0</span>, чёрный: его красят в цвет машины.</li>' +
    '<li>Продавцы часто пишут номер без хвостика: <span class="mono">89341-42060</span> или <span class="mono">8934142060</span>.</li></ul>' +
    (v.note ? '<p class="small muted">' + esc(v.note) + '</p>' : '') + vinParts(v, 'Номера всех деталей парктроников') + '</div>';
  b += '<div class="card"><h3>Где стоят датчики</h3><div class="figure"><svg viewBox="0 0 340 172" role="img" aria-label="Четыре датчика парковки на переднем бампере, вид спереди. Датчик 1 в правом углу, в зоне удара">' +
      '<path d="M12 40 Q8 110 30 146 H310 Q332 110 328 40 L232 50 Q170 66 108 50 Z" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"/>' +
      '<path d="M92 104 H248 L234 134 H106 Z" fill="var(--line)"/>' +
      '<path d="M15 44 L94 54 L100 146 H30 Q10 116 15 44 Z" fill="var(--stop-soft)" stroke="var(--stop)" stroke-width="2" stroke-dasharray="6 4"/>' +
      [[56, 88, '1', 'var(--stop)'], [128, 92, '2', 'var(--wait)'], [212, 92, '3', 'var(--ink)'], [284, 88, '4', 'var(--ink)']].map(s =>
        '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="9" fill="var(--surface-2)" stroke="' + s[3] + '" stroke-width="3"/><text x="' + (s[0] - 5) + '" y="' + (s[1] - 15) + '" class="svg-b">' + s[2] + '</text>').join('') +
      '<text x="14" y="26" class="svg-t">правый угол — удар</text><text x="250" y="26" class="svg-t">левый угол</text>' +
      '<text x="112" y="166" class="svg-t">вид на машину спереди</text>' +
    '</svg></div><p class="small muted">Скорее всего, разбит датчик 1 в правом углу, возможно и 2. Целые датчики мастер переставит со старого бампера на новый.</p></div>';
  b += '<div class="card"><h3>Сколько датчиков купить?</h3><p class="small muted">Точно скажет мастер, когда снимет старый бампер. Можно ответить потом — пока посчитаем за один.</p>' +
    '<div class="opts qty">' + ['1', '2', '3', '4'].map(q => tChoice('pdc', 'qty', q, q)).join('') + tChoice('pdc', 'qty', 'unknown', 'Не знаю') + '</div></div>';
  b += '<div class="note info"><span>Датчик вставляется в держатель на бампере изнутри. Если новый бампер — копия, спросите мастера, есть ли на нём держатели. Если нет — их переклеивают со старого бампера.</span></div>';
  return tShell('pdc', 1, b, {lead:'Номер датчика уже нашли по VIN. Осталось понять, сколько штук покупать.'});
}
function pdc4(){
  const memo = 'Для мастера: 1) Датчики парковки 89341-42060: новые поставить вместо разбитых, целые переставить со старого бампера. 2) Проверить держатели датчиков на новом бампере. 3) Если датчик не в цвет — покрасить в 1G3 вместе с бампером. 4) После установки проверить, что все датчики работают.';
  let b = '<div class="note good">' + I.check + '<span>Обычно датчики парковки после замены не настраивают — их вставляют в бампер и подключают. Когда поедете к дилеру настраивать радар, попросите заодно проверить парктроники.</span></div>';
  b += '<div class="card"><h3>Кто ставит</h3><p>Датчики ставит тот же мастер, что и бампер, — до того как бампер повесят на машину. Отдайте ему датчики вместе с бампером.</p>' +
    '<button class="btn quiet" data-act="view" data-v="bumper" data-to="6">Кузовные мастерские (бампер, шаг 6)</button></div>';
  b += '<div class="card soft"><h3>Памятка для мастера</h3><ol class="plain">' +
    '<li>Новые датчики <span class="mono">89341-42060</span> поставить вместо разбитых, целые переставить со старого бампера.</li>' +
    '<li>Проверить держатели датчиков на новом бампере.</li>' +
    '<li>Если датчик не в цвет — покрасить в <span class="mono">1G3</span> вместе с бампером.</li>' +
    '<li>После установки проверить, что все датчики работают.</li></ol>' +
    '<button class="btn quiet" data-act="copy" data-text="' + esc(memo) + '">Скопировать памятку</button></div>';
  b += '<p class="small muted">Как проверить самой: включите парктроник и медленно подъезжайте к стене. Писк должен начаться, когда до стены меньше метра.</p>';
  return tShell('pdc', 4, b, {lead:'Последний шаг. Датчики ставят вместе с бампером — отдельно ехать не нужно.'});
}
function glass1(){
  const v = tData('glass').vin || {};
  let b = '<div class="card accent"><p class="eyebrow">Уже узнали по VIN</p><h3>Стекло <span class="mono">' + esc(v.partno || '56101-42511') + '</span></h3><ul class="plain">' +
    '<li>На стекле есть <strong>кронштейн для камеры</strong> системы защиты от столкновения.</li>' +
    '<li>Есть место под <strong>датчик дождя</strong>.</li>' +
    '</ul>' +
    (v.note ? '<p class="small muted">' + esc(v.note) + '</p>' : '') + vinParts(v, 'Номера деталей стекла') + '</div>';
  b += '<div class="card"><h3>Что должно быть на стекле</h3><div class="figure"><svg viewBox="0 0 340 172" role="img" aria-label="Лобовое стекло из салона: у зеркала чёрный блок камеры и датчик дождя">' +
      '<path d="M44 26 H296 L330 150 H10 Z" fill="var(--accent-soft)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="140" y="26" width="50" height="30" rx="5" fill="var(--road)"/><circle cx="165" cy="41" r="6" fill="var(--surface-2)"/>' +
      '<rect x="198" y="30" width="22" height="16" rx="4" fill="var(--muted)"/>' +
      '<rect x="159" y="56" width="12" height="22" rx="3" fill="var(--muted)"/>' +
      '<rect x="120" y="78" width="90" height="22" rx="9" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/>' +
      '<path d="M140 41 H104" stroke="var(--accent)" stroke-width="2"/><text x="48" y="46" class="svg-t">камера</text>' +
      '<path d="M220 38 H244" stroke="var(--accent)" stroke-width="2"/><text x="248" y="42" class="svg-t">датчик</text><text x="248" y="56" class="svg-t">дождя</text>' +
      '<text x="136" y="122" class="svg-t">зеркало</text><text x="122" y="166" class="svg-t">вид из салона</text>' +
    '</svg></div><p class="small muted">Посмотрите изнутри у зеркала: чёрный блок на стекле — это камера. Новое стекло должно быть с кронштейном под неё, иначе камеру не поставить.</p></div>';
  b += '<div class="card"><h3>Есть ли у стекла обогрев?</h3><p>Посмотрите на стекло вблизи: видны тонкие проволочки?</p>' +
    '<div class="opts" style="grid-template-columns:1fr">' + tChoice('glass', 'heat', 'wipers', 'Только внизу, у дворников') + tChoice('glass', 'heat', 'full', 'По всему стеклу') +
    tChoice('glass', 'heat', 'none', 'Проволочек нет') + tChoice('glass', 'heat', 'unknown', 'Не знаю') + '</div>' +
    '<p class="small muted">От этого зависит, какое стекло брать: с обогревом по всему стеклу оно заметно дороже.</p></div>';
  b += '<div class="card"><h3>Какое стекло бывает</h3><ul class="plain">' +
    '<li><strong>Оригинал Toyota</strong> — дороже всего.</li>' +
    '<li><strong>Неоригинальное</strong> — разных марок и цен. Подходит, если на нём кронштейн камеры и место под датчик дождя.</li></ul>' +
    '<p class="small muted">Спросите у мастерской, какая марка, сколько ждать и есть ли гарантия на установку.</p></div>';
  if(S.kasko === 'yes') b += '<div class="note warn"><span><strong>У вас КАСКО.</strong> Позвоните в страховую до замены и спросите, оплатит ли она стекло.</span></div>';
  else if(S.kasko !== 'no') b += '<div class="note info"><span>Если есть КАСКО — сначала позвоните в страховую и спросите, оплатит ли она стекло.</span></div>';
  return tShell('glass', 1, b, {lead:'Номер стекла уже нашли по VIN. Здесь — что должно быть на новом стекле.'});
}
function glass4(){
  let b = '<div class="card"><h3>Зачем настройка</h3><p>За стеклом у зеркала стоит камера системы защиты от столкновения. После замены стекла камеру настраивают — иначе система может срабатывать неправильно.</p>' +
    '<p class="small muted">Некоторые стекольные мастерские настраивают камеру сами — спросите при звонке. Если нет — у дилера Toyota.</p></div>';
  b += '<div class="note info"><span><strong>Одна поездка вместо двух:</strong> после замены бампера у дилера настраивают радар. Запишитесь сразу на обе настройки — радара и камеры.</span></div>';
  b += '<div class="stack">' + DEALERS.map(d => '<div class="card"><h3>' + esc(d.name) + '</h3><div class="phones">' + d.phones.map(p => phoneRow(p, '')).join('') + '</div><p class="small muted">' + esc(d.addr) + (d.hours ? ' · ' + esc(d.hours) : '') + '</p></div>').join('') + '</div>';
  b += '<p class="small muted">При записи скажите: «Нужна настройка камеры и радара Toyota Safety Sense после замены лобового стекла и бампера. Сколько стоит?»</p>';
  return tShell('glass', 4, b, {lead:'Последний шаг. После него стекло на месте и система защиты работает как раньше.'});
}
function tCalls(t){
  const d = tData(t), list = tOffers(t).slice().sort((a, b) => (a.top || 99) - (b.top || 99)), nf = (d.fresh || []).length;
  let b = '<p class="small muted">Список обновлён: ' + esc(DATA.updated || d.checked || '') + '. Обновляется автоматически каждое утро.' + (nf ? ' Новых объявлений: ' + nf + '.' : '') + '</p>';
  b += '<div class="card soft"><h3>Что сказать продавцу</h3><p>' + esc(tScript(t)) + '</p>' +
    '<button class="btn quiet" data-act="copy" data-text="' + esc(tScript(t)) + '">Скопировать текст</button>' +
    '<p class="small muted">Номер телефона можно нажать — откроется звонок. Если не открылся, нажмите «Копировать» и вставьте номер в звонилку.</p></div>';
  if(d.tip) b += '<div class="note info"><span><strong>С чего начать:</strong> ' + esc(d.tip) + '</span></div>';
  b += list.length ? '<div class="stack">' + list.map(o => tOfferCard(t, o)).join('') + '</div>'
    : '<div class="note warn"><span>Пока вариантов нет. Ваня ищет, список обновляется каждое утро.</span></div>';
  b += tAddForm(t) + tLive(t);
  return tShell(t, 2, b, {lead:'Позвоните, спросите по тексту ниже и отметьте ответ.'});
}
function tCompare(t){
  const st = P[t], k = st.costs;
  const rows = tOffers(t).map(o => ({o, x:tTotal(t, o), c:st.calls[o.id] || {}})).filter(r => r.x && r.c.status !== 'no' && !tIssues(t, r.o).some(i => i.bad));
  const conf = rows.filter(r => r.c.status === 'yes').sort((a, b) => a.x.min - b.x.min);
  const rest = rows.filter(r => r.c.status !== 'yes').sort((a, b) => a.x.min - b.x.min);
  const best = conf.length ? conf[0].o.id : null;
  const item = r => {
    const on = st.choice === r.o.id, g = tGroup(t, r.o);
    return '<div class="card cmp-item' + (on ? ' chosen' : '') + '"><div class="stack" style="gap:4px">' +
      (r.o.id === best ? '<span><span class="badge">Самый дешёвый</span></span>' : '') +
      '<strong>' + esc(r.o.seller) + '</strong><span class="small">' + esc(r.o.what) + '</span><span class="chip ' + g.cls + '" style="align-self:flex-start">' + esc(g.label) + '</span></div>' +
      '<div class="sum">' + rangeTxt(r.x) + '<small class="small muted" style="display:block;font-family:var(--font-body)">BYN · ' + usd(r.x.min) + '</small></div>' +
      '<div class="break">' + esc(r.x.lines.join(' + ')) + '</div>' +
      '<button class="btn ' + (on ? '' : 'ghost') + ' block" style="grid-column:1/-1" data-act="tchoose" data-t="' + t + '" data-id="' + esc(r.o.id) + '">' + (on ? 'Выбрано ' + I.check : 'Выбрать этот') + '</button></div>';
  };
  let b = '';
  if(t === 'pdc') b += '<div class="note info"><span>Считаем за <strong>' + qtyN() + ' шт.</strong>' + (+P.pdc.qty > 0 ? '' : ' Сколько нужно — отметьте в шаге 1.') + '</span></div>';
  if(conf.length) b += '<h3>Есть в наличии (по вашим звонкам)</h3><div class="cmp">' + conf.map(item).join('') + '</div>';
  else b += '<div class="note warn"><span>Пока никто не подтвердил наличие. Ниже — примерные итоги по ценам с сайтов. Отметьте звонки в шаге 2, и здесь появятся точные цифры.</span></div>';
  if(rest.length) b += '<details class="more"' + (conf.length ? '' : ' open') + '><summary>' + (conf.length ? 'Ещё не звонили (' + rest.length + ')' : 'Все варианты по ценам с сайтов') + '</summary><div class="cmp">' + rest.map(item).join('') + '</div></details>';
  const cost = (key, label, step) => '<label class="field" for="tk-' + key + '">' + label + '<input id="tk-' + key + '" type="number" inputmode="decimal" min="0" step="' + step + '" data-act="tcost" data-t="' + t + '" data-key="' + key + '" value="' + esc(k[key]) + '"></label>';
  b += '<div class="card soft"><h3>Цены работ</h3><p class="small muted">Примерные цены в Минске. Знаете точную — поменяйте.</p><div class="costs">' +
    (t === 'pdc'
      ? cost('paint', 'Покраска одного датчика (оценка), BYN', 5) + cost('install', 'Установка, если не вместе с бампером, BYN', 5)
      : cost('install', 'Установка стекла, если не входит в цену, BYN', 10) + cost('calib', 'Настройка камеры, BYN', 10)) + '</div>' +
    (t === 'pdc' ? '<p class="small muted">Датчик в цвет 1G3 (номер с окончанием B2) красить не нужно. Цены покраски датчика на сайтах нет — 40 BYN это оценка, спросите мастера, который красит бампер. Отдельная замена датчика в СТО — от 50 BYN за штуку; вместе с бампером спросите, входит ли в работу.</p>'
      : '<p class="small muted">Установка стекла в Минске — примерно 70–120 BYN. Настройка камеры — у дилера или в мастерской с оборудованием (Стеклоавто: от 200 до 500 BYN). Её можно сделать вместе с настройкой радара после бампера.</p>') + '</div>';
  b += '<div class="note info"><span>Платите, когда увидели деталь своими глазами. За «под заказ» — при получении.</span></div>';
  return tShell(t, 3, b, {lead:t === 'pdc' ? 'Датчики плюс покраска, если они не в цвет. Самый дешёвый в наличии — сверху.' : 'Стекло плюс установка и настройка камеры. Самый дешёвый в наличии — сверху.'});
}
function tRender(t){
  const v = P[t].screen;
  if(v === 'home') return tHome(t);
  const steps = t === 'pdc' ? [null, pdc1, () => tCalls('pdc'), () => tCompare('pdc'), pdc4] : [null, glass1, () => tCalls('glass'), () => tCompare('glass'), glass4];
  return steps[+v] ? steps[+v]() : tHome(t);
}

/* Главная: все задачи */
function taskCard(t){
  const T = TASK[t], st = P[t], d = tDone(t), n = tNext(t), N = T.steps.length, offers = tOffers(t);
  const prices = offers.map(o => tPrice(t, o)).filter(p => p > 0);
  const called = offers.filter(o => (st.calls[o.id] || {}).status).length;
  const ch = st.choice && tFind(t, st.choice), v = tData(t).vin || {};
  let h = '<article class="card accent task"><div class="task-head"><span class="task-ico">' + I[T.icon] + '</span><div>' +
    '<p class="eyebrow">' + (st.finished ? 'Готово' : n ? 'Шаг ' + n + ' из ' + N : 'Все шаги пройдены') + '</p><h2>' + esc(T.title) + '</h2><p class="muted">' + esc(T.sub) + '</p></div></div>';
  h += '<div class="bar" role="progressbar" aria-label="Пройдено шагов" aria-valuemin="0" aria-valuemax="' + N + '" aria-valuenow="' + d + '"><i style="width:' + (d / N * 100) + '%"></i></div>';
  h += '<div class="facts">' + (v.partno ? '<span>Номер по VIN: <strong class="mono">' + esc(v.partno) + '</strong></span>' : '') +
    '<span>Вариантов: ' + offers.length + (prices.length ? ', от ' + fmt(Math.min.apply(null, prices)) + ' BYN' + (t === 'pdc' ? ' за штуку' : '') : '') + '</span>' +
    (called ? '<span>Обзвонено: ' + called + '</span>' : '') + (ch ? '<span>Выбрано: <strong>' + esc(ch.seller) + '</strong></span>' : '') + '</div>';
  h += n ? '<button class="btn block" data-act="tgo" data-t="' + t + '" data-to="' + n + '">Шаг ' + n + ': ' + esc(T.steps[n - 1].title) + '</button>' +
      '<button class="btn quiet block" data-act="tgo" data-t="' + t + '" data-to="home">Все шаги</button>'
    : '<button class="btn ghost block" data-act="tgo" data-t="' + t + '" data-to="home">Открыть</button>';
  return h + '</article>';
}
function bumperCard(){
  const nf = FRESH.length;
  if(!DATA.bumperClosed){
    const n = nextStep();
    return '<article class="card accent task"><div class="task-head"><span class="task-ico">' + I.car + '</span><div><p class="eyebrow">' + (n ? 'Шаг ' + n + ' из 7' : 'Все шаги пройдены') + '</p><h2>Бампер</h2><p class="muted">Ищем снова' + (nf ? ' · новых объявлений: ' + nf : '') + '</p></div></div>' +
      '<button class="btn block" data-act="view" data-v="bumper" data-to="home">Открыть бампер</button></article>';
  }
  return '<section class="card closed" aria-label="Бампер"><div class="row" style="justify-content:space-between"><h3>Бампер</h3><span class="chip g-asm">Нашли' + (DATA.bumperClosed ? ' ' + esc(DATA.bumperClosed) : '') + '</span></div>' +
    '<p class="small muted">Поиск закрыт. Если на бампере найдут дефекты — здесь всё сохранено: продавцы, ваши звонки и отметки. Объявления по-прежнему собираются каждое утро' + (nf ? ' (сейчас новых: ' + nf + ')' : '') + '.</p>' +
    '<div class="row"><button class="btn quiet" data-act="view" data-v="bumper" data-to="home">Открыть бампер</button>' +
    '<button class="btn quiet" data-act="view" data-v="bumper" data-to="6">Покраска и установка</button>' +
    '<button class="btn quiet" data-act="view" data-v="bumper" data-to="7">Радар у дилера</button></div></section>';
}
function hub(){
  let h = '<header class="hero"><p class="eyebrow">Toyota RAV4 2018 · гибрид</p><h1>Ремонт RAV4</h1>' +
    '<p class="lead">' + (DATA.bumperClosed ? 'Бампер нашли. Теперь ищем парктроники и лобовое стекло' : 'Ищем бампер, парктроники и лобовое стекло') + ' — так же: узнаём номер, обзваниваем, сравниваем и ставим.</p></header>';
  if(!DATA.bumperClosed) h += bumperCard();
  h += taskCard('pdc') + taskCard('glass');
  h += '<div class="note info"><span><strong>Одна поездка к дилеру:</strong> после бампера настраивают радар, после стекла — камеру. Запишитесь сразу на обе настройки.</span></div>';
  h += (DATA.bumperClosed ? bumperCard() : '') + reportBlock();
  h += '<footer class="foot"><p>Данные обновлены: ' + esc(DATA.updated || CHECKED) + '. Обновляются автоматически каждое утро. Цены и наличие меняются — уточняйте по телефону.</p></footer>';
  return h;
}

/* События */
function tgo(t, to){
  P.view = t; P[t].screen = String(to); U.tAdd = null; U.tDel = null; U.tReset = null;
  psave(); render(); window.scrollTo(0, 0);
}
function tClick(a, el){
  const t = el.dataset.t, st = P[t], id = el.dataset.id;
  if(!st) return false;
  const rr = () => { psave(); const y = window.scrollY; render(); window.scrollTo(0, y); };
  if(a === 'tgo'){ tgo(t, el.dataset.to); return true; }
  if(a === 'tnext'){
    const n = +el.dataset.n, first = !st.done[n]; st.done[n] = true;
    if(n === TASK[t].steps.length){ st.finished = true; tgo(t, 'home'); if(first){ toast(TASK[t].doneTitle + '!'); confetti(); } return true; }
    tgo(t, n + 1); if(first) toast('Шаг ' + n + ' пройден!');
    return true;
  }
  if(a === 'tset'){ st[el.dataset.key] = el.dataset.v; rr(); return true; }
  if(a === 'tcall'){ const c = st.calls[id] || {}; c.status = c.status === el.dataset.v ? null : el.dataset.v; st.calls[id] = c; rr(); if(c.status === 'yes') toast('Нашёлся! Запишите цену'); return true; }
  if(a === 'tsub'){ const c = st.calls[id] || {}; c[el.dataset.k] = c[el.dataset.k] === el.dataset.v ? null : el.dataset.v; st.calls[id] = c; rr(); return true; }
  if(a === 'tchoose'){ st.choice = id; rr(); toast('Выбор сохранён'); return true; }
  if(a === 'tshowadd'){ U.tAdd = t; render(); const f = $('#ta-seller'); if(f) f.focus(); return true; }
  if(a === 'thideadd'){ U.tAdd = null; render(); return true; }
  if(a === 'tdel'){ U.tDel = id; render(); return true; }
  if(a === 'tdelno'){ U.tDel = null; render(); return true; }
  if(a === 'tdelyes'){ st.custom = st.custom.filter(o => o.id !== id); delete st.calls[id]; if(st.choice === id) st.choice = null; U.tDel = null; rr(); toast('Удалено'); return true; }
  if(a === 'treset'){ U.tReset = t; render(); return true; }
  if(a === 'tresetno'){ U.tReset = null; render(); return true; }
  if(a === 'tresetyes'){ P[t] = tfresh(t); U.tReset = null; psave(); render(); window.scrollTo(0, 0); toast('Начинаем заново'); return true; }
  return false;
}
function tInput(a, el){
  const t = el.dataset.t, st = P[t]; if(!st) return;
  if(a === 'tprice' || a === 'tnote'){ const c = st.calls[el.dataset.id] || {}; if(a === 'tprice') c.price = el.value === '' ? null : +el.value; else c.note = el.value; st.calls[el.dataset.id] = c; psave(); return; }
  if(a === 'tcost'){ st.costs[el.dataset.key] = el.value === '' ? 0 : +el.value; psave(); }
}
function tAdd(t){
  const seller = $('#ta-seller').value.trim(), phone = $('#ta-phone').value.trim();
  if(!seller || !phone){ toast('Впишите продавца и телефон'); return; }
  const price = +$('#ta-price').value || null, group = $('#ta-group').value, link = $('#ta-link').value.trim();
  P[t].custom.push({id:'c' + Date.now(), custom:true, group, seller, what:TASK[t].groups[group].label, price, phones:[[phone, '']], includes:'', address:'', hours:'', delivery:'', link:/^https?:\/\//.test(link) ? link : ''});
  U.tAdd = null; psave(); render(); toast('Вариант добавлен');
}
