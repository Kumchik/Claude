/* =========================================================
   Waveform — configurator logic
   Плейсхолдер-ціни, курси валют і контакти: див. README.md,
   де описано, що саме потрібно замінити.
   ========================================================= */

const PATTERNS = [
  { id: 'solid',    name: 'Однотон',   cls: 'pattern-solid',    surcharge: 0   },
  { id: 'dots',     name: 'Горошок',   cls: 'pattern-dots',     surcharge: 130 },
  { id: 'stripes',  name: 'Смужки',    cls: 'pattern-stripes',  surcharge: 130 },
  { id: 'waves',    name: 'Хвиля',     cls: 'pattern-waves',    surcharge: 160 },
  { id: 'marble',   name: 'Мармур',    cls: 'pattern-marble',   surcharge: 190 },
  { id: 'terrazzo', name: 'Терраццо',  cls: 'pattern-terrazzo', surcharge: 220 },
];

const COLORS = [
  { id: 'coral',      name: 'Корал',     hex: '#FF6B6B' },
  { id: 'mint',       name: "М'ята",     hex: '#5EC8B8' },
  { id: 'mustard',    name: 'Гірчиця',   hex: '#FFC857' },
  { id: 'lilac',      name: 'Лаванда',   hex: '#B8A6E8' },
  { id: 'sky',        name: 'Небо',      hex: '#6FB7F7' },
  { id: 'blush',      name: 'Пудра',     hex: '#F4A6C6' },
  { id: 'sage',       name: 'Шавлія',    hex: '#9CB88F' },
  { id: 'terracotta', name: 'Теракота',  hex: '#D97D54' },
  { id: 'charcoal',   name: 'Графіт',    hex: '#4A4550' },
  { id: 'cream',      name: 'Крем',      hex: '#F3E9DA' },
];

const FINISHES = [
  { id: 'matte',  name: 'Матове',    surcharge: 0  },
  { id: 'glossy', name: 'Глянцеве',  surcharge: 90 },
];

// Базові ціни вказані в гривнях (UAH) — це "домашня" валюта прайсу,
// з якої курсом перераховуються EUR і USD (див. CURRENCIES нижче).
const KEY_BASE_PRICE = { 1: 790, 2: 990, 3: 1190, 4: 1390 };

// Курси — orієнтовні і застарівають, підставте актуальні перед публікацією
// (або замініть на окремий прайс під кожен ринок замість автоконвертації).
const CURRENCIES = [
  { code: 'UAH', symbol: '₴', rate: 1,     position: 'after'  },
  { code: 'EUR', symbol: '€', rate: 1/45,  position: 'before' },
  { code: 'USD', symbol: '$', rate: 1/41,  position: 'before' },
];

const CATALOG = [
  { name: 'Ранкова кава',    keys: 2, pattern: 'dots',     color: 'terracotta' },
  { name: "М'ята свіжість",  keys: 1, pattern: 'solid',    color: 'mint' },
  { name: 'Дискотека',       keys: 3, pattern: 'terrazzo', color: 'lilac' },
  { name: 'Скандинавія',     keys: 1, pattern: 'marble',   color: 'cream' },
  { name: 'Захід сонця',     keys: 2, pattern: 'waves',    color: 'coral' },
  { name: 'Гірчичне поле',   keys: 4, pattern: 'stripes',  color: 'mustard' },
  { name: 'Нічне місто',     keys: 2, pattern: 'solid',    color: 'charcoal' },
  { name: 'Пудровий бриз',   keys: 1, pattern: 'dots',     color: 'blush' },
];

const FAQ = [
  {
    q: 'Як зрозуміти, скільки клавіш у мого вимикача?',
    a: 'Порахуйте кількість окремих кнопок (клавіш) на панелі — зазвичай від 1 до 4. Якщо сумніваєтесь, надішліть нам фото вимикача в месенджері, і ми підкажемо.'
  },
  {
    q: 'Чи підійде накладка до моєї рамки?',
    a: 'Друкуємо накладки під стандартні рамки популярних серій (Legrand, Schneider Electric, Werkel) та американські вимикачі Decora. При оформленні замовлення уточнимо модель рамки, щоб посадка була точною.'
  },
  {
    q: 'З якого матеріалу друкуєте?',
    a: 'Використовуємо міцний PLA/PETG пластик — він не токсичний, стійкий до стирання і не вигорає на сонці. За потреби покриваємо матовим або глянцевим фінішем.'
  },
  {
    q: 'Скільки часу займає виготовлення і доставка?',
    a: 'Друк і фінішна обробка — 3–5 днів після погодження макета. Доставка по Україні — 2–5 днів, у країни ЄС та США — зазвичай 7–14 днів залежно від способу відправки.'
  },
  {
    q: 'Чи можна замовити колір поза палітрою конструктора?',
    a: 'Так, палітра в конструкторі — це основні варіанти. Надішліть референс або код кольору (HEX/RAL/Pantone) у повідомленні до замовлення — підберемо максимально близько.'
  },
  {
    q: 'В якій валюті ціни і як відбувається оплата?',
    a: 'Ціни показані в гривнях, євро або доларах — оберіть зручну валюту перемикачем угорі сторінки. Оплата не відбувається на сайті: після заявки ми погодимо макет і вартість у переписці, а тоді надішлемо реквізити для оплати.'
  },
];

