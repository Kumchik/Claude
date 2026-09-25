/* POST /api/create-order
   Card: creates a monobank invoice and returns its payment page URL.
   Cash on delivery: sends the order to Telegram straight away. */
import { testPriceUAH, isTestPrice, PRODUCTS, itemTitle, MONO_API, json, validateOrder, newOrderId, orderText, notify, ordersStore, pendingKey } from '../lib/shop.mjs';

export const config = { path: '/api/create-order' };

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Некоректний запит.' }, 400); }
  const { order, error } = validateOrder(body);
  if (error) return json({ error }, 400);

  const id = newOrderId();

  if (order.payment === 'cod'){
    await notify(orderText(id, order, '🟡 Нове замовлення (накладений платіж)'));
    return json({ ok: true, orderId: id, payment: 'cod' });
  }

  if (!process.env.MONO_TOKEN){
    console.error('MONO_TOKEN is not set');
    return json({ error: 'Оплата карткою тимчасово недоступна. Оберіть накладений платіж або напишіть нам у Telegram.' }, 503);
  }

  const site = process.env.URL || new URL(req.url).origin;
  // one basket line per cart line, so the Checkbox receipt lists every lamp
  const test = testPriceUAH();
  let basketOrder = order.items.map((it, i) => {
    const unit = PRODUCTS[it.product].price * 100;
    return { name: itemTitle(it), qty: it.qty, sum: unit, total: unit * it.qty, unit: 'шт.', code: `${it.product}-${i + 1}` };
  });
  let kop = order.total * 100;
  if (test){
    kop = Math.round(test * 100);
    basketOrder = [{ name: 'Тестова оплата', qty: 1, sum: kop, total: kop, unit: 'шт.', code: 'test' }];
    console.warn(`TEST_PRICE_UAH is set: charging ${test} ₴ instead of ${order.total} ₴`);
  }
  const res = await fetch(`${MONO_API}/api/merchant/invoice/create`, {
    method: 'POST',
    headers: { 'X-Token': process.env.MONO_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({
      amount: kop,
      ccy: 980,
      merchantPaymInfo: {
        reference: id,
        // monobank emails the electronic (fiscal) receipt here after payment
        ...(order.email ? { customerEmails: [order.email] } : {}),
        destination: `Waveform, замовлення ${id}${test ? ' (тестова оплата)' : ''}`,
        basketOrder,
      },
      redirectUrl: `${site}/?order=${id}#order-result`,
      webHookUrl: `${site}/api/mono-webhook`,
      validity: 3600,
    }),
  });
  if (!res.ok){
    console.error('monobank invoice error', res.status, await res.text());
    return json({ error: 'Не вдалося створити оплату. Спробуйте ще раз або оберіть накладений платіж.' }, 502);
  }
  const { invoiceId, pageUrl } = await res.json();

  const store = await ordersStore();
  const createdAt = new Date().toISOString();
  await store.setJSON(id, { ...order, id, invoiceId, test: isTestPrice(), status: 'created', createdAt });
  await store.setJSON(pendingKey(id), { id, createdAt });
  console.log(`card order ${id} created, invoice ${invoiceId}, webhook ${site}/api/mono-webhook`);

  return json({ ok: true, orderId: id, payment: 'card', pageUrl });
};
