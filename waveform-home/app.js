/* =========================================================
   Waveform Home — логіка сторінки лампи Dune
   Ціна, контакти й палітри — див. README.md (розділ
   «Що обов'язково замінити»).

   Лампа складається з двох окремо фарбованих частин:
   абажур (рельєф піщаної дюни) і база разом із хвилястим
   обручем у формі W, на який абажур спирається.
   ========================================================= */

const PRODUCT_NAME = 'Waveform Dune';

// Ціна в гривнях — однакова для будь-яких кольорів.
const PRICE_UAH = 2100;

// Кольори філаменту, з якого друкуємо. Одна палітра і для абажура,
// і для бази з обручем. hex — приблизний відтінок для прев'ю.
const FILAMENTS = [
  { id: 'white',        name: 'White',        hex: '#F4F4F2' },
  { id: 'bone-white',   name: 'Bone White',   hex: '#EDE6CC' },
  { id: 'beige',        name: 'Beige',        hex: '#E6CFC1' },
  { id: 'oak',          name: 'Oak',          hex: '#BBAB9C' },
  { id: 'chocolate',    name: 'Chocolate',    hex: '#6B3F2E' },
  { id: 'black',        name: 'Black',        hex: '#232325' },
  { id: 'sakura-pink',  name: 'Sakura Pink',  hex: '#F6B3BC' },
  { id: 'magenta',      name: 'Magenta',      hex: '#E0409F' },
  { id: 'red',          name: 'Red',          hex: '#D9283D' },
  { id: 'sunny-orange', name: 'Sunny Orange', hex: '#EE6A26' },
  { id: 'yellow',       name: 'Yellow',       hex: '#E6DB4E' },
  { id: 'olive-green',  name: 'Olive Green',  hex: '#86A35C' },
  { id: 'grass-green',  name: 'Grass Green',  hex: '#2E7D66' },
  { id: 'mint-green',   name: 'Mint Green',   hex: '#9EEBCF' },
  { id: 'sky-blue',     name: 'Sky Blue',     hex: '#8EC5EF' },
];
const SHADE_COLORS = FILAMENTS;
const BASE_COLORS = FILAMENTS;

// Кольори за замовчуванням — як на фото лампи.
const PHOTO_SHADE = 'bone-white';
const PHOTO_BASE = 'chocolate';

const FAQ = [
  {
    q: 'Які кольори можна обрати?',
    a: 'Абажур і база з обручем W фарбуються окремо, тож їх можна поєднувати як завгодно. У конструкторі — основні варіанти; якщо хочете інший відтінок, напишіть нам у Telegram або надішліть фото інтерʼєру — підберемо.'
  },
  {
    q: 'З чого зроблена лампа?',
    a: 'Ми використовуємо еко матеріали й виготовляємо кожну лампу на власному виробництві — від дизайну форми до фінальної збірки.'
  },
  {
    q: 'Яке світло дає Dune?',
    a: 'Тепле й мʼяке. Абажур розсіює світло, а рельєф хвиль створює на поверхні гру світла й тіні — лампа добре виглядає і вдень як декор, і ввечері як джерело затишного світла.'
  },
  {
    q: 'Як доставляєте?',
    a: 'Доставляємо по всій Україні. Кожну лампу надійно пакуємо, щоб рельєф абажура доїхав цілим.'
  },
  {
    q: 'Скільки часу займає виготовлення?',
    a: 'Точні терміни залежать від обраних кольорів і черги замовлень — ми назвемо їх одразу після заявки.'
  },
  {
    q: 'Як оплатити замовлення?',
    a: 'Оплата не відбувається на сайті. Після заявки ми уточнимо деталі в месенджері, погодимо доставку, а тоді надішлемо реквізити.'
  },
];

const TELEGRAM_USERNAME = 'kumchik';

/* ---------- state ---------- */
const state = {
  shade: PHOTO_SHADE,
  base: PHOTO_BASE,
  lightOn: false,
};

function getShade(id){ return SHADE_COLORS.find(c => c.id === id); }
function getBase(id){ return BASE_COLORS.find(c => c.id === id); }

function formatPrice(){
  return `${PRICE_UAH.toLocaleString('uk-UA')} ₴`;
}

// white tick on dark swatches, dark tick on light ones
function isLight(hex){
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170;
}

/* ---------- configurator ---------- */
// the colour's name in the summary is written in that colour itself;
// pale ones get a thin dark outline so they stay readable on the card
function paintColorName(el, color){
  el.textContent = color.name;
  el.style.color = color.hex;
  el.classList.toggle('is-light', isLight(color.hex));
}

