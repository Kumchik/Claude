/* =========================================================
   Waveform Home — логіка сторінки лампи Dune
   Ціна, контакти й палітри — див. README.md (розділ
   «Що обов'язково замінити»).

   Лампа складається з двох окремо фарбованих частин:
   абажур (рельєф піщаної дюни) і база разом із хвилястим
   обручем у формі W, на який абажур спирається.
   ========================================================= */

// Назва, ціна й палітра кольорів — за замовчуванням, поки не завантажиться
// /api/catalog (loadCatalog() нижче). Ці ж значення на сервері: див.
// DEFAULT_CATALOG в netlify/lib/shop.mjs. Змінюються через /admin.html —
// див. README.md, розділ «Адмінка» — без правки коду.
let PRODUCT_NAME = 'Waveform Dune';
let PRICE_UAH = 2100;
let FILAMENTS = [
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
let SHADE_COLORS = FILAMENTS;
let BASE_COLORS = FILAMENTS;

// Другий особливий товар з живим 3D (organizers.html) — корпус і вставки
// фарбуються окремо, як абажур і база в Dune, тією ж палітрою (нижче —
// просто інше посилання на FILAMENTS, для симетрії з SHADE_COLORS/
// BASE_COLORS). Значення за замовчуванням тут — на випадок, поки
// /api/catalog ще не завантажився; сервер: DEFAULT_CATALOG в
// netlify/lib/shop.mjs.
let TEA_NAME = 'Waveform Чай-органайзер';
let TEA_PRICE = 950;
let TEA_COLORS = FILAMENTS;

/* Товари, додані через /admin.html поза Dune (без 3D, з фото-галереєю й
   не обов'язковим одним кольором на вибір) — і категорії, за якими вони
   групуються на сторінці. Порожні, поки не завантажиться каталог або
   поки в адмінці нічого не додано. */
let catalogCategories = [];
let catalogProducts = [];
// категорія, обрана для Dune в адмінці; порожньо — Dune без категорії, як і завжди
let duneCategoryId = '';
const findProduct = id => catalogProducts.find(p => p.id === id);
const photoUrl = id => `/api/product-photo?id=${encodeURIComponent(id)}`;

/* Заміняє значення вище на актуальні з сервера. Якщо функції недоступні
   (звичайний статичний хостинг, прев'ю) — мовчки лишає значення за
   замовчуванням вище, сайт далі працює. */
async function loadCatalog(){
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) return;
    const cat = await res.json();
    if (!cat || !Array.isArray(cat.filaments) || !cat.filaments.length) return;
    PRODUCT_NAME = cat.productName || PRODUCT_NAME;
    PRICE_UAH = Number(cat.price) || PRICE_UAH;
    FILAMENTS = cat.filaments;
    SHADE_COLORS = FILAMENTS;
    BASE_COLORS = FILAMENTS;
    catalogCategories = Array.isArray(cat.categories) ? cat.categories : [];
    catalogProducts = Array.isArray(cat.products) ? cat.products : [];
    duneCategoryId = typeof cat.duneCategoryId === 'string' ? cat.duneCategoryId : '';
    // an admin may have removed the colour the page defaulted to
    if (!getShade(state.shade)) state.shade = FILAMENTS[0].id;
    if (!getBase(state.base)) state.base = FILAMENTS[0].id;
    if (cat.teaOrganizer && Array.isArray(cat.teaOrganizer.filaments) && cat.teaOrganizer.filaments.length){
      TEA_NAME = cat.teaOrganizer.name || TEA_NAME;
      TEA_PRICE = Number(cat.teaOrganizer.price) || TEA_PRICE;
      TEA_COLORS = cat.teaOrganizer.filaments;
      if (!getTeaColor(teaUiState.base)) teaUiState.base = TEA_COLORS[0].id;
      if (!getTeaColor(teaUiState.insert)) teaUiState.insert = TEA_COLORS[0].id;
    }
  } catch (e){
    console.warn('loadCatalog failed, using defaults', e);
  }
}

/* Уніфікований опис рядка кошика — і для Dune (два кольори, свій 3D),
   і для звичайних товарів з адмінки (фото, максимум один колір або без
   кольору взагалі). Все відображення кошика й оформлення читає звідси,
   щоб не дублювати цю розгалуженість у кожній функції. */
