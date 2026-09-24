/* POST /api/mono-webhook — monobank calls this when an invoice changes
   status, whether or not the customer ever comes back to the site.

   The payment is never taken from the webhook body on trust: the function
   looks the order up and asks monobank's API (with our own token) for the
   invoice status, then sends the order to Telegram once it is paid. So a
   forged request can't fake a payment, and a signature quirk can't block a
   real one. monobank's X-Sign is still checked and the result logged.

   GET /api/mono-webhook just answers "ok" — open it in a browser to check
   the function is reachable. */
import crypto from 'node:crypto';
import { json, ordersStore, monoPublicKey, fetchInvoice, settle } from '../lib/shop.mjs';

export const config = { path: '/api/mono-webhook' };

async function signatureValid(raw, sign){
  if (!sign) return false;
  const check = key => crypto.createVerify('SHA256').update(raw).verify(key, sign, 'base64');
  try {
    if (check(await monoPublicKey())) return true;
    return check(await monoPublicKey(true)); // key may have been rotated
  } catch (e){
    console.error('signature check error', e);
    return false;
  }
}

export default async (req) => {
  if (req.method === 'GET') return json({ ok: true, endpoint: 'mono-webhook' });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const raw = await req.text();
  let event;
  try { event = JSON.parse(raw); } catch {
    console.warn('webhook: body is not JSON');
    return json({ error: 'bad json' }, 400);
  }
  const signed = await signatureValid(raw, req.headers.get('x-sign'));
  console.log('webhook received', event.reference, event.invoiceId, event.status, 'signature', signed ? 'ok' : 'NOT VALID');

  const store = await ordersStore();
  const order = event.reference && await store.get(event.reference, { type: 'json' });
  if (!order || order.invoiceId !== event.invoiceId){
    console.warn('webhook for unknown order', event.reference, event.invoiceId);
    return json({ ok: true });
  }
  if (order.notified) return json({ ok: true }); // already sent (events repeat)

  const inv = await fetchInvoice(order.invoiceId);
  if (!inv) return json({ error: 'status check failed' }, 502); // non-2xx → monobank retries
  console.log('invoice status from monobank', order.id, inv.status);
  await settle(store, order, inv, 'webhook');
  return json({ ok: true });
};
