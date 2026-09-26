/* =========================================================
   Спільне для серверних функцій магазину (Netlify Functions).

   Налаштування — змінні середовища в Netlify
   (Site configuration → Environment variables):
     MONO_TOKEN             токен еквайрингу monobank (X-Token)
     TELEGRAM_BOT_TOKEN     токен бота від @BotFather
     TELEGRAM_CHAT_ID       ваш chat id, куди бот пише про замовлення
     TELEGRAM_WEBHOOK_SECRET  секрет для /api/telegram-webhook (README)
     ADMIN_PASSWORD         пароль для /admin.html (README, «Адмінка»)
   ========================================================= */

// limits for one order
const MAX_LINES = 20, MAX_QTY = 10;
const MAX_FILAMENTS = 40;
const MAX_CATEGORIES = 20;
const MAX_PRODUCTS = 60;
const MAX_PHOTOS = 12;

/* Товар (назва, ціна) і палітра філаменту — раніше були захардкоджені
   тут і в app.js; тепер живуть у Netlify Blobs і редагуються через
   /admin.html (див. README, розділ «Адмінка»). Це значення за
   замовчуванням: використовуються, поки нічого не збережено в сховищі,
   і як зразок форми для валідації. */
export const DEFAULT_CATALOG = {
  productName: 'Waveform Dune',
  price: 2100,
  filaments: [
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
  ],
  // Waveform Dune (вище) лишається окремим, особливим товаром — з живим
  // 3D-конструктором на головній сторінці, не з цього списку. Тут —
  // додаткові товари, які можна заводити через /admin.html без 3D-моделі:
  // фото-галерея, ціна, опис, необов'язкова палітра кольорів (один колір
  // на вибір; порожня — товар без вибору кольору).
  categories: [],
  products: [],
  // якщо порожньо — Dune показується сам, без категорій (як і зараз);
  // якщо вказано id категорії — Dune зʼявляється карткою в цій категорії
  // разом з іншими товарами, а клік по картці веде до конструктора
  duneCategoryId: '',
  // Другий особливий товар з живим 3D-конструктором (сторінка organizers.html) —
  // два кольори на вибір, як у Dune (корпус і вставки фарбуються окремо),
  // тому окремий об'єкт, а не запис у products[]. Та сама палітра, що й у
  // Dune вище (filaments) — колір тут не окрема сутність, просто повний
  // список продубльовано для цього товару.
  teaOrganizer: {
    name: 'Waveform Чай-органайзер',
    price: 950,
    filaments: [
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
    ],
  },
};

export async function catalogStore(){
  if (globalThis.__catalogStore) return globalThis.__catalogStore; // local tests
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'catalog', consistency: 'strong' });
}

/* The current product/price/filaments — from Blobs if the admin has ever
   saved something, otherwise the defaults above. Never throws: a broken
   or missing catalog must not take the storefront down. */
export async function getCatalog(){
  try {
    const store = await catalogStore();
    const saved = await store.get('config', { type: 'json' });
    if (saved && Array.isArray(saved.filaments) && saved.filaments.length){
      // a catalog saved before categories/products/duneCategoryId existed still works
      if (!Array.isArray(saved.categories)) saved.categories = [];
      if (!Array.isArray(saved.products)) saved.products = [];
      if (typeof saved.duneCategoryId !== 'string') saved.duneCategoryId = '';
      if (!saved.teaOrganizer || !Array.isArray(saved.teaOrganizer.filaments) || !saved.teaOrganizer.filaments.length){
        saved.teaOrganizer = structuredClone(DEFAULT_CATALOG.teaOrganizer);
      }
      return saved;
    }
  } catch (e){
    console.error('getCatalog failed, using defaults', e);
  }
  return structuredClone(DEFAULT_CATALOG);
}

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9-]{1,40}$/;

/* Shared by Dune's palette and every generic product's palette. filaments
   may be empty for a product (no colour choice) — pass allowEmpty. */
