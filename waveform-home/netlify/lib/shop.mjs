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
    if (saved && Array.isArray(saved.filaments) && saved.filaments.length) return saved;
  } catch (e){
    console.error('getCatalog failed, using defaults', e);
  }
  return structuredClone(DEFAULT_CATALOG);
}

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9-]{1,40}$/;

/* Checks a catalog edit from /admin.html. Returns { catalog } or { error }. */
export function validateCatalog(body){
  if (!body || typeof body !== 'object') return { error: 'Некоректні дані.' };
  const productName = clean(body.productName, 60);
  const price = Number(body.price);
  if (productName.length < 2) return { error: 'Вкажіть назву товару.' };
  if (!Number.isFinite(price) || price < 1 || price > 1_000_000) return { error: 'Вкажіть коректну ціну.' };
  if (!Array.isArray(body.filaments) || !body.filaments.length) return { error: 'Додайте хоча б один колір.' };
  if (body.filaments.length > MAX_FILAMENTS) return { error: `Забагато кольорів (максимум ${MAX_FILAMENTS}).` };
  const filaments = [];
  const seen = new Set();
  for (const raw of body.filaments){
    const id = clean(raw?.id, 40).toLowerCase();
    const name = clean(raw?.name, 40);
    const hex = clean(raw?.hex, 7);
    if (!SLUG.test(id)) return { error: `Некоректний ідентифікатор кольору: «${id}».` };
    if (name.length < 1) return { error: 'У кожного кольору має бути назва.' };
    if (!HEX.test(hex)) return { error: `Некоректний HEX-код кольору для «${name}».` };
    if (seen.has(id)) return { error: `Колір з ідентифікатором «${id}» повторюється.` };
    seen.add(id);
    filaments.push({ id, name, hex });
  }
  return { catalog: { productName, price, filaments } };
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

  // cart lines; an older single-lamp request (shade/base, no items) still works
  const rawItems = Array.isArray(body.items) ? body.items
    : [{ product: 'dune', shade: body.shade, base: body.base, qty: 1 }];
  if (!rawItems.length) return { error: 'Кошик порожній.' };
  if (rawItems.length > MAX_LINES) return { error: 'Забагато позицій в одному замовленні.' };
  const items = [];
  for (const raw of rawItems){
    const product = clean(raw?.product || 'dune', 20);
    const shade = clean(raw?.shade, 40);
    const base = clean(raw?.base, 40);
    const qty = Number(raw?.qty);
    if (product !== 'dune') return { error: 'Невідомий товар у кошику.' };
    const shadeF = filamentMap.get(shade), baseF = filamentMap.get(base);
    if (!shadeF || !baseF) return { error: 'Оберіть кольори лампи.' };
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: `Кількість однієї позиції — від 1 до ${MAX_QTY}.` };
    // the same lamp twice → one line with the quantities added up
    const same = items.find(x => x.product === product && x.shade === shade && x.base === base);
    if (same) same.qty = Math.min(MAX_QTY, same.qty + qty);
    else items.push({
      product, shade, base, qty,
      productName: catalog.productName,
      shadeName: shadeF.name,
      baseName: baseF.name,
      unitPrice: catalog.price,
    });
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

export const itemTitle = it =>
  `${it.productName} (абажур ${it.shadeName}, база ${it.baseName})`;

export function orderText(id, o, status){
  return [
    `${status} · замовлення ${id}`,
    '',
    ...o.items.map((it, i) =>
      `${i + 1}. ${it.productName} × ${it.qty} — ${it.unitPrice * it.qty} ₴\n` +
      `   Абажур: ${it.shadeName}, база та обруч W: ${it.baseName}`),
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
