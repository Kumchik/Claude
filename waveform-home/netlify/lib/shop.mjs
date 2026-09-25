/* =========================================================
   Спільне для серверних функцій магазину (Netlify Functions).

   Налаштування — змінні середовища в Netlify
   (Site configuration → Environment variables):
     MONO_TOKEN          токен еквайрингу monobank (X-Token)
     TELEGRAM_BOT_TOKEN  токен бота від @BotFather
     TELEGRAM_CHAT_ID    ваш chat id, куди бот пише про замовлення
   ========================================================= */

// Товари й ціни — тут, на сервері, а не зі сторінки: клієнт не може їх
// змінити. Мають збігатися з PRICE_UAH / PRODUCT_NAME в app.js.
export const PRODUCTS = {
  dune: { name: 'Waveform Dune', price: 2100 },
};
export const PRICE_UAH = PRODUCTS.dune.price;
export const PRODUCT_NAME = PRODUCTS.dune.name;

// limits for one order
const MAX_LINES = 20, MAX_QTY = 10;

/* Test mode: while the TEST_PRICE_UAH env var is set in Netlify (e.g. 1),
   a card payment charges that amount for the whole order instead of the
   real total, so the flow can be checked with a real card for 1 ₴. Remove
   the variable and redeploy to go back to real prices. */
export function testPriceUAH(){
  const test = Number(process.env.TEST_PRICE_UAH);
  return Number.isFinite(test) && test > 0 ? test : null;
}
export const isTestPrice = () => testPriceUAH() !== null;

// Кольори філаменту: id → назва. Має збігатися з FILAMENTS в app.js.
export const FILAMENTS = {
  'white': 'White',
  'bone-white': 'Bone White',
  'beige': 'Beige',
  'oak': 'Oak',
  'chocolate': 'Chocolate',
  'black': 'Black',
  'sakura-pink': 'Sakura Pink',
  'magenta': 'Magenta',
  'red': 'Red',
  'sunny-orange': 'Sunny Orange',
  'yellow': 'Yellow',
  'olive-green': 'Olive Green',
  'grass-green': 'Grass Green',
  'mint-green': 'Mint Green',
  'sky-blue': 'Sky Blue',
};

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

/* Checks the order form. Returns { order } or { error } (in Ukrainian,
   shown to the customer as is). */
export function validateOrder(body){
  if (!body || typeof body !== 'object') return { error: 'Некоректний запит.' };
  // honeypot: a hidden field real people never fill
  if (body.website) return { error: 'Некоректний запит.' };

  // cart lines; an older single-lamp request (shade/base, no items) still works
  const rawItems = Array.isArray(body.items) ? body.items
    : [{ product: 'dune', shade: body.shade, base: body.base, qty: 1 }];
  if (!rawItems.length) return { error: 'Кошик порожній.' };
  if (rawItems.length > MAX_LINES) return { error: 'Забагато позицій в одному замовленні.' };
  const items = [];
  for (const raw of rawItems){
    const it = {
      product: clean(raw?.product || 'dune', 20),
      shade: clean(raw?.shade, 40),
      base: clean(raw?.base, 40),
      qty: Number(raw?.qty),
    };
    if (!PRODUCTS[it.product]) return { error: 'Невідомий товар у кошику.' };
    if (!FILAMENTS[it.shade] || !FILAMENTS[it.base]) return { error: 'Оберіть кольори лампи.' };
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_QTY) return { error: `Кількість однієї позиції — від 1 до ${MAX_QTY}.` };
    // the same lamp twice → one line with the quantities added up
    const same = items.find(x => x.product === it.product && x.shade === it.shade && x.base === it.base);
    if (same) same.qty = Math.min(MAX_QTY, same.qty + it.qty);
    else items.push(it);
  }

  const order = {
    items,
    total: items.reduce((sum, it) => sum + PRODUCTS[it.product].price * it.qty, 0),
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
  `${PRODUCTS[it.product].name} (абажур ${FILAMENTS[it.shade]}, база ${FILAMENTS[it.base]})`;

export function orderText(id, o, status){
  return [
    `${status} · замовлення ${id}`,
    '',
    ...o.items.map((it, i) =>
      `${i + 1}. ${PRODUCTS[it.product].name} × ${it.qty} — ${PRODUCTS[it.product].price * it.qty} ₴\n` +
      `   Абажур: ${FILAMENTS[it.shade]}, база та обруч W: ${FILAMENTS[it.base]}`),
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