function cartLineInfo(it){
  if (it.product === 'dune'){
    const shade = getShade(it.shade), base = getBase(it.base);
    return {
      name: PRODUCT_NAME, unitPrice: PRICE_UAH,
      swatches: [shade?.hex, base?.hex],
      lines: [`Абажур: ${shade?.name || '—'}`, `База й обруч: ${base?.name || '—'}`],
      summary: `абажур ${shade?.name || '—'}, база ${base?.name || '—'}`,
    };
  }
  if (it.product === 'tea-organizer'){
    const base = getTeaColor(it.base), insert = getTeaColor(it.insert);
    return {
      name: TEA_NAME, unitPrice: TEA_PRICE,
      swatches: [base?.hex, insert?.hex],
      lines: [`Корпус: ${base?.name || '—'}`, `Вставки: ${insert?.name || '—'}`],
      summary: `корпус ${base?.name || '—'}, вставки ${insert?.name || '—'}`,
    };
  }
  const p = findProduct(it.product);
  if (!p) return { name: 'Товар', unitPrice: 0, swatches: [], lines: [], summary: '', photo: null };
  const color = p.filaments.find(f => f.id === it.color);
  return {
    name: p.name, unitPrice: p.price,
    swatches: color ? [color.hex] : [],
    lines: color ? [`Колір: ${color.name}`] : [],
    summary: color ? `колір ${color.name}` : '',
    photo: p.photos[0] ? photoUrl(p.photos[0]) : null,
  };
}

// Кольори за замовчуванням — як на фото лампи.
const PHOTO_SHADE = 'bone-white';
const PHOTO_BASE = 'chocolate';

// Універсальні питання (доставка/оплата) — однакові для обох ліній
// товару; сторінка з ними об'єднує їх зі своїм набором нижче.
const FAQ_COMMON = [
  {
    q: 'Як доставляєте?',
    a: 'Доставляємо по всій Україні. Кожен виріб надійно пакуємо, щоб він доїхав цілим.'
  },
  {
    q: 'Скільки часу займає виготовлення?',
    a: 'Точні терміни залежать від обраних кольорів і черги замовлень — ми назвемо їх одразу після заявки.'
  },
  {
    q: 'Як оплатити замовлення?',
    a: 'Два способи на вибір при оформленні. Карткою одразу на сайті — через захищену сторінку monobank: Apple Pay, Google Pay або картка будь-якого банку. Або накладеним платежем — оплата при отриманні на Новій пошті (Нова пошта бере свою комісію за переказ коштів).'
  },
];
const FAQ_LAMPS = [
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
  ...FAQ_COMMON,
];
const FAQ_ORGANIZERS = [
  {
    q: 'З чого зроблені органайзери?',
    a: 'Ми використовуємо еко матеріали й виготовляємо кожен органайзер на власному виробництві.'
  },
  ...FAQ_COMMON,
];
// <body data-page="lamps|organizers"> в кожному HTML-файлі каже, який
// набір показати; за замовчуванням — лампи.
const FAQ = document.body.dataset.page === 'organizers' ? FAQ_ORGANIZERS : FAQ_LAMPS;

// Username бота (без @), не особистого акаунта — клієнти пишуть сюди,
// а бот пересилає повідомлення в групу продавця (netlify/functions/telegram-webhook.mjs).
const TELEGRAM_USERNAME = 'waveform_orders_bot';

/* ---------- state ---------- */
const state = {
  shade: PHOTO_SHADE,
  base: PHOTO_BASE,
  lightOn: false,
};

function getShade(id){ return SHADE_COLORS.find(c => c.id === id); }
function getBase(id){ return BASE_COLORS.find(c => c.id === id); }

const teaUiState = { base: 'bone-white', insert: 'chocolate' };
function getTeaColor(id){ return TEA_COLORS.find(c => c.id === id); }

