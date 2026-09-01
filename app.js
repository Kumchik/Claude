/* =========================================================
   ЩЁЛК — configurator logic
   Плейсхолдер-цены и контакты: см. README.md, где что заменить.
   ========================================================= */

const PATTERNS = [
  { id: 'solid',    name: 'Однотон',   cls: 'pattern-solid',    surcharge: 0   },
  { id: 'dots',     name: 'Горошек',   cls: 'pattern-dots',     surcharge: 150 },
  { id: 'stripes',  name: 'Полоски',   cls: 'pattern-stripes',  surcharge: 150 },
  { id: 'waves',    name: 'Волна',     cls: 'pattern-waves',    surcharge: 180 },
  { id: 'marble',   name: 'Мрамор',    cls: 'pattern-marble',   surcharge: 200 },
  { id: 'terrazzo', name: 'Терраццо',  cls: 'pattern-terrazzo', surcharge: 220 },
];

const COLORS = [
  { id: 'coral',      name: 'Коралл',     hex: '#FF6B6B' },
  { id: 'mint',       name: 'Мята',       hex: '#5EC8B8' },
  { id: 'mustard',    name: 'Горчица',    hex: '#FFC857' },
  { id: 'lilac',      name: 'Лаванда',    hex: '#B8A6E8' },
  { id: 'sky',        name: 'Небо',       hex: '#6FB7F7' },
  { id: 'blush',      name: 'Пудра',      hex: '#F4A6C6' },
  { id: 'sage',       name: 'Шалфей',     hex: '#9CB88F' },
  { id: 'terracotta', name: 'Терракота',  hex: '#D97D54' },
  { id: 'charcoal',   name: 'Графит',     hex: '#4A4550' },
  { id: 'cream',      name: 'Крем',       hex: '#F3E9DA' },
];

const FINISHES = [
  { id: 'matte',  name: 'Матовое',    surcharge: 0   },
  { id: 'glossy', name: 'Глянцевое',  surcharge: 100 },
];

const KEY_BASE_PRICE = { 1: 690, 2: 890, 3: 1090, 4: 1290 };

const CATALOG = [
  { name: 'Утренний кофе',    keys: 2, pattern: 'dots',     color: 'terracotta' },
  { name: 'Мятная свежесть',  keys: 1, pattern: 'solid',    color: 'mint' },
  { name: 'Дискотека',        keys: 3, pattern: 'terrazzo', color: 'lilac' },
  { name: 'Скандинавия',      keys: 1, pattern: 'marble',   color: 'cream' },
  { name: 'Закат',            keys: 2, pattern: 'waves',    color: 'coral' },
  { name: 'Горчичное поле',   keys: 4, pattern: 'stripes',  color: 'mustard' },
  { name: 'Ночной город',     keys: 2, pattern: 'solid',    color: 'charcoal' },
  { name: 'Пудровый бриз',    keys: 1, pattern: 'dots',     color: 'blush' },
];

const FAQ = [
  {
    q: 'Как понять, сколько клавиш у моего выключателя?',
    a: 'Посчитайте количество отдельных кнопок (клавиш) на панели — обычно от 1 до 4. Если сомневаетесь, пришлите нам фото выключателя в мессенджере, и мы подскажем.'
  },
  {
    q: 'Подойдёт ли накладка к моей рамке?',
    a: 'Печатаем накладки под стандартные рамки популярных серий (Legrand, Schneider Electric, Werkel и аналоги). При оформлении заказа уточним модель рамки, чтобы посадка была точной.'
  },
  {
    q: 'Из какого материала печатаете?',
    a: 'Используем прочный PLA/PETG пластик — он не токсичен, устойчив к истиранию и не выгорает на солнце. При необходимости покрываем матовым или глянцевым финишем.'
  },
  {
    q: 'Сколько занимает изготовление и доставка?',
    a: 'Печать и финишная обработка — 3–5 дней после согласования макета. Доставка по России — ещё 2–7 дней в зависимости от способа отправки.'
  },
  {
    q: 'Можно заказать цвет вне палитры конструктора?',
    a: 'Да, палитра в конструкторе — основные варианты. Пришлите референс или код цвета (HEX/RAL/Pantone) в сообщении к заказу — подберём максимально близко.'
  },
  {
    q: 'Как оплатить заказ?',
    a: 'Оплата не происходит на сайте. После заявки мы согласуем макет и стоимость в переписке, затем пришлём реквизиты для предоплаты.'
  },
];