function renderColorRow(container, colors, selectedId, onPick){
  container.innerHTML = '';
  colors.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opt-color' + (c.id === selectedId ? ' active' : '');
    btn.setAttribute('aria-pressed', c.id === selectedId ? 'true' : 'false');
    btn.innerHTML = `<span class="dot" style="background:${c.hex}; --check:${isLight(c.hex) ? '#2A2420' : '#fff'}"></span>${c.name}`;
    btn.addEventListener('click', () => onPick(c.id));
    container.appendChild(btn);
  });
}

function renderOptions(){
  renderColorRow(document.getElementById('optShade'), SHADE_COLORS, state.shade, id => {
    state.shade = id; renderOptions(); updatePreview();
  });
  renderColorRow(document.getElementById('optBase'), BASE_COLORS, state.base, id => {
    state.base = id; renderOptions(); updatePreview();
  });
}

function updatePreview(){
  const shade = getShade(state.shade);
  const base = getBase(state.base);
  // the 3D model (lamp3d.js) may still be loading; it reads window.duneState itself once ready
  window.duneState = { shade: shade.hex, base: base.hex, lightOn: state.lightOn };
  if (window.dune3d) window.dune3d.update(window.duneState);

  document.getElementById('lampStage').classList.toggle('is-on', state.lightOn);
  const toggle = document.getElementById('lightToggle');
  toggle.setAttribute('aria-pressed', state.lightOn ? 'true' : 'false');
  document.getElementById('lightToggleLabel').textContent = state.lightOn ? 'Вимкнути світло' : 'Увімкнути світло';

  paintColorName(document.getElementById('metaShade'), shade);
  paintColorName(document.getElementById('metaBase'), base);
  document.getElementById('shadeColorName').textContent = `— ${shade.name}`;
  document.getElementById('baseColorName').textContent = `— ${base.name}`;
  document.getElementById('metaPrice').textContent = formatPrice();
  document.getElementById('orderBtn').textContent =
    `Замовити Dune — ${formatPrice()}`;
}

/* ---------- faq ---------- */
function renderFaq(){
  const list = document.getElementById('faqList');
  FAQ.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'faq-item';
    el.innerHTML = `
      <button class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}">
        <span>${item.q}</span><span class="plus" aria-hidden="true">+</span>
      </button>
      <div class="faq-a" id="faq-a-${i}"><p>${item.a}</p></div>`;
    const btn = el.querySelector('.faq-q');
    const ans = el.querySelector('.faq-a');
    btn.addEventListener('click', () => {
      const open = el.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0';
    });
    list.appendChild(el);
  });
}

/* ---------- order modal ---------- */
function buildSummary(){
  const lines = [
    `Заявка на лампу ${PRODUCT_NAME}`,
    '',
    `Колір абажура: ${getShade(state.shade).name}`,
    `Колір бази та обруча W: ${getBase(state.base).name}`,
    `Вартість: ${formatPrice()}`,
  ];
  return lines.join('\n');
}

function openOrderModal(){
  const summary = buildSummary();
  document.getElementById('orderSummary').textContent = summary;
  document.getElementById('sendTelegramBtn').href =
    `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(summary)}`;
  document.getElementById('orderModal').classList.add('open');
  document.getElementById('modalClose').focus();
}

function closeOrderModal(){
  document.getElementById('orderModal').classList.remove('open');
  document.getElementById('orderBtn').focus();
}

async function copySummary(){
  const btn = document.getElementById('copySummaryBtn');
  const text = document.getElementById('orderSummary').textContent;
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Скопійовано ✓';
  } catch (e) {
    btn.textContent = 'Виділіть текст вручну';
  }
  setTimeout(() => { btn.textContent = 'Скопіювати текст'; }, 2000);
}

/* ---------- nav ---------- */
function initNav(){
  const burger = document.getElementById('burgerBtn');
  const nav = document.getElementById('mainNav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }));
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderOptions();
  updatePreview();
  renderFaq();
  initNav();

  document.getElementById('lightToggle').addEventListener('click', () => {
    state.lightOn = !state.lightOn;
    updatePreview();
  });
  document.getElementById('orderBtn').addEventListener('click', openOrderModal);
  document.getElementById('modalClose').addEventListener('click', closeOrderModal);
  document.getElementById('orderModal').addEventListener('click', e => {
    if (e.target.id === 'orderModal') closeOrderModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('orderModal').classList.contains('open')) closeOrderModal();
  });
  document.getElementById('copySummaryBtn').addEventListener('click', copySummary);
  document.getElementById('year').textContent = new Date().getFullYear();
});
