/* =========================================================
   Спільне для серверних функцій магазину (Netlify Functions).

   Налаштування — змінні середовища в Netlify
   (Site configuration → Environment variables):
     MONO_TOKEN          токен еквайрингу monobank (X-Token)
     TELEGRAM_BOT_TOKEN  токен бота від @BotFather
     TELEGRAM_CHAT_ID    ваш chat id, куди бот пише про замовлення
   ========================================================= */

// Ціна — тут, на сервері, а не зі сторінки: клієнт не може її змінити.
// Має збігатися з PRICE_UAH в app.js.
export const PRICE_UAH = 2100;
export const PRODUCT_NAME = 'Waveform Dune';

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

  const order = {
    shade: clean(body.shade, 40),
    base: clean(body.base, 40),
    name: clean(body.name, 80),
    phone: clean(body.phone, 30),
    city: clean(body.city, 80),
    branch: clean(body.branch, 120),
    payment: clean(body.payment, 10),
  };
  if (!FILAMENTS[order.shade] || !FILAMENTS[order.base]) return { error: 'Оберіть кольори лампи.' };
  if (order.name.length < 3) return { error: 'Вкажіть прізвище та імʼя отримувача.' };
  const digits = order.phone.replace(/\D/g, '');
  if (!/^(380\d{9}|0\d{9})$/.test(digits)) return { error: 'Вкажіть телефон у форматі +380XXXXXXXXX.' };
  order.phone = '+380' + digits.slice(-9);
  if (order.city.length < 2) return { error: 'Вкажіть місто.' };
  if (order.branch.length < 1) return { error: 'Вкажіть відділення або поштомат Нової пошти.' };
  if (!PAYMENT[order.payment]) return { error: 'Оберіть спосіб оплати.' };
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

export function orderText(id, o, status){
  return [
    `${status} · замовлення ${id}`,
    '',
    `${PRODUCT_NAME} — ${PRICE_UAH} ₴`,
    `Абажур: ${FILAMENTS[o.shade]}`,
    `База та обруч W: ${FILAMENTS[o.base]}`,
    '',
    `Отримувач: ${o.name}`,
    `Телефон: ${o.phone}`,
    `Нова пошта: ${o.city}, ${o.branch}`,
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
  return getStore('orders');
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
