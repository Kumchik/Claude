/* =========================================================
   Waveform — configurator logic
   Плейсхолдер-ціни, курси валют і контакти: див. README.md,
   де описано, що саме потрібно замінити.

   Модель товару: накладка — це одна товста друкована пластина (без білої
   рамки-підкладки навколо, реальні накладки монтуються впритул до стіни),
   всередині якої в ряд стоять важельки — по одному на кожну секцію
   вимикача. Важелько завжди має форму качельки (як справжній тумблер) і
   фарбується окремим кольором. Накладка має свій колір фону і окремий
   колір паттерна (візерунок малюється поверх фону іншим кольором) — три
   незалежні кольори разом, так само, як у реальному конструкторі
   printesso.com. Квадратна форма — це стандартна прямокутна планка, яка
   помітно розширюється під кілька секцій (як справжній подвійний/потрійний
   вимикач); круг/хмаринка/печиво — декоративні силуети, які лишаються
   компактними і просто трохи підростають, а важельки в них стають
   тіснішими один до одного.
   ========================================================= */

const SHAPES = [
  { id: 'square', name: 'Квадрат'   },
  { id: 'circle', name: 'Круг'      },
  { id: 'cloud',  name: 'Хмаринка'  },
  { id: 'cookie', name: 'Печиво'    },
];

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
// Ціна залежить від кількості секцій — кожна секція друкується окремим модулем.
const KEY_BASE_PRICE = { 1: 599, 2: 990, 3: 1390, 4: 1750 };

// Курси — orієнтовні і застарівають, підставте актуальні перед публікацією
// (або замініть на окремий прайс під кожен ринок замість автоконвертації).
const CURRENCIES = [
  { code: 'UAH', symbol: '₴', rate: 1,     position: 'after'  },
  { code: 'EUR', symbol: '€', rate: 1/45,  position: 'before' },
  { code: 'USD', symbol: '$', rate: 1/41,  position: 'before' },
];

const CATALOG = [
  { name: 'Ранкова кава',    keys: 2, pattern: 'dots',     color: 'terracotta', patternColor: 'cream', lever: 'cream',   shape: 'square' },
  { name: "М'ята свіжість",  keys: 1, pattern: 'solid',    color: 'mint',       patternColor: 'cream', lever: 'cream',   shape: 'circle' },
  { name: 'Дискотека',       keys: 3, pattern: 'terrazzo', color: 'lilac',      patternColor: 'cream', lever: 'cream',   shape: 'cookie' },
  { name: 'Скандинавія',     keys: 1, pattern: 'marble',   color: 'cream',      patternColor: 'sage',  lever: 'sage',    shape: 'square' },
  { name: 'Захід сонця',     keys: 2, pattern: 'waves',    color: 'coral',      patternColor: 'mustard', lever: 'cream', shape: 'cloud'  },
  { name: 'Гірчичне поле',   keys: 4, pattern: 'stripes',  color: 'mustard',    patternColor: 'cream', lever: 'cream',   shape: 'square' },
  { name: 'Нічне місто',     keys: 2, pattern: 'dots',     color: 'charcoal',   patternColor: 'sky',   lever: 'mustard', shape: 'circle' },
  { name: 'Пудровий бриз',   keys: 1, pattern: 'dots',     color: 'blush',      patternColor: 'cream', lever: 'cream',   shape: 'cookie' },
];

const FAQ = [
  {
    q: 'Як зрозуміти, скільки секцій у мого вимикача?',
    a: 'Порахуйте кількість окремих клавіш або розеток на панелі — зазвичай від 1 до 4. Кожна клавіша чи розетка — це одна секція. Якщо сумніваєтесь, надішліть нам фото вимикача в месенджері, і ми підкажемо.'
  },
  {
    q: 'Чи підійде накладка до мого вимикача?',
    a: 'Друкуємо під точні розміри — плоскі й випуклі вимикачі, з 1–4 секціями, включно з розетками. При оформленні замовлення надішлемо інструкцію, як виміряти ширину, висоту й виступ від стіни, щоб накладка сіла ідеально.'
  },
  {
    q: 'З яких частин складається комплект і як його встановлювати?',
    a: 'У комплекті дві частини: маленькі декоративні важельки та рамка з вирізами під секції. Важельки приклеюються прямо на існуючі клавіші вашого вимикача, а рамка після цього просто клацає зверху на штатні кріплення. Розбирати механізм вимикача чи викликати електрика не потрібно.'
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
    a: 'Так, палітра в конструкторі — це основні варіанти. Надішліть референс або код кольору (HEX/RAL/Pantone) у повідомленні до замовлення — підберемо максимально близько, окремо для накладки і окремо для важелька.'
  },
  {
    q: 'В якій валюті ціни і як відбувається оплата?',
    a: 'Ціни показані в гривнях, євро або доларах — оберіть зручну валюту перемикачем угорі сторінки. Оплата не відбувається на сайті: після заявки ми погодимо макет і вартість у переписці, а тоді надішлемо реквізити для оплати.'
  },
];

