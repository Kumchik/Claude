/* Scheduled every minute by Netlify. Goes through card orders that are
   still waiting for payment and asks monobank about each one, so a paid
   order reaches Telegram within a minute even if monobank's webhook never
   arrives and the customer never comes back to the site. */
import { json, ordersStore, pendingKey, fetchInvoice, settle } from '../lib/shop.mjs';

export const config = { schedule: '* * * * *' };

// monobank invoices live for an hour (validity in create-order); after a
// day there is nothing left to wait for
const GIVE_UP_MS = 24 * 60 * 60 * 1000;

export default async () => {
  if (!process.env.MONO_TOKEN) return json({ skipped: 'no MONO_TOKEN' });
  const store = await ordersStore();
  const { blobs } = await store.list({ prefix: 'pending/' });

  for (const { key } of blobs){
    const id = key.slice('pending/'.length);
    const order = await store.get(id, { type: 'json' });
    if (!order || order.notified || Date.now() - Date.parse(order.createdAt) > GIVE_UP_MS){
      await store.delete(pendingKey(id));
      continue;
    }
    const inv = await fetchInvoice(order.invoiceId);
    if (inv) await settle(store, order, inv, 'scheduled check');
  }
  return json({ checked: blobs.length });
};
