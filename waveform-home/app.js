/* =========================================================
   Waveform Home — логіка сторінки лампи Dune
   Ціна, контакти й палітри — див. README.md (розділ
   «Що обов'язково замінити»).

   Лампа складається з двох окремо фарбованих частин:
   абажур (рельєф піщаної дюни) і база разом із хвилястим
   обручем у формі W, на який абажур спирається.
   ========================================================= */

const PRODUCT_NAME = 'Waveform Dune';

// Ціна в гривнях. null — показуємо «за запитом», доки не задана реальна.
const PRICE_UAH = null;

const SHADE_COLORS = [
  { id: 'sand',   name: 'Пісок',     hex: '#EADBC6' },
  { id: 'milk',   name: 'Молочний',  hex: '#F6F1E8' },
  { id: 'peach',  name: 'Персик',    hex: '#F1C8A6' },
  { id: 'powder', name: 'Пудра',     hex: '#EAC3BE' },
  { id: 'sage',   name: 'Шавлія',    hex: '#C8D0B6' },
  { id: 'fog',    name: 'Туман',     hex: '#D5D6D8' },
];

const BASE_COLORS = [
  { id: 'chocolate',  name: 'Шоколад',   hex: '#6E4330' },
  { id: 'terracotta', name: 'Теракота',  hex: '#B0613F' },
  { id: 'graphite',   name: 'Графіт',    hex: '#3A3836' },
  { id: 'olive',      name: 'Олива',     hex: '#6D6E47' },
  { id: 'sand',       name: 'Пісок',     hex: '#CDB592' },
  { id: 'milk',       name: 'Молочний',  hex: '#EFE8DD' },
];

const FAQ = [
  {
    q: 'Які кольори можна обрати?',
    a: 'Абажур і база з обручем W фарбуються окремо, тож їх можна поєднувати як завгодно. У конструкторі — основні варіанти; якщо хочете інший відтінок, напишіть його в коментарі до замовлення або надішліть фото інтерʼєру — підберемо.'
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
    a: 'Оплата не відбувається на сайті. Після заявки ми уточнимо деталі в месенджері, погодимо вартість і доставку, а тоді надішлемо реквізити.'
  },
];

const TELEGRAM_USERNAME = 'kumchik';

/* ---------- state ---------- */
const state = {
  shade: SHADE_COLORS[0].id,
  base: BASE_COLORS[0].id,
  lightOn: false,
};

function getShade(id){ return SHADE_COLORS.find(c => c.id === id); }
function getBase(id){ return BASE_COLORS.find(c => c.id === id); }

function formatPrice(){
  if (PRICE_UAH == null) return 'за запитом';
  return `${PRICE_UAH.toLocaleString('uk-UA')} ₴`;
}

// white tick on dark swatches, dark tick on light ones
function isLight(hex){
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170;
}

/* ---------- configurator ---------- */
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
  const svg = document.getElementById('lampSvg');
  svg.style.setProperty('--shade', shade.hex);
  svg.style.setProperty('--base', base.hex);

  document.getElementById('lampStage').classList.toggle('is-on', state.lightOn);
  const toggle = document.getElementById('lightToggle');
  toggle.setAttribute('aria-pressed', state.lightOn ? 'true' : 'false');
  document.getElementById('lightToggleLabel').textContent = state.lightOn ? 'Вимкнути світло' : 'Увімкнути світло';

  document.getElementById('metaShade').textContent = shade.name;
  document.getElementById('metaBase').textContent = base.name;
  document.getElementById('shadeColorName').textContent = `— ${shade.name.toLowerCase()}`;
  document.getElementById('baseColorName').textContent = `— ${base.name.toLowerCase()}`;
  document.getElementById('metaPrice').textContent = formatPrice();
  document.getElementById('orderBtn').textContent =
    PRICE_UAH == null ? 'Замовити Dune' : `Замовити Dune — ${formatPrice()}`;
}

/* Dune relief on the preview shade: a stack of soft diagonal wave ridges
   (a blurred shadow line with a highlight just above it), each one a bit
   irregular so it reads like wind-blown sand rather than a stamped pattern. */
function buildRelief(){
  const g = document.getElementById('shadeRelief');
  const NS = 'http://www.w3.org/2000/svg';
  let seed = 11;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 12; i++){
    const y0 = 30 + i * 27 + rnd() * 8;
    const amp = 5 + rnd() * 5;
    const len = 38 + rnd() * 18;
    const phase = rnd() * Math.PI * 2;
    let d = '';
    for (let x = 40; x <= 280; x += 6){
      const y = y0 + (x - 40) * 0.22 + Math.sin(x / len + phase) * amp + Math.sin(x / 13 + i) * 1.6;
      d += (d ? ' L' : 'M') + x + ',' + y.toFixed(1);
    }
    [['ridge-shadow', 0], ['ridge-light', -4]].forEach(([cls, dy]) => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', cls);
      if (dy) path.setAttribute('transform', `translate(0 ${dy})`);
      g.appendChild(path);
    });
  }
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
  const comment = document.getElementById('orderComment').value.trim();
  const lines = [
    `Заявка на лампу ${PRODUCT_NAME}`,
    '',
    `Колір абажура: ${getShade(state.shade).name}`,
    `Колір бази та обруча W: ${getBase(state.base).name}`,
    `Вартість: ${formatPrice()}`,
  ];
  if (comment) lines.push('', `Коментар: ${comment}`);
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
  buildRelief();
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
