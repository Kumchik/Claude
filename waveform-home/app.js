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
  { id: 'sand',   name: 'Пісок',     hex: '#EADBC6', original: true },
  { id: 'milk',   name: 'Молочний',  hex: '#F6F1E8' },
  { id: 'peach',  name: 'Персик',    hex: '#F1C8A6' },
  { id: 'powder', name: 'Пудра',     hex: '#EAC3BE' },
  { id: 'sage',   name: 'Шавлія',    hex: '#C8D0B6' },
  { id: 'fog',    name: 'Туман',     hex: '#D5D6D8' },
];

const BASE_COLORS = [
  { id: 'chocolate',  name: 'Шоколад',   hex: '#6E4330', original: true },
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
  drawLamp();

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

/* ---------- photo recolour ----------
   The preview is the real photo of Dune (img/dune-config.jpg), not a
   drawing. img/dune-config-mask.png marks which pixels belong to the
   абажур (red channel) and to the база + обруч W (green channel). Each
   masked pixel keeps its own brightness from the photo — so every wave,
   shadow and highlight stays exactly where it is — and only its colour
   is swapped: out = newColour × pixelLuminance / originalColourLuminance.
   The colours marked `original` are the ones in the photo, so picking
   them shows the untouched photo. */
const GLOW = [255, 212, 138];
const recolor = { ready: false, ctx: null, photo: null, mask: null, out: null };

const srgbLum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function hexToRgb(hex){
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function initRecolor(){
  try {
    const [photo, mask] = await Promise.all([
      loadImage('img/dune-config.jpg'),
      loadImage('img/dune-config-mask.png'),
    ]);
    const canvas = document.getElementById('lampCanvas');
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(mask, 0, 0, w, h);
    recolor.mask = ctx.getImageData(0, 0, w, h).data;
    ctx.drawImage(photo, 0, 0, w, h);
    recolor.photo = ctx.getImageData(0, 0, w, h).data;
    recolor.out = ctx.createImageData(w, h);
    recolor.ctx = ctx;
    recolor.ready = true;
    document.getElementById('lampStage').classList.add('has-canvas');
    drawLamp();
  } catch (e) {
    // canvas unavailable — the plain photo stays visible
  }
}

function partPaint(color, orig){
  const [r, g, b] = hexToRgb(color.hex);
  const [or, og, ob] = hexToRgb(orig.hex);
  return { keep: color.id === orig.id, r, g, b, k: 1 / srgbLum(or, og, ob) };
}

function drawLamp(){
  if (!recolor.ready) return;
  const shade = partPaint(getShade(state.shade), SHADE_COLORS.find(c => c.original));
  const base = partPaint(getBase(state.base), BASE_COLORS.find(c => c.original));
  const on = state.lightOn;
  const src = recolor.photo, m = recolor.mask, dst = recolor.out.data;

  for (let i = 0; i < src.length; i += 4){
    let r = src[i], g = src[i + 1], b = src[i + 2];
    const ws = m[i] / 255, wb = m[i + 1] / 255;
    const lum = srgbLum(r, g, b);

    if (ws > 0 && !shade.keep){
      const f = lum * shade.k;
      r += (Math.min(255, shade.r * f) - r) * ws;
      g += (Math.min(255, shade.g * f) - g) * ws;
      b += (Math.min(255, shade.b * f) - b) * ws;
    }
    if (wb > 0 && !base.keep){
      const f = lum * base.k;
      r += (Math.min(255, base.r * f) - r) * wb;
      g += (Math.min(255, base.g * f) - g) * wb;
      b += (Math.min(255, base.b * f) - b) * wb;
    }
    if (on){
      if (ws > 0){
        // light from inside: screen a warm tone over the shade
        const a = 0.55 * ws;
        r += (255 - (255 - r) * (255 - GLOW[0]) / 255 - r) * a;
        g += (255 - (255 - g) * (255 - GLOW[1]) / 255 - g) * a;
        b += (255 - (255 - b) * (255 - GLOW[2]) / 255 - b) * a;
      } else {
        // the room dims around the lit lamp
        const d = wb > 0 ? 0.85 : 0.6;
        r *= d; g *= d * 0.97; b *= d * 0.9;
      }
    }
    dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
  }
  recolor.ctx.putImageData(recolor.out, 0, 0);
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
  renderOptions();
  initRecolor();
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