function checkFilaments(raw, allowEmpty, label){
  if (!Array.isArray(raw)) return { error: `${label}: некоректні дані кольорів.` };
  if (!allowEmpty && !raw.length) return { error: `${label}: додайте хоча б один колір.` };
  if (raw.length > MAX_FILAMENTS) return { error: `${label}: забагато кольорів (максимум ${MAX_FILAMENTS}).` };
  const filaments = [];
  const seen = new Set();
  for (const f of raw){
    const id = clean(f?.id, 40).toLowerCase();
    const name = clean(f?.name, 40);
    const hex = clean(f?.hex, 7);
    if (!SLUG.test(id)) return { error: `${label}: некоректний ідентифікатор кольору «${id}».` };
    if (name.length < 1) return { error: `${label}: у кожного кольору має бути назва.` };
    if (!HEX.test(hex)) return { error: `${label}: некоректний HEX-код кольору для «${name}».` };
    if (seen.has(id)) return { error: `${label}: колір з ідентифікатором «${id}» повторюється.` };
    seen.add(id);
    filaments.push({ id, name, hex });
  }
  return { filaments };
}

/* Checks a catalog edit from /admin.html. Returns { catalog } or { error }. */
export function validateCatalog(body){
  if (!body || typeof body !== 'object') return { error: 'Некоректні дані.' };
  const productName = clean(body.productName, 60);
  const price = Number(body.price);
  if (productName.length < 2) return { error: 'Вкажіть назву товару.' };
  if (!Number.isFinite(price) || price < 1 || price > 1_000_000) return { error: 'Вкажіть коректну ціну.' };
  const duneColors = checkFilaments(body.filaments, false, 'Waveform Dune');
  if (duneColors.error) return duneColors;

  const categories = [];
  const rawCategories = Array.isArray(body.categories) ? body.categories : [];
  if (rawCategories.length > MAX_CATEGORIES) return { error: `Забагато категорій (максимум ${MAX_CATEGORIES}).` };
  const catIds = new Set();
  for (const raw of rawCategories){
    const id = clean(raw?.id, 40).toLowerCase();
    const name = clean(raw?.name, 60);
    if (!SLUG.test(id)) return { error: `Некоректний ідентифікатор категорії: «${id}».` };
    if (name.length < 1) return { error: 'У кожної категорії має бути назва.' };
    if (catIds.has(id)) return { error: `Категорія з ідентифікатором «${id}» повторюється.` };
    catIds.add(id);
    categories.push({ id, name });
  }

  const products = [];
  const rawProducts = Array.isArray(body.products) ? body.products : [];
  if (rawProducts.length > MAX_PRODUCTS) return { error: `Забагато товарів (максимум ${MAX_PRODUCTS}).` };
  const prodIds = new Set(['dune']); // reserved — that's Waveform Dune above
  for (const raw of rawProducts){
    const id = clean(raw?.id, 40).toLowerCase();
    const name = clean(raw?.name, 80);
    const categoryId = clean(raw?.categoryId, 40).toLowerCase();
    const pPrice = Number(raw?.price);
    const description = clean(raw?.description, 600);
    if (!SLUG.test(id)) return { error: `Некоректний ідентифікатор товару: «${id}».` };
    if (prodIds.has(id)) return { error: `Товар з ідентифікатором «${id}» повторюється.` };
    prodIds.add(id);
    if (name.length < 2) return { error: `Вкажіть назву товару «${id}».` };
    if (!catIds.has(categoryId)) return { error: `Товар «${name}»: оберіть категорію.` };
    if (!Number.isFinite(pPrice) || pPrice < 1 || pPrice > 1_000_000) return { error: `Товар «${name}»: вкажіть коректну ціну.` };
    const photos = (Array.isArray(raw?.photos) ? raw.photos : []).map(p => clean(p, 60)).filter(Boolean);
    if (photos.length > MAX_PHOTOS) return { error: `Товар «${name}»: забагато фото (максимум ${MAX_PHOTOS}).` };
    const colors = checkFilaments(raw?.filaments, true, `Товар «${name}»`);
    if (colors.error) return colors;
    products.push({ id, name, categoryId, price: pPrice, description, photos, filaments: colors.filaments });
  }

  let duneCategoryId = clean(body.duneCategoryId, 40).toLowerCase();
  if (duneCategoryId && !catIds.has(duneCategoryId)) duneCategoryId = '';

  const teaRaw = body.teaOrganizer || {};
  const teaName = clean(teaRaw.name, 80);
  const teaPrice = Number(teaRaw.price);
  if (teaName.length < 2) return { error: 'Чай-органайзер: вкажіть назву товару.' };
  if (!Number.isFinite(teaPrice) || teaPrice < 1 || teaPrice > 1_000_000) return { error: 'Чай-органайзер: вкажіть коректну ціну.' };
  const teaColors = checkFilaments(teaRaw.filaments, false, 'Чай-органайзер');
  if (teaColors.error) return teaColors;
  const teaOrganizer = { name: teaName, price: teaPrice, filaments: teaColors.filaments };

  return { catalog: { productName, price, filaments: duneColors.filaments, categories, products, duneCategoryId, teaOrganizer } };
}