/* ---------------- state ---------------- */
const state = {
  keys: 1,
  pattern: 'solid',
  color: 'coral',
  finish: 'matte',
};

function getColor(id){ return COLORS.find(c => c.id === id); }
function getPattern(id){ return PATTERNS.find(p => p.id === id); }
function getFinish(id){ return FINISHES.find(f => f.id === id); }

function calcPrice(){
  const base = KEY_BASE_PRICE[state.keys] || KEY_BASE_PRICE[1];
  const patternFee = getPattern(state.pattern).surcharge;
  const finishFee = getFinish(state.finish).surcharge;
  return base + patternFee + finishFee;
}

/* ---------------- rendering helpers ---------------- */
function buildPlateEl(keys, patternCls, colorHex, finishId, size){
  const plate = document.createElement('div');
  plate.className = `switch-plate ${patternCls}`;
  plate.style.setProperty('--plate-color', colorHex);
  for (let i = 0; i < keys; i++){
    const key = document.createElement('div');
    key.className = 'switch-key' + (finishId === 'glossy' ? ' finish-glossy key-glossy' : '');
    plate.appendChild(key);
  }
  return plate;
}

/* ---------------- catalog ---------------- */
function renderCatalog(){
  const grid = document.getElementById('catalogGrid');
  grid.innerHTML = '';
  CATALOG.forEach(item => {
    const card = document.createElement('div');
    card.className = 'catalog-card';

    const frame = document.createElement('div');
    frame.className = 'switch-frame';
    const color = getColor(item.color);
    const pattern = getPattern(item.pattern);
    frame.appendChild(buildPlateEl(item.keys, pattern.cls, color.hex, 'matte'));
    card.appendChild(frame);

    const h3 = document.createElement('h3');
    h3.textContent = item.name;
    card.appendChild(h3);

    const price = document.createElement('span');
    price.className = 'price';
    const base = KEY_BASE_PRICE[item.keys] + pattern.surcharge;
    price.textContent = `от ${base} ₽`;
    card.appendChild(price);

    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-small';
    btn.textContent = 'Настроить';
    btn.addEventListener('click', () => {
      state.keys = item.keys;
      state.pattern = item.pattern;
      state.color = item.color;
      renderOptions();
      updatePreview();
      document.getElementById('configurator').scrollIntoView({ behavior: 'smooth' });
    });
    card.appendChild(btn);

    grid.appendChild(card);
  });
}

/* ---------------- configurator options ---------------- */
function renderOptions(){
  // keys
  const keysRow = document.getElementById('optKeys');
  keysRow.innerHTML = '';
  [1, 2, 3, 4].forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'opt-pill' + (state.keys === n ? ' active' : '');
    btn.textContent = n === 1 ? '1 клавиша' : `${n} клавиши`;
    btn.addEventListener('click', () => { state.keys = n; renderOptions(); updatePreview(); });
    keysRow.appendChild(btn);
  });

  // pattern
  const patternRow = document.getElementById('optPattern');
  patternRow.innerHTML = '';
  PATTERNS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'opt-pattern' + (state.pattern === p.id ? ' active' : '');
    const swatch = document.createElement('div');
    swatch.className = `swatch ${p.cls}`;
    swatch.style.setProperty('--plate-color', getColor(state.color).hex);
    btn.appendChild(swatch);
    const label = document.createElement('span');
    label.textContent = p.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => { state.pattern = p.id; renderOptions(); updatePreview(); });
    patternRow.appendChild(btn);
  });

  // color
  const colorRow = document.getElementById('optColor');
  colorRow.innerHTML = '';
  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'opt-color' + (state.color === c.id ? ' active' : '');
    btn.style.background = c.hex;
    btn.title = c.name;
    btn.setAttribute('aria-label', c.name);
    btn.addEventListener('click', () => { state.color = c.id; renderOptions(); updatePreview(); });
    colorRow.appendChild(btn);
  });

  // finish
  const finishRow = document.getElementById('optFinish');
  finishRow.innerHTML = '';
  FINISHES.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'opt-pill' + (state.finish === f.id ? ' active' : '');
    btn.textContent = f.surcharge ? `${f.name} (+${f.surcharge} ₽)` : f.name;
    btn.addEventListener('click', () => { state.finish = f.id; renderOptions(); updatePreview(); });
    finishRow.appendChild(btn);
  });
}