/* ---------------- state ---------------- */
const state = {
  shape: 'square',
  keys: 1,
  pattern: 'solid',
  color: 'coral',
  patternColor: 'cream',
  leverColor: 'cream',
  finish: 'matte',
  currency: 'UAH',
};

function getShape(id){ return SHAPES.find(s => s.id === id); }
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

/* ---------------- rendering helpers ----------------
   One "plate" = one real switch накладка: a single printed panel that
   widens to fit 1–4 lever cutouts side by side, exactly like a real
   single/double/triple-gang switch — not separate tiles glued together. */
// "Квадрат" is a standard rectangular plate — it genuinely widens for
// more sections, like a real double/triple-gang switch. The decorative
// silhouettes (круг/хмаринка/печиво) stay compact — they just grow a
// little and pack the levers closer, the way the reference photos show
// a scalloped печиво накладка holding two switches without stretching
// into a long stadium shape.
const PLATE_SIZE = {
  base: {
    height: 100,
    rect:    { widths: { 1: 100, 2: 172, 3: 244, 4: 316 }, lever: { 1:{w:20,h:40}, 2:{w:20,h:40}, 3:{w:20,h:40}, 4:{w:20,h:40} } },
    compact: { widths: { 1: 100, 2: 132, 3: 164, 4: 196 }, lever: { 1:{w:20,h:40}, 2:{w:16,h:34}, 3:{w:13,h:30}, 4:{w:11,h:26} } },
  },
  large: {
    height: 160,
    rect:    { widths: { 1: 160, 2: 272, 3: 384, 4: 496 }, lever: { 1:{w:32,h:64}, 2:{w:32,h:64}, 3:{w:32,h:64}, 4:{w:32,h:64} } },
    compact: { widths: { 1: 160, 2: 208, 3: 256, 4: 304 }, lever: { 1:{w:32,h:64}, 2:{w:25,h:54}, 3:{w:20,h:46}, 4:{w:17,h:40} } },
  },
};

function buildPlateEl(shape, count, patternCls, plateColorHex, patternColorHex, leverColorHex, finishId, size){
  const dims = PLATE_SIZE[size === 'large' ? 'large' : 'base'];
  const table = shape === 'square' ? dims.rect : dims.compact;
  const leverDim = table.lever[count] || table.lever[1];

  const plate = document.createElement('div');
  plate.className = `switch-plate ${patternCls} shape-${shape}` + (size === 'large' ? ' plate-large' : '');
  plate.style.setProperty('--plate-color', plateColorHex);
  plate.style.setProperty('--pattern-color', patternColorHex);
  plate.style.width = `${table.widths[count] || table.widths[1]}px`;
  plate.style.height = `${dims.height}px`;

  for (let i = 0; i < count; i++){
    const lever = document.createElement('div');
    lever.className = 'key-lever' + (finishId === 'glossy' ? ' finish-glossy' : '');
    lever.style.setProperty('--lever-color', leverColorHex);
    lever.style.width = `${leverDim.w}px`;
    lever.style.height = `${leverDim.h}px`;
    plate.appendChild(lever);
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

    const color = getColor(item.color);
    const patternColor = getColor(item.patternColor);
    const lever = getColor(item.lever);
    const pattern = getPattern(item.pattern);
    card.appendChild(buildPlateEl(item.shape, item.keys, pattern.cls, color.hex, patternColor.hex, lever.hex, 'matte'));

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
      state.shape = item.shape;
      state.keys = item.keys;
      state.pattern = item.pattern;
      state.color = item.color;
      state.patternColor = item.patternColor;
      state.leverColor = item.lever;
      renderOptions();
      updatePreview();
      document.getElementById('configurator').scrollIntoView({ behavior: 'smooth' });
    });
    card.appendChild(btn);

    grid.appendChild(card);
  });
}