export async function saveCatalog(catalog){
  const store = await catalogStore();
  await store.setJSON('config', catalog);
}

/* Test mode: while the TEST_PRICE_UAH env var is set in Netlify (e.g. 1),
   a card payment charges that amount for the whole order instead of the
   real total, so the flow can be checked with a real card for 1 ₴. Remove
   the variable and redeploy to go back to real prices. */
export function testPriceUAH(){
  const test = Number(process.env.TEST_PRICE_UAH);
  return Number.isFinite(test) && test > 0 ? test : null;
}
export const isTestPrice = () => testPriceUAH() !== null;

export const PAYMENT = {
  card: 'Оплата карткою на сайті (monobank)',
  cod: 'Накладений платіж (оплата при отриманні на Новій пошті)',
};

export function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/* Checks the order form against the given catalog (see getCatalog()).
   Returns { order } or { error } (in Ukrainian, shown to the customer as
   is). Each item gets the product/colour names and the unit price copied
   onto it at this moment, so later admin edits to the catalog never
   change what an already-placed order says or costs. */
export function validateOrder(body, catalog){
  if (!body || typeof body !== 'object') return { error: 'Некоректний запит.' };
  // honeypot: a hidden field real people never fill
  if (body.website) return { error: 'Некоректний запит.' };

  const filamentMap = new Map(catalog.filaments.map(f => [f.id, f]));
  const productMap = new Map((catalog.products || []).map(p => [p.id, p]));

  // cart lines; an older single-lamp request (shade/base, no items) still works
  const rawItems = Array.isArray(body.items) ? body.items
    : [{ product: 'dune', shade: body.shade, base: body.base, qty: 1 }];
  if (!rawItems.length) return { error: 'Кошик порожній.' };
  if (rawItems.length > MAX_LINES) return { error: 'Забагато позицій в одному замовленні.' };
  const items = [];
  for (const raw of rawItems){
    const product = clean(raw?.product || 'dune', 40);
    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: `Кількість однієї позиції — від 1 до ${MAX_QTY}.` };

    let key, item;
    if (product === 'dune'){
      const shade = clean(raw?.shade, 40), base = clean(raw?.base, 40);
      const shadeF = filamentMap.get(shade), baseF = filamentMap.get(base);
      if (!shadeF || !baseF) return { error: 'Оберіть кольори лампи.' };
      key = `dune:${shade}:${base}`;
      item = {
        product, shade, base, qty,
        productName: catalog.productName,
        shadeName: shadeF.name,
        baseName: baseF.name,
        unitPrice: catalog.price,
      };
    } else if (product === 'tea-organizer'){
      const t = catalog.teaOrganizer;
      if (!t) return { error: 'Товар недоступний.' };
      const tFilamentMap = new Map((t.filaments || []).map(f => [f.id, f]));
      const base = clean(raw?.base, 40), insert = clean(raw?.insert, 40);
      const baseF = tFilamentMap.get(base), insertF = tFilamentMap.get(insert);
      if (!baseF || !insertF) return { error: `Оберіть кольори для «${t.name}».` };
      key = `tea-organizer:${base}:${insert}`;
      item = {
        product, base, insert, qty,
        productName: t.name,
        baseName: baseF.name,
        insertName: insertF.name,
        unitPrice: t.price,
      };
    } else {
      const p = productMap.get(product);
      if (!p) return { error: 'Невідомий товар у кошику.' };
      let color = '', colorF = null;
      if (p.filaments.length){
        color = clean(raw?.color, 40);
        colorF = p.filaments.find(f => f.id === color);
        if (!colorF) return { error: `Оберіть колір для «${p.name}».` };
      }
      key = `${product}:${color}`;
      item = {
        product, color, qty,
        productName: p.name,
        colorName: colorF ? colorF.name : '',
        unitPrice: p.price,
      };
    }
    // the same product+colour(s) twice → one line with the quantities added up
    const sameKey = x => x.product === 'dune' ? `dune:${x.shade}:${x.base}`
      : x.product === 'tea-organizer' ? `tea-organizer:${x.base}:${x.insert}`
      : `${x.product}:${x.color}`;
    const same = items.find(x => sameKey(x) === key);
    if (same) same.qty = Math.min(MAX_QTY, same.qty + qty);
    else items.push(item);
  }

  const order = {
    items,
    total: items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0),
    name: clean(body.name, 80),
    phone: clean(body.phone, 30),
    city: clean(body.city, 80),
    branch: clean(body.branch, 120),
    payment: clean(body.payment, 10),
    email: clean(body.email, 120).toLowerCase(),
  };
  if (order.name.length < 3) return { error: 'Вкажіть прізвище та імʼя отримувача.' };
  const digits = order.phone.replace(/\D/g, '');
  if (!/^(380\d{9}|0\d{9})$/.test(digits)) return { error: 'Вкажіть телефон у форматі +380XXXXXXXXX.' };
  order.phone = '+380' + digits.slice(-9);
  if (order.city.length < 2) return { error: 'Вкажіть місто.' };
  if (order.branch.length < 1) return { error: 'Вкажіть відділення або поштомат Нової пошти.' };
  if (!PAYMENT[order.payment]) return { error: 'Оберіть спосіб оплати.' };
  // optional: where monobank sends the electronic receipt for card payments
  if (order.payment !== 'card') order.email = '';
  if (order.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(order.email)) return { error: 'Перевірте email для чека або залиште поле порожнім.' };
  if (body.agree !== true) return { error: 'Підтвердьте згоду з умовами оферти, щоб оформити замовлення.' };
  return { order };
}

