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
    a: 'Два способи на вибір при оформленні. Карткою одразу на сайті — через захищену сторінку monobank: Apple Pay, Google Pay або картка будь-якого банку. Або накладеним платежем — оплата при отриманні на Новій пошті (Нова пошта бере свою комісію за переказ коштів).'
  },
];

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
  document.getElementById('addToCartBtn').textContent =
    `Додати в кошик — ${formatPrice()}`;
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

/* ---------- cart ----------
   Lines are { product, shade, base, qty }; the same lamp added twice
   becomes one line with a bigger quantity. The cart is kept in this
   browser (localStorage) so it survives a reload or a closed tab. Prices
   shown here are for display only: the server recounts the total. */
const CART_KEY = 'waveform-cart-v1';
const MAX_QTY = 10;
let cart = loadCart();

function loadCart(){
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(it =>
      it && it.product === 'dune' && getShade(it.shade) && getBase(it.base) &&
      Number.isInteger(it.qty) && it.qty >= 1 && it.qty <= MAX_QTY) : [];
  } catch (e) { return []; }
}
function saveCart(){
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* private mode */ }
}
const cartCount = () => cart.reduce((n, it) => n + it.qty, 0);
const cartTotal = () => cart.reduce((sum, it) => sum + PRICE_UAH * it.qty, 0);

function addToCart(){
  const same = cart.find(it => it.shade === state.shade && it.base === state.base);
  if (same) same.qty = Math.min(MAX_QTY, same.qty + 1);
  else cart.push({ product: 'dune', shade: state.shade, base: state.base, qty: 1 });
  saveCart();
  renderCart();
  const badge = $('cartCount');
  badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
  openCart();
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
    const shade = getShade(it.shade), base = getBase(it.base);
    const li = document.createElement('li');
    li.className = 'cart-line';
    li.innerHTML = `
      <div class="cart-swatch" aria-hidden="true"><span class="sw-shade"></span><span class="sw-base"></span></div>
      <div class="cart-info"><strong></strong><small class="c-shade"></small><small class="c-base"></small>
        <button type="button" class="cart-remove">Видалити</button></div>
      <div class="cart-side"><span class="cart-line-price"></span>
        <div class="qty"><button type="button" class="q-minus"></button><output></output><button type="button" class="q-plus"></button></div></div>`;
    li.querySelector('.sw-shade').style.background = shade.hex;
    li.querySelector('.sw-base').style.background = base.hex;
    li.querySelector('strong').textContent = PRODUCT_NAME;
    li.querySelector('.c-shade').textContent = `Абажур: ${shade.name}`;
    li.querySelector('.c-base').textContent = `База й обруч: ${base.name}`;
    li.querySelector('.cart-line-price').textContent = formatPrice(PRICE_UAH * it.qty);
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
    ...cart.map((it, i) => `${i + 1}. ${PRODUCT_NAME} × ${it.qty}: абажур ${getShade(it.shade).name}, база ${getBase(it.base).name}`),
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
    const li = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = `${PRODUCT_NAME} × ${it.qty}`;
    const sub = document.createElement('small');
    sub.textContent = `абажур ${getShade(it.shade).name} · база ${getBase(it.base).name}`;
    left.appendChild(sub);
    const price = document.createElement('span');
    price.textContent = formatPrice(PRICE_UAH * it.qty);
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
    items: cart.map(({ product, shade, base, qty }) => ({ product, shade, base, qty })),
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

/* back from monobank: ?order=DN-…#order-result */
async function checkReturnedOrder(){
  const id = new URLSearchParams(location.search).get('order');
  if (!id) return;
  history.replaceState(null, '', location.pathname + '#configurator');
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
document.addEventListener('DOMContentLoaded', () => {
  renderOptions();
  updatePreview();
  renderFaq();
  initNav();

  document.getElementById('lightToggle').addEventListener('click', () => {
    state.lightOn = !state.lightOn;
    updatePreview();
  });
  renderCart();
  $('addToCartBtn').addEventListener('click', addToCart);
  $('cartBtn').addEventListener('click', () => cartOpen() ? closeCart() : openCart());
  $('cartClose').addEventListener('click', () => closeCart());
  $('cartOverlay').addEventListener('click', () => closeCart());
  $('cartCheckout').addEventListener('click', showCheckout);
  $('cartContinue').addEventListener('click', () => {
    closeCart(false);
    document.getElementById('configurator').scrollIntoView({ behavior: 'smooth' });
  });
  $('cartEmptyBack').addEventListener('click', () => {
    closeCart(false);
    document.getElementById('configurator').scrollIntoView({ behavior: 'smooth' });
  });
  // another tab changed the cart
  window.addEventListener('storage', e => { if (e.key === CART_KEY){ cart = loadCart(); renderCart(); } });
  $('modalClose').addEventListener('click', closeOrderModal);
  $('orderModal').addEventListener('click', e => {
    if (e.target.id === 'orderModal') closeOrderModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('orderModal').classList.contains('open')) closeOrderModal();
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
});