/* ---------------- state ---------------- */
const state = {
  keys: 1,
  pattern: 'solid',
  color: 'coral',
  finish: 'matte',
  currency: 'UAH',
};

function getColor(id){ return COLORS.find(c => c.id === id); }
function getPattern(id){ return PATTERNS.find(p => p.id === id); }
function getFinish(id){ return FINISHES.find(f => f.id === id); }
function getCurrency(code){ return CURRENCIES.find(c => c.code === code); }

function calcPriceUAH(keys, patternId, finishId){
  const base = KEY_BASE_PRICE[keys] || KEY_BASE_PRICE[1];
  const patternFee = getPattern(patternId).surcharge;
  const finishFee = getFinish(finishId).surcharge;
  return base + patternFee + finishFee;
}

function formatPrice(uahAmount){
  const cur = getCurrency(state.currency);
  const value = Math.round(uahAmount * cur.rate);
  return cur.position === 'before' ? `${cur.symbol}${value}` : `${value} ${cur.symbol}`;
}

/* ---------------- rendering helpers ---------------- */
function buildPlateEl(keys, patternCls, colorHex, finishId){
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

/* ---------------- currency switcher ---------------- */
function renderCurrencyToggle(){
  const holder = document.getElementById('currencyToggle');
  holder.innerHTML = '';
  CURRENCIES.forEach(cur => {
    const btn = document.createElement('button');
    btn.className = state.currency === cur.code ? 'active' : '';
    btn.textContent = `${cur.symbol} ${cur.code}`;
    btn.addEventListener('click', () => {
      state.currency = cur.code;
      renderCurrencyToggle();
      renderCatalog();
      renderOptions();
      updatePreview();
    });
    holder.appendChild(btn);
  });
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
    const baseUAH = KEY_BASE_PRICE[item.keys] + pattern.surcharge;
    price.textContent = `від ${formatPrice(baseUAH)}`;
    card.appendChild(price);

    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-small';
    btn.textContent = 'Налаштувати';
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
function keyLabel(n){
  return n === 1 ? '1 клавіша' : `${n} клавіші`;
}

function renderOptions(){
  // keys
  const keysRow = document.getElementById('optKeys');
  keysRow.innerHTML = '';
  [1, 2, 3, 4].forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'opt-pill' + (state.keys === n ? ' active' : '');
    btn.textContent = keyLabel(n);
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
    btn.textContent = f.surcharge ? `${f.name} (+${formatPrice(f.surcharge)})` : f.name;
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

  const priceUAH = calcPriceUAH(state.keys, state.pattern, state.finish);
  const priceLabel = formatPrice(priceUAH);
  document.getElementById('metaPrice').textContent = priceLabel;
  document.getElementById('orderBtnPrice').textContent = priceLabel;
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
const TELEGRAM_USERNAME = 'your_shop_username'; // TODO: замініть на реальний юзернейм/бот

function buildSummary(){
  const color = getColor(state.color);
  const pattern = getPattern(state.pattern);
  const finish = getFinish(state.finish);
  const comment = document.getElementById('orderComment').value.trim();
  const priceUAH = calcPriceUAH(state.keys, state.pattern, state.finish);
  const lines = [
    'Заявка на накладку Waveform:',
    `— Клавіш: ${state.keys}`,
    `— Візерунок: ${pattern.name}`,
    `— Колір: ${color.name} (${color.hex})`,
    `— Покриття: ${finish.name}`,
    `— Разом: ${formatPrice(priceUAH)} (валюта: ${state.currency})`,
  ];
  if (comment) lines.push(`— Коментар: ${comment}`);
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

  renderCurrencyToggle();
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
      btn.textContent = 'Скопійовано!';
      setTimeout(() => { btn.textContent = original; }, 1600);
    } catch (err) {
      alert('Не вдалося скопіювати автоматично — виділіть текст вручну.');
    }
  });

  const burger = document.getElementById('burgerBtn');
  const nav = document.getElementById('mainNav');
  burger.addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
});