// short, readable order number: DN-240924-4F7K
export function newOrderId(){
  const d = new Date();
  const ymd = [d.getUTCFullYear() % 100, d.getUTCMonth() + 1, d.getUTCDate()]
    .map(n => String(n).padStart(2, '0')).join('');
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[b % 32]).join('');
  return `DN-${ymd}-${rnd}`;
}

export const itemTitle = it => it.product === 'dune'
  ? `${it.productName} (абажур ${it.shadeName}, база ${it.baseName})`
  : it.product === 'tea-organizer'
  ? `${it.productName} (корпус ${it.baseName}, вставки ${it.insertName})`
  : it.colorName ? `${it.productName} (колір ${it.colorName})` : it.productName;

const itemColorLine = it => it.product === 'dune'
  ? `   Абажур: ${it.shadeName}, база та обруч W: ${it.baseName}`
  : it.product === 'tea-organizer'
  ? `   Корпус: ${it.baseName}, вставки: ${it.insertName}`
  : it.colorName ? `   Колір: ${it.colorName}` : null;

export function orderText(id, o, status){
  return [
    `${status} · замовлення ${id}`,
    '',
    ...o.items.map((it, i) =>
      `${i + 1}. ${it.productName} × ${it.qty} — ${it.unitPrice * it.qty} ₴` +
      (itemColorLine(it) ? `\n${itemColorLine(it)}` : '')),
    `Разом: ${o.total} ₴`,
    '',
    `Отримувач: ${o.name}`,
    `Телефон: ${o.phone}`,
    `Нова пошта: ${o.city}, ${o.branch}`,
    ...(o.email ? [`Email для чека: ${o.email}`] : []),
    '',
    `Оплата: ${PAYMENT[o.payment]}`,
  ].join('\n');
}

