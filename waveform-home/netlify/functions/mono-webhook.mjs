/* POST /api/mono-webhook — monobank calls this when an invoice changes
   status. The request is checked against monobank's signature; on a
   successful payment the full order goes to Telegram (once). */
import crypto from 'node:crypto';
import { json, ordersStore, monoPublicKey, confirmPaid } from '../lib/shop.mjs';

export const config = { path: '/api/mono-webhook' };

async function verified(raw, sign){
  if (!sign) return false;
  const check = key => crypto.createVerify('SHA256').update(raw).verify(key, sign, 'base64');
  try {
    if (check(await monoPublicKey())) return true;
    return check(await monoPublicKey(true)); // key may have been rotated
  } catch (e){
    console.error('signature check failed', e);
    return false;
  }
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const raw = await req.text();
  if (!(await verified(raw, req.headers.get('x-sign')))){
    console.warn('webhook rejected: bad or missing X-Sign');
    return json({ error: 'bad signature' }, 401);
  }

  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }

  console.log('webhook', event.reference, event.invoiceId, event.status);

  const store = await ordersStore();
  const order = event.reference && await store.get(event.reference, { type: 'json' });
  if (!order || order.invoiceId !== event.invoiceId){
    console.warn('webhook for unknown order', event.reference, event.invoiceId);
    return json({ ok: true });
  }

  // monobank may deliver events more than once and out of order
  if (order.notified) return json({ ok: true });
  if (event.status === 'success'){
    await confirmPaid(store, order, event.finalAmount ?? event.amount, 'webhook');
  } else {
    order.status = event.status;
    order.updatedAt = new Date().toISOString();
    await store.setJSON(order.id, order);
  }
  return json({ ok: true });
};