/* ---------------- configurator options ---------------- */
function sectionLabel(n){
  return n === 1 ? '1 секція' : `${n} секції`;
}

function renderColorRow(container, selectedId, onPick){
  container.innerHTML = '';
  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'opt-color' + (selectedId === c.id ? ' active' : '');
    btn.style.background = c.hex;
    btn.title = c.name;
    btn.setAttribute('aria-label', c.name);
    btn.addEventListener('click', () => onPick(c.id));
    container.appendChild(btn);
  });
}

function renderOptions(){
  // shape
  const shapeRow = document.getElementById('optShape');
  shapeRow.innerHTML = '';
  SHAPES.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'opt-pill' + (state.shape === s.id ? ' active' : '');
    btn.textContent = s.name;
    btn.addEventListener('click', () => { state.shape = s.id; renderOptions(); updatePreview(); });
    shapeRow.appendChild(btn);
  });

  // number of sections
  const keysRow = document.getElementById('optKeys');
  keysRow.innerHTML = '';
  [1, 2, 3, 4].forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'opt-pill' + (state.keys === n ? ' active' : '');
    btn.textContent = sectionLabel(n);
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
    swatch.style.setProperty('--pattern-color', getColor(state.patternColor).hex);
    btn.appendChild(swatch);
    const label = document.createElement('span');
    label.textContent = p.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => { state.pattern = p.id; renderOptions(); updatePreview(); });
    patternRow.appendChild(btn);
  });

  // overlay (накладка) colour
  renderColorRow(document.getElementById('optColor'), state.color, (id) => {
    state.color = id; renderOptions(); updatePreview();
  });

  // pattern colour — only matters once a pattern other than "Однотон" is picked
  const patternColorStep = document.getElementById('patternColorStep');
  patternColorStep.hidden = state.pattern === 'solid';
  renderColorRow(document.getElementById('optPatternColor'), state.patternColor, (id) => {
    state.patternColor = id; renderOptions(); updatePreview();
  });

  // lever colour — separate palette pick, same swatches
  renderColorRow(document.getElementById('optLeverColor'), state.leverColor, (id) => {
    state.leverColor = id; renderOptions(); updatePreview();
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
  const color = getColor(state.color);
  const patternColor = getColor(state.patternColor);
  const lever = getColor(state.leverColor);
  const pattern = getPattern(state.pattern);

  const plateHolder = document.getElementById('livePreviewPlate');
  const newPlate = buildPlateEl(state.shape, state.keys, pattern.cls, color.hex, patternColor.hex, lever.hex, state.finish, 'large');
  newPlate.id = 'livePreviewPlate';
  plateHolder.replaceWith(newPlate);

  document.getElementById('metaShape').textContent = getShape(state.shape).name;
  document.getElementById('metaKeys').textContent = state.keys;
  document.getElementById('metaPattern').textContent = pattern.id === 'solid' ? pattern.name : `${pattern.name}, ${patternColor.name}`;
  document.getElementById('metaColor').textContent = color.name;
  document.getElementById('metaLeverColor').textContent = lever.name;
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
  const patternColor = getColor(state.patternColor);
  const lever = getColor(state.leverColor);
  const pattern = getPattern(state.pattern);
  const finish = getFinish(state.finish);
  const comment = document.getElementById('orderComment').value.trim();
  const priceUAH = calcPriceUAH(state.keys, state.pattern, state.finish);
  const lines = [
    'Заявка на накладку Waveform:',
    `— Форма: ${getShape(state.shape).name}`,
    `— Секцій: ${state.keys}`,
    `— Візерунок: ${pattern.name}`,
    `— Колір накладки: ${color.name} (${color.hex})`,
  ];
  if (pattern.id !== 'solid') lines.push(`— Колір візерунка: ${patternColor.name} (${patternColor.hex})`);
  lines.push(
    `— Колір важелька: ${lever.name} (${lever.hex})`,
    `— Покриття: ${finish.name}`,
    `— Разом: ${formatPrice(priceUAH)} (валюта: ${state.currency})`,
  );
  if (comment) lines.push(`— Коментар/заміри: ${comment}`);
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