function formatPrice(uah = PRICE_UAH){
  return `${uah.toLocaleString('uk-UA')} ₴`;
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

function renderTeaOptions(){
  renderColorRow(document.getElementById('optTeaBase'), TEA_COLORS, teaUiState.base, id => {
    teaUiState.base = id; renderTeaOptions(); updateTeaPreview();
  });
  renderColorRow(document.getElementById('optTeaInsert'), TEA_COLORS, teaUiState.insert, id => {
    teaUiState.insert = id; renderTeaOptions(); updateTeaPreview();
  });
}

function updateTeaPreview(){
  const base = getTeaColor(teaUiState.base), insert = getTeaColor(teaUiState.insert);
  // tea3d.js may still be loading; it reads window.teaState itself once ready
  window.teaState = { base: base.hex, insert: insert.hex };
  if (window.tea3d) window.tea3d.update(window.teaState);

  paintColorName(document.getElementById('teaMetaBase'), base);
  paintColorName(document.getElementById('teaMetaInsert'), insert);
  document.getElementById('teaBaseColorName').textContent = `— ${base.name}`;
  document.getElementById('teaInsertColorName').textContent = `— ${insert.name}`;
  document.getElementById('teaMetaName').textContent = TEA_NAME;
  document.getElementById('teaMetaPrice').textContent = formatPrice(TEA_PRICE);
  document.getElementById('addTeaBtn').textContent = `Додати в кошик — ${formatPrice(TEA_PRICE)}`;
  // teaCatalogPrice lives on organizers.html only (tea's catalog card)
  const teaCatalogPriceEl = document.getElementById('teaCatalogPrice');
  if (teaCatalogPriceEl) teaCatalogPriceEl.textContent = formatPrice(TEA_PRICE);
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
  // catalogPrice lives on lamps.html only (Dune's catalog card)
  const catalogPriceEl = document.getElementById('catalogPrice');
  if (catalogPriceEl) catalogPriceEl.textContent = formatPrice();
  document.getElementById('addToCartBtn').textContent =
    `Додати в кошик — ${formatPrice()}`;
}

/* ---------- faq ---------- */
function renderFaq(){
  const list = document.getElementById('faqList');
  if (!list) return; // немає на index.html
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

/* ---------- каталог: картки товарів на lamps.html / organizers.html ----------
   Два окремих розділи сайту (сторінки), не вкладки: lamps.html завжди
   показує Dune і, якщо є, інші товари з тієї ж категорії, що обрана для
   Dune в адмінці (fCategory / duneCategoryId); organizers.html — усі
   товари з будь-якої іншої категорії. Кожен звичайний товар — картка з
   фото, ціною й кнопкою "Детальніше", що відкриває модалку (галерея,
   опис, колір, кількість, у кошик). */
function buildCard({ name, description, price, photoSrc }, buttonLabel, onClick){
  const card = document.createElement('article');
  card.className = 'catalog-card';
  if (photoSrc){
    const img = document.createElement('img');
    img.src = photoSrc; img.loading = 'lazy'; img.alt = name;
    card.appendChild(img);
  }
  const body = document.createElement('div');
  body.className = 'catalog-body';
  body.innerHTML = '<h3></h3><p></p><span class="catalog-price"></span><button type="button" class="btn btn-primary btn-small"></button>';
  card.appendChild(body);
  card.querySelector('h3').textContent = name;
  card.querySelector('.catalog-body p').textContent = description || '';
  const priceEl = card.querySelector('.catalog-price');
  priceEl.textContent = formatPrice(price);
  const btn = card.querySelector('button');
  btn.textContent = buttonLabel;
  btn.addEventListener('click', onClick);
  return { card, priceEl };
}

function buildDuneCard(){
  const { card, priceEl } = buildCard(
    { name: PRODUCT_NAME, description: 'Настільна лампа з рельєфом піщаної дюни', price: PRICE_UAH, photoSrc: 'img/dune-hero-700.jpg' },
    'Обрати кольори',
    () => document.getElementById('duneBuilder').scrollIntoView({ behavior: 'smooth' }));
  priceEl.id = 'catalogPrice'; // updatePreview() keeps this in sync with the chosen colours
  return card;
}

function buildTeaCard(){
  const { card, priceEl } = buildCard(
    { name: TEA_NAME, description: 'Органайзер для чаю на три секції з рельєфною хвилястою текстурою', price: TEA_PRICE, photoSrc: null },
    'Обрати колір',
    () => document.getElementById('teaBuilder').scrollIntoView({ behavior: 'smooth' }));
  priceEl.id = 'teaCatalogPrice'; // updateTeaPreview() keeps this in sync with the chosen colour
  return card;
}

function buildProductCard(p){
  const { card } = buildCard(
    { name: p.name, description: p.description, price: p.price, photoSrc: p.photos[0] ? photoUrl(p.photos[0]) : null },
    'Детальніше', () => openProductModal(p.id));
  return card;
}

function buildSoonCard(){
  const card = document.createElement('article');
  card.className = 'catalog-card catalog-card-soon';
  card.innerHTML = `
    <div class="soon-visual" aria-hidden="true">
      <svg viewBox="0 0 64 64"><path d="M8,36 C14,36 16,24 22,24 C28,24 30,40 36,40 C42,40 44,28 50,28 C53,28 55,31 56,32"/></svg>
    </div>
    <div class="catalog-body">
      <h3>Нові форми</h3>
      <p>Скоро в колекції</p>
      <a href="https://www.instagram.com/waveform.ua" class="btn btn-ghost btn-small" target="_blank" rel="noopener">Стежити в Instagram</a>
    </div>`;
  return card;
}

// lamps.html: Dune завжди перша картка, плюс товари з тієї ж категорії
function renderLampsGrid(){
  const grid = $('catalogGrid');
  if (!grid) return;
  grid.innerHTML = '';
  grid.appendChild(buildDuneCard());
  catalogProducts.filter(p => duneCategoryId && p.categoryId === duneCategoryId).forEach(p => grid.appendChild(buildProductCard(p)));
}

// organizers.html: чай-органайзер завжди перша картка (як Dune на lamps.html),
// плюс усе, що не в категорії Dune, і заглушка "більше форм" наприкінці
function renderOrganizersGrid(){
  const grid = $('organizersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  grid.appendChild(buildTeaCard());
  catalogProducts.filter(p => !duneCategoryId || p.categoryId !== duneCategoryId).forEach(p => grid.appendChild(buildProductCard(p)));
  grid.appendChild(buildSoonCard());
}

let pmState = { productId: null, color: null, qty: 1 };

function openProductModal(productId){
  const p = findProduct(productId);
  if (!p) return;
  pmState = { productId, color: p.filaments[0]?.id || null, qty: 1 };

  const photosBox = $('pmPhotos');
  photosBox.innerHTML = '';
  if (p.photos.length){
    const main = document.createElement('img');
    main.src = photoUrl(p.photos[0]);
    main.alt = p.name;
    photosBox.appendChild(main);
    if (p.photos.length > 1){
      const thumbs = document.createElement('div');
      thumbs.className = 'pm-thumbs';
      p.photos.forEach((photoId, i) => {
        const t = document.createElement('img');
        t.src = photoUrl(photoId);
        t.alt = '';
        t.className = i === 0 ? 'active' : '';
        t.addEventListener('click', () => {
          main.src = photoUrl(photoId);
          thumbs.querySelectorAll('img').forEach(im => im.classList.remove('active'));
          t.classList.add('active');
        });
        thumbs.appendChild(t);
      });
      photosBox.appendChild(thumbs);
    }
  }

  $('pmTitle').textContent = p.name;
  $('pmDescription').textContent = p.description || '';
  $('pmDescription').hidden = !p.description;
  renderProductColors(p);
  updateProductModal(p);

  const qtyBox = $('pmQty');
  qtyBox.querySelector('output').textContent = pmState.qty;
  qtyBox.querySelector('.q-minus').onclick = () => { pmState.qty = Math.max(1, pmState.qty - 1); qtyBox.querySelector('output').textContent = pmState.qty; };
  qtyBox.querySelector('.q-plus').onclick = () => { pmState.qty = Math.min(MAX_QTY, pmState.qty + 1); qtyBox.querySelector('output').textContent = pmState.qty; };

  $('pmAdd').onclick = () => {
    addProductToCart(p.id, pmState.color, pmState.qty);
    closeProductModal();
  };

  $('productModal').classList.add('open');
  $('pmClose').focus();
}

function renderProductColors(p){
  const box = $('pmColors');
  if (!p.filaments.length){ box.innerHTML = ''; return; }
  renderColorRow(box, p.filaments, pmState.color, id => {
    pmState.color = id;
    renderProductColors(p);
  });
}

function updateProductModal(p){
  $('pmPrice').textContent = formatPrice(p.price);
}

function closeProductModal(){
  $('productModal').classList.remove('open');
}

/* ---------- cart ----------
   Lines are { product, shade, base, qty } for Dune, or { product, color,
   qty } for a product added from /admin.html (color omitted if that
   product has no palette). The same line added twice becomes one line
   with a bigger quantity. The cart is kept in this browser
   (localStorage) so it survives a reload or a closed tab. Prices shown
   here are for display only: the server recounts the total. */
const CART_KEY = 'waveform-cart-v1';
const MAX_QTY = 10;
// filled from loadCart() once the catalog is loaded (see DOMContentLoaded) —
// otherwise a cart line for a product added via /admin.html would look
// invalid before catalogProducts is populated and get dropped
let cart = [];

function loadCart(){
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(it => {
      if (!it || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_QTY) return false;
      if (it.product === 'dune') return getShade(it.shade) && getBase(it.base);
      if (it.product === 'tea-organizer') return !!getTeaColor(it.base) && !!getTeaColor(it.insert);
      const p = findProduct(it.product);
      if (!p) return false;
      return p.filaments.length ? p.filaments.some(f => f.id === it.color) : true;
    });
  } catch (e) { return []; }
}
function saveCart(){
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* private mode */ }
}
const cartCount = () => cart.reduce((n, it) => n + it.qty, 0);
const cartTotal = () => cart.reduce((sum, it) => sum + cartLineInfo(it).unitPrice * it.qty, 0);

function addToCart(){
  const same = cart.find(it => it.product === 'dune' && it.shade === state.shade && it.base === state.base);
  if (same) same.qty = Math.min(MAX_QTY, same.qty + 1);
  else cart.push({ product: 'dune', shade: state.shade, base: state.base, qty: 1 });
  saveCart();
  renderCart();
  bumpCartBadge();
  openCart();
}

function addTeaToCart(){
  const same = cart.find(it => it.product === 'tea-organizer' && it.base === teaUiState.base && it.insert === teaUiState.insert);
  if (same) same.qty = Math.min(MAX_QTY, same.qty + 1);
  else cart.push({ product: 'tea-organizer', base: teaUiState.base, insert: teaUiState.insert, qty: 1 });
  saveCart();
  renderCart();
  bumpCartBadge();
  openCart();
}

// used by the product modal (see initCatalogGrid) for anything added via /admin.html
function addProductToCart(productId, color, qty = 1){
  const same = cart.find(it => it.product === productId && it.color === color);
  if (same) same.qty = Math.min(MAX_QTY, same.qty + qty);
  else cart.push({ product: productId, color, qty: Math.min(MAX_QTY, qty) });
  saveCart();
  renderCart();
  bumpCartBadge();
  openCart();
}

function bumpCartBadge(){
  const badge = $('cartCount');
  badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
}

function setQty(i, qty){
  if (qty < 1) cart.splice(i, 1);
  else cart[i].qty = Math.min(MAX_QTY, qty);
  saveCart();
  renderCart();
}

function clearCart(){
  cart = [];
  saveCart();
  renderCart();
}

function renderCart(){
  const n = cartCount();
  $('cartCount').textContent = n;
  $('cartCount').hidden = n === 0;
  $('cartBtn').setAttribute('aria-label', n ? `Кошик: ${n} шт.` : 'Кошик');
  $('cartEmpty').hidden = n > 0;
  $('cartFoot').hidden = n === 0;
  $('cartTotal').textContent = formatPrice(cartTotal());

  const list = $('cartList');
  list.innerHTML = '';
  cart.forEach((it, i) => {
    const info = cartLineInfo(it);
    const li = document.createElement('li');
    li.className = 'cart-line';
    const swatchHtml = info.swatches.length === 2
      ? `<span class="sw-shade" style="background:${info.swatches[0]}"></span><span class="sw-base" style="background:${info.swatches[1]}"></span>`
      : info.swatches.length === 1
      ? `<span class="sw-shade" style="background:${info.swatches[0]}"></span>`
      : info.photo ? `<img src="${info.photo}" alt="" loading="lazy">` : '';
    li.innerHTML = `
      <div class="cart-swatch${info.swatches.length === 1 ? ' single' : ''}" aria-hidden="true">${swatchHtml}</div>
      <div class="cart-info"><strong></strong>${info.lines.map(l => `<small></small>`).join('')}
        <button type="button" class="cart-remove">Видалити</button></div>
      <div class="cart-side"><span class="cart-line-price"></span>
        <div class="qty"><button type="button" class="q-minus"></button><output></output><button type="button" class="q-plus"></button></div></div>`;
    li.querySelector('strong').textContent = info.name;
    li.querySelectorAll('.cart-info small').forEach((el, j) => { el.textContent = info.lines[j]; });
    li.querySelector('.cart-line-price').textContent = formatPrice(info.unitPrice * it.qty);
    li.querySelector('output').textContent = it.qty;
    const minus = li.querySelector('.q-minus'), plus = li.querySelector('.q-plus');
    minus.textContent = '−'; plus.textContent = '+';
    minus.setAttribute('aria-label', it.qty === 1 ? 'Видалити позицію' : 'Менше');
    plus.setAttribute('aria-label', 'Більше');
    plus.disabled = it.qty >= MAX_QTY;
    minus.addEventListener('click', () => setQty(i, it.qty - 1));
    plus.addEventListener('click', () => setQty(i, it.qty + 1));
    li.querySelector('.cart-remove').addEventListener('click', () => setQty(i, 0));
    list.appendChild(li);
  });
}

function openCart(){
  $('cartDrawer').hidden = false;
  $('cartOverlay').hidden = false;
  $('cartBtn').setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
  (cart.length ? $('cartCheckout') : $('cartClose')).focus();
}
function closeCart(focusBack = true){
  $('cartDrawer').hidden = true;
  $('cartOverlay').hidden = true;
  $('cartBtn').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
  if (focusBack) $('cartBtn').focus();
}
const cartOpen = () => !$('cartDrawer').hidden;

/* ---------- checkout ----------
   The form posts to the Netlify Functions in netlify/functions:
   card → /api/create-order returns a monobank payment page and the
   customer is sent there; monobank brings them back to ?order=… and
   /api/order-status says whether it was paid. Cash on delivery → the
   order goes straight to Telegram. Where those functions aren't
   running (a plain static host, a preview), the customer gets a
   Telegram message with the order instead, so no order is lost. */
const $ = id => document.getElementById(id);

function buildSummary(extra = []){
  return [
    'Заявка на замовлення Waveform',
    '',
    ...cart.map((it, i) => {
      const info = cartLineInfo(it);
      return `${i + 1}. ${info.name} × ${it.qty}${info.summary ? ': ' + info.summary : ''}`;
    }),
    `Разом: ${formatPrice(cartTotal())}`,
    ...extra,
  ].join('\n');
}

const telegramLink = text => `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(text)}`;

function openModal(){
  $('orderModal').classList.add('open');
  $('modalClose').focus();
}

function closeOrderModal(){
  $('orderModal').classList.remove('open');
  $('cartBtn').focus();
}

function showCheckout(){
  if (!cart.length) return openCart();
  if (cartOpen()) closeCart(false);
  const box = $('checkoutItem');
  box.innerHTML = '<ul></ul><div class="co-total"><span>Разом</span><span></span></div>';
  cart.forEach(it => {
    const info = cartLineInfo(it);
    const li = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = `${info.name} × ${it.qty}`;
    if (info.summary){
      const sub = document.createElement('small');
      sub.textContent = info.summary.replace(/^./, c => c.toUpperCase());
      left.appendChild(sub);
    }
    const price = document.createElement('span');
    price.textContent = formatPrice(info.unitPrice * it.qty);
    li.append(left, price);
    box.querySelector('ul').appendChild(li);
  });
  box.querySelector('.co-total span:last-child').textContent = formatPrice(cartTotal());
  $('checkoutError').hidden = true;
  $('checkoutView').hidden = false;
  $('resultView').hidden = true;
  syncSubmitLabel();
  openModal();
  $('coName').focus();
}

function showResult(title, text, actions = []){
  $('resultTitle').textContent = title;
  $('resultText').textContent = text;
  const box = $('resultActions');
  box.innerHTML = '';
  actions.forEach(({ label, href, onClick, primary }) => {
    const el = document.createElement(href ? 'a' : 'button');
    el.className = 'btn ' + (primary ? 'btn-primary' : 'btn-ghost');
    el.textContent = label;
    if (href){ el.href = href; el.target = '_blank'; el.rel = 'noopener'; }
    if (onClick) el.addEventListener('click', onClick);
    box.appendChild(el);
  });
  $('checkoutView').hidden = true;
  $('resultView').hidden = false;
  openModal();
}

function payment(){
  return $('checkoutForm').querySelector('input[name="payment"]:checked').value;
}

function syncSubmitLabel(){
  // the e-receipt email only applies to card payments (monobank sends it)
  $('emailField').hidden = payment() !== 'card';
  $('checkoutSubmit').textContent = payment() === 'card'
    ? `Оплатити ${formatPrice(cartTotal())}`
    : 'Підтвердити замовлення';
}

function formError(msg, field){
  $('checkoutError').textContent = msg;
  $('checkoutError').hidden = false;
  $('checkoutForm').querySelectorAll('input').forEach(i => i.removeAttribute('aria-invalid'));
  if (field){ field.setAttribute('aria-invalid', 'true'); field.focus(); }
}

// the same checks the server makes, so most mistakes show up instantly
function checkForm(){
  const f = $('checkoutForm');
  const v = name => f.elements[name].value.trim();
  if (v('name').length < 3) return ['Вкажіть прізвище та імʼя отримувача.', f.elements.name];
  if (!/^(380\d{9}|0\d{9})$/.test(v('phone').replace(/\D/g, ''))) return ['Вкажіть телефон у форматі +380XXXXXXXXX.', f.elements.phone];
  if (v('city').length < 2) return ['Вкажіть місто.', f.elements.city];
  if (!v('branch')) return ['Вкажіть відділення або поштомат Нової пошти.', f.elements.branch];
  const email = v('email');
  if (payment() === 'card' && email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return ['Перевірте email для чека або залиште поле порожнім.', f.elements.email];
  if (!f.elements.agree.checked) return ['Підтвердьте згоду з умовами оферти, щоб оформити замовлення.', f.elements.agree];
  return null;
}

async function submitCheckout(e){
  e.preventDefault();
  const problem = checkForm();
  if (problem) return formError(...problem);
  $('checkoutError').hidden = true;

  const f = $('checkoutForm');
  const data = {
    items: cart.map(({ product, shade, base, insert, color, qty }) => ({ product, shade, base, insert, color, qty })),
    payment: payment(),
    name: f.elements.name.value, phone: f.elements.phone.value,
    city: f.elements.city.value, branch: f.elements.branch.value,
    website: f.elements.website.value,
    agree: f.elements.agree.checked,
    email: payment() === 'card' ? f.elements.email.value.trim() : '',
  };
  const btn = $('checkoutSubmit');
  btn.disabled = true;
  btn.textContent = data.payment === 'card' ? 'Переходимо до оплати…' : 'Надсилаємо…';

  let res, body;
  try {
    res = await fetch('/api/create-order', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
    });
    body = await res.json();
  } catch (err) {
    res = null;
  }
  btn.disabled = false;
  syncSubmitLabel();

  if (!res || (!res.ok && !body?.error)){
    // no checkout backend here: hand the order over via Telegram instead
    const text = buildSummary(['', `Отримувач: ${data.name}`, `Телефон: ${data.phone}`,
      `Нова пошта: ${data.city}, ${data.branch}`,
      `Оплата: ${data.payment === 'card' ? 'карткою' : 'накладений платіж'}`]);
    return showResult('Надішліть замовлення в Telegram',
      'Онлайн-оформлення зараз недоступне. Натисніть кнопку — текст замовлення підставиться сам, залишиться тільки надіслати.',
      [{ label: 'Надіслати в Telegram', href: telegramLink(text), primary: true }]);
  }
  if (!res.ok) return formError(body.error);

  if (body.payment === 'card'){
    window.location.href = body.pageUrl;
    return;
  }
  clearCart();
  showResult('Дякуємо, замовлення прийнято!',
    `Номер замовлення ${body.orderId}. Ми напишемо або зателефонуємо, щоб підтвердити деталі. ` +
    'Оплата — при отриманні на Новій пошті.',
    [{ label: 'Готово', onClick: closeOrderModal, primary: true }]);
}

/* ---------- Nova Poshta suggestions ----------
   City and branch inputs suggest matches from Nova Poshta (via /api/np).
   They stay plain text fields: if the lookup is unavailable, people just
   type the city and branch themselves. */
const npCache = new Map();
async function npLookup(params){
  const key = params.toString();
  if (!npCache.has(key)){
    npCache.set(key, fetch(`/api/np?${key}`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => []));
  }
  const items = await npCache.get(key);
  if (!Array.isArray(items)) npCache.delete(key);
  return Array.isArray(items) ? items : [];
}

function combobox(input, list, load, pick){
  let items = [], active = -1, timer = null, seq = 0;
  const close = () => {
    list.hidden = true; active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };
  const render = () => {
    list.innerHTML = '';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.id = `${list.id}-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      li.textContent = it.label;
      if (it.sub){ const s = document.createElement('small'); s.textContent = it.sub; li.appendChild(s); }
      // pointerdown, not click: keeps the input from blurring first
      li.addEventListener('pointerdown', e => { e.preventDefault(); choose(i); });
      list.appendChild(li);
    });
    const open = items.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (active >= 0){
      input.setAttribute('aria-activedescendant', `${list.id}-${active}`);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    }
  };
  const choose = i => { const it = items[i]; close(); if (it) pick(it); };
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const mine = ++seq;
      const next = await load(input.value.trim());
      if (mine !== seq || document.activeElement !== input) return;
      items = next; active = -1; render();
    }, 220);
  };
  input.addEventListener('input', refresh);
  input.addEventListener('focus', refresh);
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', e => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      const n = items.length;
      active = e.key === 'ArrowDown' ? (active + 1) % n : (active - 1 + n) % n;
      render();
    } else if (e.key === 'Enter' && active >= 0){
      e.preventDefault(); choose(active);
    } else if (e.key === 'Escape'){
      e.stopPropagation(); close();
    }
  });
}

function initNovaPoshta(){
  const city = $('coCity'), branch = $('coBranch');
  let cityRef = '';
  combobox(city, $('coCityList'),
    q => q.length < 2 ? [] : npLookup(new URLSearchParams({ type: 'cities', q }))
      .then(list => list.map(c => ({ label: c.name, sub: c.area, ref: c.ref }))),
    it => {
      city.value = it.label;
      cityRef = it.ref;
      branch.value = '';
      branch.focus();
    });
  // typing a different city forgets the picked one
  city.addEventListener('input', () => { cityRef = ''; });
  combobox(branch, $('coBranchList'),
    q => !cityRef ? [] : npLookup(new URLSearchParams({ type: 'warehouses', city: cityRef, q }))
      .then(list => list.map(w => ({ label: w.name, sub: w.kind }))),
    it => { branch.value = it.label; });
}

/* back from monobank: ?order=DN-…#order-result (always the homepage —
   see redirectUrl in create-order.mjs) */
async function checkReturnedOrder(){
  const id = new URLSearchParams(location.search).get('order');
  if (!id) return;
  history.replaceState(null, '', location.pathname + '#top');
  showResult('Перевіряємо оплату…', `Замовлення ${id}`);

  for (let attempt = 0; attempt < 6; attempt++){
    let status = null;
    try {
      const res = await fetch(`/api/order-status?order=${encodeURIComponent(id)}`);
      if (res.ok) status = (await res.json()).status;
    } catch (e) { /* retry below */ }

    if (status === 'success'){
      clearCart();
      return showResult('Оплату отримано — дякуємо!',
        `Замовлення ${id} оплачено. Ми вже почали роботу над вашим замовленням і напишемо, коли відправимо його Новою поштою.`,
        [{ label: 'Готово', onClick: closeOrderModal, primary: true }]);
    }
    if (['failure', 'expired', 'reversed'].includes(status)){
      return showResult('Оплата не пройшла',
        `Кошти за замовлення ${id} не списані. Спробуйте ще раз або оберіть накладений платіж.`,
        [{ label: 'Спробувати ще раз', onClick: showCheckout, primary: true }]);
    }
    await new Promise(r => setTimeout(r, 2500));
  }
  showResult('Оплата ще обробляється',
    `Банк ще не підтвердив оплату замовлення ${id}. Щойно вона пройде, ми отримаємо сповіщення й звʼяжемося з вами.`,
    [{ label: 'Написати в Telegram', href: telegramLink(`Замовлення ${id}: питання щодо оплати`) },
     { label: 'Готово', onClick: closeOrderModal, primary: true }]);
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
document.addEventListener('DOMContentLoaded', async () => {
  await loadCatalog();
  cart = loadCart();

  // конструктор Dune є тільки на lamps.html
  if ($('optShade')){
    renderOptions();
    updatePreview();
  }
  // конструктор чай-органайзера є тільки на organizers.html
  if ($('optTeaBase')){
    renderTeaOptions();
    updateTeaPreview();
  }
  renderLampsGrid();
  renderOrganizersGrid();
  renderFaq();
  initNav();

  if ($('lightToggle')){
    $('lightToggle').addEventListener('click', () => {
      state.lightOn = !state.lightOn;
      updatePreview();
    });
  }
  renderCart();
  if ($('addToCartBtn')) $('addToCartBtn').addEventListener('click', addToCart);
  if ($('addTeaBtn')) $('addTeaBtn').addEventListener('click', addTeaToCart);
  $('cartBtn').addEventListener('click', () => cartOpen() ? closeCart() : openCart());
  $('cartClose').addEventListener('click', () => closeCart());
  $('cartOverlay').addEventListener('click', () => closeCart());
  $('cartCheckout').addEventListener('click', showCheckout);
  $('cartContinue').addEventListener('click', () => {
    closeCart(false);
    document.getElementById('top').scrollIntoView({ behavior: 'smooth' });
  });
  $('cartEmptyBack').addEventListener('click', () => {
    closeCart(false);
    document.getElementById('top').scrollIntoView({ behavior: 'smooth' });
  });
  // another tab changed the cart
  window.addEventListener('storage', e => { if (e.key === CART_KEY){ cart = loadCart(); renderCart(); } });
  $('modalClose').addEventListener('click', closeOrderModal);
  $('orderModal').addEventListener('click', e => {
    if (e.target.id === 'orderModal') closeOrderModal();
  });
  $('pmClose').addEventListener('click', closeProductModal);
  $('productModal').addEventListener('click', e => {
    if (e.target.id === 'productModal') closeProductModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('orderModal').classList.contains('open')) closeOrderModal();
    else if ($('productModal').classList.contains('open')) closeProductModal();
    else if (cartOpen()) closeCart();
  });
  $('checkoutForm').addEventListener('submit', submitCheckout);
  initNovaPoshta();
  $('checkoutForm').addEventListener('input', e => {
    if (e.target.getAttribute('aria-invalid')){
      e.target.removeAttribute('aria-invalid');
      $('checkoutError').hidden = true;
    }
  });
  $('checkoutForm').addEventListener('change', e => { if (e.target.name === 'payment') syncSubmitLabel(); });
  checkReturnedOrder();
  document.getElementById('year').textContent = new Date().getFullYear();

  // "back to top" arrow: appears after scrolling past the hero
  const backToTop = $('backToTop');
  const toggleBackToTop = () => backToTop.classList.toggle('is-visible', window.scrollY > 500);
  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  toggleBackToTop();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
});
