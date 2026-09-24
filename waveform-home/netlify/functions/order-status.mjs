/* GET /api/order-status?order=DN-… — used by the page after monobank
   sends the customer back, to show whether the payment went through.
   Asks monobank directly, so it works even before the webhook arrives —
   and if the payment is confirmed but the webhook hasn't sent the order
   to Telegram yet, sends it from here (still only once). */
import { MONO_API, json, ordersStore, confirmPaid } from '../lib/shop.mjs';

export const config = { path: '/api/order-status' };

export default async (req) => {
  const id = new URL(req.url).searchParams.get('order') || '';
  if (!/^DN-\d{6}-[A-Z0-9]{4}$/.test(id)) return json({ error: 'not found' }, 404);
  const store = await ordersStore();
  const order = await store.get(id, { type: 'json' });
  if (!order) return json({ error: 'not found' }, 404);

  let status = order.status;
  if (!order.notified && process.env.MONO_TOKEN){
    const res = await fetch(`${MONO_API}/api/merchant/invoice/status?invoiceId=${encodeURIComponent(order.invoiceId)}`, {
      headers: { 'X-Token': process.env.MONO_TOKEN },
    });
    if (res.ok){
      const inv = await res.json();
      status = inv.status;
      if (status === 'success') await confirmPaid(store, order, inv.finalAmount ?? inv.amount, 'order-status');
    } else {
      console.error('monobank status error', res.status, await res.text());
    }
  }
  // only what the page needs — no customer details
  return json({ orderId: id, status });
};
