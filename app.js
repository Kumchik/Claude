/* =========================================================
   Waveform — configurator logic
   Плейсхолдер-ціни, курси валют і контакти: див. README.md,
   де описано, що саме потрібно замінити.

   Модель товару (уточнено за реальними вимикачами, не лише фото):
   накладка — квадратна (чи іншої силуетної форми) товста друкована
   пластина з прямокутним вирізом (закругленими кутами) по центру, крізь
   який стирчить важелёк — окремий елемент, що клеїться прямо на сам
   вимикач. Один фізичний корпус вимикача ("секція") має ОДИН РОЗМІР
   рамки незалежно від того, скільки в ньому клавіш: 1 клавіша — один
   виріз, 2 клавіші — два вирізи в тій самій рамці (рамка не стає
   ширшою!). А ось коли поруч стоїть кілька окремих корпусів вимикачів
   (група), накладка справді розширюється на кожен додатковий корпус —
   це і є "кількість секцій". Тобто підсумкова кількість важельків =
   секції × клавіші в секції, згруповані по секціях (важельки однієї
   секції стоять близько один до одного, а різні секції — з більшим
   проміжком, як окремі корпуси на стіні).
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
  { id: 'checker',  name: 'Клітинка',  cls: 'pattern-checker',  surcharge: 190 },
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
// Ціна залежить лише від кількості секцій (окремих корпусів вимикачів під
// однією накладкою) — друга клавіша в тій самій секції не збільшує рамку
// й не впливає на ціну.
const SECTION_BASE_PRICE = { 1: 210, 2: 350, 3: 490, 4: 630 };

// Курси — orієнтовні і застарівають, підставте актуальні перед публікацією
// (або замініть на окремий прайс під кожен ринок замість автоконвертації).
const CURRENCIES = [
  { code: 'UAH', symbol: '₴', rate: 1,     position: 'after'  },
  { code: 'EUR', symbol: '€', rate: 1/45,  position: 'before' },
  { code: 'USD', symbol: '$', rate: 1/41,  position: 'before' },
];

const CATALOG = [
  { name: 'Ранкова кава',    sections: 1, clavishes: 2, pattern: 'dots',     color: 'terracotta', patternColor: 'cream',   lever: 'cream',   shape: 'square' },
  { name: "М'ята свіжість",  sections: 1, clavishes: 1, pattern: 'solid',    color: 'mint',       patternColor: 'cream',   lever: 'cream',   shape: 'circle' },
  { name: 'Дискотека',       sections: 2, clavishes: 1, pattern: 'terrazzo', color: 'lilac',      patternColor: 'cream',   lever: 'cream',   shape: 'cookie' },
  { name: 'Скандинавія',     sections: 1, clavishes: 1, pattern: 'checker', color: 'cream',      patternColor: 'sage',    lever: 'sage',    shape: 'square' },
  { name: 'Захід сонця',     sections: 1, clavishes: 2, pattern: 'waves',    color: 'coral',      patternColor: 'mustard', lever: 'cream',   shape: 'cloud'  },
  { name: 'Гірчичне поле',   sections: 3, clavishes: 1, pattern: 'stripes',  color: 'mustard',    patternColor: 'cream',   lever: 'cream',   shape: 'square' },
  { name: 'Нічне місто',     sections: 2, clavishes: 2, pattern: 'dots',     color: 'charcoal',   patternColor: 'sky',     lever: 'mustard', shape: 'square' },
  { name: 'Пудровий бриз',   sections: 1, clavishes: 2, pattern: 'dots',     color: 'blush',      patternColor: 'cream',   lever: 'cream',   shape: 'cookie' },
];

const FAQ = [
  {
    q: 'У чому різниця між "секціями" і "клавішами в секції"?',
    a: 'Секція — це один окремий корпус вимикача на стіні; кожна додаткова секція розширює накладку. Клавіші в секції — це кількість важельків усередині одного й того самого корпусу: 1 чи 2 клавіші в одному корпусі мають однаковий розмір рамки, просто з одним чи двома вирізами. Якщо у вас поруч стоять два окремих вимикачі — це 2 секції; якщо один здвоєний вимикач — це 1 секція з 2 клавішами.'
  },
  {
    q: 'Чи підійде накладка до мого вимикача?',
    a: 'Друкуємо під точні розміри — плоскі й випуклі вимикачі, до 4 секцій, включно з розетками. При оформленні замовлення надішлемо інструкцію, як виміряти ширину, висоту й виступ від стіни, щоб накладка сіла ідеально.'
  },
  {
    q: 'З яких частин складається комплект і як його встановлювати?',
    a: 'У комплекті дві частини: маленькі декоративні важельки та накладка з прямокутними вирізами (закругленими кутами) під кожну клавішу. Важельки приклеюються прямо на існуючі клавіші вашого вимикача — крізь виріз накладки, а сама накладка після цього просто клацає зверху на штатні кріплення. Розбирати механізм вимикача чи викликати електрика не потрібно.'
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
    a: 'Так, палітра в конструкторі — це основні варіанти. Надішліть референс або код кольору (HEX/RAL/Pantone) у повідомленні до замовлення — підберемо максимально близько, окремо для накладки, окремо для візерунка і окремо для важелька.'
  },
  {
    q: 'В якій валюті ціни і як відбувається оплата?',
    a: 'Ціни показані в гривнях, євро або доларах — оберіть зручну валюту перемикачем угорі сторінки. Оплата не відбувається на сайті: після заявки ми погодимо макет і вартість у переписці, а тоді надішлемо реквізити для оплати.'
  },
];

/* ---------------- state ---------------- */
const state = {
  shape: 'square',
  sections: 1,
  clavishes: 1,
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

function calcPriceUAH(sections, patternId, finishId){
  const base = SECTION_BASE_PRICE[sections] || SECTION_BASE_PRICE[1];
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
   .switch-plate = the whole printed panel, sized by section count.
     .plate-section = one physical switch corpus's slot — fixed-share
       width regardless of clavishes, so 1 vs 2 clavishes never resizes
       the corpus, only how tight its own levers sit together.
         .lever-well > .key-lever > .lever-dot = the важелёк, seen from
           straight above: one flat-coloured circle (the actual stick's
           cross-section — its base disappears behind it from this
           angle, so it isn't drawn as a separate shape any more). */
// "Квадрат" is a standard rectangular plate — it genuinely widens for
// more sections, like a real double/triple-gang switch. The decorative
// silhouettes (круг/хмаринка/печиво) stay compact — they just grow a
// little, the way the reference photos show a scalloped печиво
// накладка holding two switches without stretching into a long stadium.
// The lever hole itself is one fixed circle per preview size, the same
// for every shape, every section count, and 1 or 2 clavishes — a real
// switch's own cutout doesn't change size just because the decorative
// накладка around it got wider, rounder, or gained a second toggle.
// Widened the compact shapes' own per-section growth a bit from earlier
// (still far short of "квадрат"'s) specifically so this bigger, more
// legible hole still fits two side by side even in the tightest case —
// a compact shape's narrowest slot, at 4 sections with 2 clavishes each.
const PLATE_SIZE = {
  base: {
    height: 100, lever: 24,
    rect:    { widths: { 1: 100, 2: 172, 3: 244, 4: 316 } },
    compact: { widths: { 1: 100, 2: 150, 3: 200, 4: 260 } },
  },
  large: {
    height: 160, lever: 38,
    rect:    { widths: { 1: 160, 2: 272, 3: 384, 4: 496 } },
    compact: { widths: { 1: 160, 2: 240, 3: 320, 4: 416 } },
  },
};

// печиво/хмаринка silhouettes: two true polar flower/blob caps (radius
// baseR+amp*cos(n*theta+phase), each sized to the plate's own HEIGHT so
// the lobes stay round no matter how wide the plate gets for more
// sections), joined by plain straight top/bottom edges — a "stadium with
// flower caps". Computed per-plate from its actual pixel width/height
// (not a static percentage clip-path) specifically because a fixed-shape
// polygon stretched non-uniformly to fit a much-wider-than-tall box
// turns smooth lobes into sharp spikes; this way widening the plate for
// more sections only lengthens the flat middle, never distorts the caps.
const SHAPE_CURVES = {
  cookie: { baseR: 0.86, amp: 0.14, n: 7, phase: 0 },
  cloud:  { baseR: 0.85, amp: 0.13, n: 4, phase: 0.3 },
};

function capsuleFlowerPath(w, h, baseR, amp, n, phase){
  const nHalf = 45;
  const polarPt = (theta) => {
    const r = baseR + amp*Math.cos(n*theta + phase);
    return [0.5 + 0.5*r*Math.cos(theta), 0.5 + 0.5*r*Math.sin(theta)];
  };

  const rightPts = [];
  for (let i = 0; i <= nHalf; i++){
    const theta = -Math.PI/2 + Math.PI*i/nHalf;
    const [px, py] = polarPt(theta);
    rightPts.push([(w - h) + px*h, py*h]);
  }
  const leftPts = [];
  for (let i = 0; i <= nHalf; i++){
    const theta = Math.PI/2 + Math.PI*i/nHalf;
    const [px, py] = polarPt(theta);
    leftPts.push([px*h, py*h]);
  }
  const topLeftSeam = leftPts[leftPts.length - 1];
  const topRightSeam = rightPts[0];
  const bottomRightSeam = rightPts[rightPts.length - 1];
  const bottomLeftSeam = leftPts[0];

  const midLine = (p0, p1) => {
    const pts = [];
    const length = p1[0] - p0[0];
    if (length <= 1) return pts;
    const steps = Math.max(Math.round(length / 4), 1);
    for (let i = 1; i < steps; i++){
      pts.push([p0[0] + length*(i/steps), p0[1]]);
    }
    return pts;
  };

  const pts = [topLeftSeam, ...midLine(topLeftSeam, topRightSeam), ...rightPts,
               ...midLine(bottomRightSeam, bottomLeftSeam), ...leftPts];
  return 'M ' + pts.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ') + ' Z';
}

function buildPlateEl(shape, sections, clavishes, patternCls, plateColorHex, patternColorHex, leverColorHex, finishId, size){
  const dims = PLATE_SIZE[size === 'large' ? 'large' : 'base'];
  const table = shape === 'square' ? dims.rect : dims.compact;
  const leverDim = { w: dims.lever, h: dims.lever };
  const plateWidth = table.widths[sections] || table.widths[1];

  const plate = document.createElement('div');
  plate.className = `switch-plate ${patternCls} shape-${shape}` + (size === 'large' ? ' plate-large' : '');
  plate.style.setProperty('--plate-color', plateColorHex);
  plate.style.setProperty('--pattern-color', patternColorHex);
  plate.style.width = `${plateWidth}px`;
  plate.style.height = `${dims.height}px`;
  let clipPath = null;
  if (SHAPE_CURVES[shape]){
    const c = SHAPE_CURVES[shape];
    clipPath = `path('${capsuleFlowerPath(plateWidth, dims.height, c.baseR, c.amp, c.n, c.phase)}')`;
    plate.style.clipPath = clipPath;
  }

  for (let s = 0; s < sections; s++){
    const sectionEl = document.createElement('div');
    sectionEl.className = 'plate-section';
    for (let c = 0; c < clavishes; c++){
      const well = document.createElement('div');
      well.className = 'lever-well';
      well.style.width = `${leverDim.w}px`;
      well.style.height = `${leverDim.h}px`;
      // set on the well (not just the dot) so the well's own darkened
      // background is derived from --lever-color too, via CSS
      // inheritance down to .lever-dot — the well is the "подложка" the
      // lever sits in, and it should shift color together with it
      well.style.setProperty('--lever-color', leverColorHex);

      // seen from straight above, the важелёк is just one flat-coloured
      // circle — the stick's cross-section, centred in its hole
      const lever = document.createElement('div');
      lever.className = 'key-lever';
      const dot = document.createElement('div');
      dot.className = 'lever-dot' + (finishId === 'glossy' ? ' finish-glossy' : '');
      lever.appendChild(dot);
      well.appendChild(lever);

      sectionEl.appendChild(well);
    }
    plate.appendChild(sectionEl);
  }

  if (!clipPath) return plate;

  // filter:drop-shadow silently doesn't render together with an inline
  // clip-path on the same element (observed in both Chromium and iOS
  // Safari) — печиво/хмаринка get their shadow from a same-silhouette
  // sibling instead, blurred and offset behind the plate in a wrapper
  // sized to match it.
  const frame = document.createElement('div');
  frame.className = 'plate-frame' + (size === 'large' ? ' plate-large' : '');
  frame.style.width = `${plateWidth}px`;
  frame.style.height = `${dims.height}px`;
  const shadow = document.createElement('div');
  shadow.className = 'plate-shadow';
  shadow.style.clipPath = clipPath;
  frame.appendChild(shadow);
  frame.appendChild(plate);
  return frame;
}

/* ---------------- currency switcher ---------------- */
function renderCurrencyToggle(){
  const holder = document.getElementById('currencyToggle');
  holder.innerHTML = '';
  CURRENCIES.forEach(cur => {
    const btn = document.createElement('button');
    btn.className = state.currency === cur.code ? 'active' : '';
    // code wrapped separately so CSS can hide it on narrow phones,
    // leaving just the symbol — the full header row otherwise doesn't
    // fit next to the logo and burger and forces real horizontal scroll
    btn.innerHTML = `${cur.symbol} <span class="cur-code">${cur.code}</span>`;
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
    card.appendChild(buildPlateEl(item.shape, item.sections, item.clavishes, pattern.cls, color.hex, patternColor.hex, lever.hex, 'matte'));

    const h3 = document.createElement('h3');
    h3.textContent = item.name;
    card.appendChild(h3);

    const price = document.createElement('span');
    price.className = 'price';
    const baseUAH = calcPriceUAH(item.sections, item.pattern, 'matte');
    price.textContent = `від ${formatPrice(baseUAH)}`;
    card.appendChild(price);

    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-small';
    btn.textContent = 'Налаштувати';
    btn.addEventListener('click', () => {
      state.shape = item.shape;
      state.sections = item.sections;
      state.clavishes = item.clavishes;
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
function clavishLabel(n){
  return n === 1 ? '1 клавіша' : '2 клавіші';
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

  // number of sections (separate switch corpuses side by side)
  const sectionsRow = document.getElementById('optSections');
  sectionsRow.innerHTML = '';
  [1, 2, 3, 4].forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'opt-pill' + (state.sections === n ? ' active' : '');
    btn.textContent = sectionLabel(n);
    btn.addEventListener('click', () => { state.sections = n; renderOptions(); updatePreview(); });
    sectionsRow.appendChild(btn);
  });

  // clavishes per section (1 or 2 rockers inside the same corpus size)
  const clavishRow = document.getElementById('optClavishes');
  clavishRow.innerHTML = '';
  [1, 2].forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'opt-pill' + (state.clavishes === n ? ' active' : '');
    btn.textContent = clavishLabel(n);
    btn.addEventListener('click', () => { state.clavishes = n; renderOptions(); updatePreview(); });
    clavishRow.appendChild(btn);
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
  const newPlate = buildPlateEl(state.shape, state.sections, state.clavishes, pattern.cls, color.hex, patternColor.hex, lever.hex, state.finish, 'large');
  newPlate.id = 'livePreviewPlate';
  plateHolder.replaceWith(newPlate);

  document.getElementById('metaShape').textContent = getShape(state.shape).name;
  document.getElementById('metaSections').textContent = state.sections;
  document.getElementById('metaClavishes').textContent = state.clavishes;
  document.getElementById('metaPattern').textContent = pattern.id === 'solid' ? pattern.name : `${pattern.name}, ${patternColor.name}`;
  document.getElementById('metaColor').textContent = color.name;
  document.getElementById('metaLeverColor').textContent = lever.name;
  document.getElementById('metaFinish').textContent = getFinish(state.finish).name;

  const priceUAH = calcPriceUAH(state.sections, state.pattern, state.finish);
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
const TELEGRAM_USERNAME = 'kumchik';

function buildSummary(){
  const color = getColor(state.color);
  const patternColor = getColor(state.patternColor);
  const lever = getColor(state.leverColor);
  const pattern = getPattern(state.pattern);
  const finish = getFinish(state.finish);
  const comment = document.getElementById('orderComment').value.trim();
  const priceUAH = calcPriceUAH(state.sections, state.pattern, state.finish);
  const lines = [
    'Заявка на накладку Waveform:',
    `— Форма: ${getShape(state.shape).name}`,
    `— Секцій: ${state.sections}`,
    `— Клавіш у секції: ${state.clavishes}`,
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
  const tgLink = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(summary)}`;
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