/* ---------------- live preview ---------------- */
function updatePreview(){
  const plateHolder = document.getElementById('livePreviewPlate');
  const color = getColor(state.color);
  const pattern = getPattern(state.pattern);
  const newPlate = buildPlateEl(state.keys, pattern.cls, color.hex, state.finish);
  newPlate.id = 'livePreviewPlate';
  plateHolder.replaceWith(newPlate);

  document.getElementById('metaKeys').textContent = state.keys;
  document.getElementById('metaPattern').textContent = pattern.name;
  document.getElementById('metaColor').textContent = color.name;
  document.getElementById('metaFinish').textContent = getFinish(state.finish).name;

  const price = calcPrice();
  document.getElementById('metaPrice').textContent = `${price} ₽`;
  document.getElementById('orderBtnPrice').textContent = `${price} ₽`;
}

/* ---------------- FAQ ---------------- */
function renderFaq(){
  const list = document.getElementById('faqList');
  list.innerHTML = '';
  FAQ.forEach(item => {
    const el = document.createElement('div');
    el.className = 'faq-item';

    const q = document.createElement('button');
    q.className = 'faq-q';
    q.innerHTML = `<span>${item.q}</span><span class="plus">+</span>`;

    const a = document.createElement('div');
    a.className = 'faq-a';
    const p = document.createElement('p');
    p.textContent = item.a;
    a.appendChild(p);

    q.addEventListener('click', () => {
      const isOpen = el.classList.contains('open');
      list.querySelectorAll('.faq-item.open').forEach(open => {
        open.classList.remove('open');
        open.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen){
        el.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });

    el.appendChild(q);
    el.appendChild(a);
    list.appendChild(el);
  });
}

/* ---------------- order modal ---------------- */
const TELEGRAM_USERNAME = 'your_shop_username'; // TODO: замените на реальный юзернейм/бот

function buildSummary(){
  const color = getColor(state.color);
  const pattern = getPattern(state.pattern);
  const finish = getFinish(state.finish);
  const comment = document.getElementById('orderComment').value.trim();
  const lines = [
    'Заявка на накладку ЩЁЛК:',
    `— Клавиш: ${state.keys}`,
    `— Узор: ${pattern.name}`,
    `— Цвет: ${color.name} (${color.hex})`,
    `— Покрытие: ${finish.name}`,
    `— Итого: ${calcPrice()} ₽`,
  ];
  if (comment) lines.push(`— Комментарий: ${comment}`);
  return lines.join('\n');
}

function openOrderModal(){
  const summary = buildSummary();
  document.getElementById('orderSummary').textContent = summary;
  const tgLink = `https://t.me/share/url?url=&text=${encodeURIComponent(summary)}`;
  document.getElementById('sendTelegramBtn').href = tgLink;
  document.getElementById('orderModal').classList.add('open');
}
function closeOrderModal(){
  document.getElementById('orderModal').classList.remove('open');
}

/* ---------------- init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  renderCatalog();
  renderOptions();
  updatePreview();
  renderFaq();

  document.getElementById('orderBtn').addEventListener('click', openOrderModal);
  document.getElementById('modalClose').addEventListener('click', closeOrderModal);
  document.getElementById('orderModal').addEventListener('click', (e) => {
    if (e.target.id === 'orderModal') closeOrderModal();
  });
  document.getElementById('copySummaryBtn').addEventListener('click', async () => {
    const text = document.getElementById('orderSummary').textContent;
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('copySummaryBtn');
      const original = btn.textContent;
      btn.textContent = 'Скопировано!';
      setTimeout(() => { btn.textContent = original; }, 1600);
    } catch (err) {
      alert('Не удалось скопировать автоматически — выделите текст вручную.');
    }
  });

  const burger = document.getElementById('burgerBtn');
  const nav = document.getElementById('mainNav');
  burger.addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
});