/* Sends a plain-text message to the shop's Telegram chat. Never throws:
   an order must not fail because the notification did. */
export async function notify(text){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat){
    console.warn('Telegram is not configured; message was:\n' + text);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('Telegram error', res.status, await res.text());
    return res.ok;
  } catch (e){
    console.error('Telegram request failed', e);
    return false;
  }
}

export const MONO_API = 'https://api.monobank.ua';

/* Card orders are kept in Netlify Blobs until monobank reports the
   payment, so the Telegram message with the full order goes out only
   once it is actually paid (no spam from abandoned checkouts). */
export async function ordersStore(){
  if (globalThis.__ordersStore) return globalThis.__ordersStore; // local tests
  const { getStore } = await import('@netlify/blobs');
  // strong: monobank's webhook arrives seconds after the order is saved,
  // and the default (eventual) consistency may not show it yet
  return getStore({ name: 'orders', consistency: 'strong' });
}

/* Maps a forwarded message in the staff group back to the customer it came
   from, so a Reply in the group can be copied back to them (see
   telegram-webhook.mjs). Separate store from orders — different lifetime,
   different keys. */
export async function relayStore(){
  if (globalThis.__relayStore) return globalThis.__relayStore; // local tests
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'telegram-relay', consistency: 'strong' });
}

// Product photos uploaded from /admin.html — see admin-photo.mjs / product-photo.mjs.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export async function photosStore(){
  if (globalThis.__photosStore) return globalThis.__photosStore; // local tests
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'product-photos', consistency: 'strong' });
}

/* Card orders waiting for payment also get a "pending/<id>" marker, so
   the scheduled check (check-pending) only has to look at those. */
export const pendingKey = id => `pending/${id}`;
const FINAL = ['success', 'failure', 'expired', 'reversed'];

/* Asks monobank for an invoice's current status (with our own token, so the
   answer can be trusted). Returns the invoice object or null. */
export async function fetchInvoice(invoiceId){
  const res = await fetch(`${MONO_API}/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`, {
    headers: { 'X-Token': process.env.MONO_TOKEN },
  });
  if (!res.ok){
    console.error('monobank status error', res.status, await res.text());
    return null;
  }
  return res.json();
}

/* Marks a card order paid and sends it to Telegram — exactly once, whichever
   comes first: the scheduled check, monobank's webhook or the customer
   landing back on the site. */
export async function confirmPaid(store, order, amountKop, via){
  if (order.notified) return false;
  const paid = amountKop / 100;
  const sent = await notify(orderText(order.id, order, `${order.test ? '🧪 ТЕСТОВА оплата' : '🟢 Оплачено'} ${paid} ₴`));
  order.status = 'success';
  order.notified = sent;
  order.paidAt = new Date().toISOString();
  order.confirmedVia = via;
  await store.setJSON(order.id, order);
  // keep it pending if Telegram failed, so the next check retries the message
  if (sent) await store.delete(pendingKey(order.id));
  console.log(`order ${order.id} paid ${paid} UAH (via ${via}), telegram ${sent ? 'sent' : 'FAILED'}`);
  return sent;
}

/* Applies monobank's invoice status to an order. */
export async function settle(store, order, inv, via){
  if (inv.status === 'success') return confirmPaid(store, order, inv.finalAmount ?? inv.amount, via);
  if (inv.status !== order.status){
    order.status = inv.status;
    order.updatedAt = new Date().toISOString();
    await store.setJSON(order.id, order);
  }
  if (FINAL.includes(inv.status)) await store.delete(pendingKey(order.id));
  return false;
}

/* monobank signs every webhook with ECDSA; the public key comes from
   their API and is cached for the life of the function instance. */
let monoKey = null;
export async function monoPublicKey(force = false){
  if (monoKey && !force) return monoKey;
  const res = await fetch(`${MONO_API}/api/merchant/pubkey`, {
    headers: { 'X-Token': process.env.MONO_TOKEN },
  });
  if (!res.ok) throw new Error(`pubkey ${res.status}`);
  const { key } = await res.json();
  monoKey = Buffer.from(key, 'base64').toString('utf8');
  return monoKey;
}
