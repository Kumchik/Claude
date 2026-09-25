/* POST /api/telegram-webhook — receives every update for the shop's
   Telegram bot. Two jobs:

   1. A customer messages the bot privately (e.g. via the "Написати в
      Telegram" button on the site) → the message is forwarded into the
      shop's staff group (TELEGRAM_CHAT_ID), so the sender's name is
      visible ("Forwarded from …") and everyone in the group sees it.
   2. Someone in that group replies (Telegram "Reply", not just a new
      message) to a forwarded message → the reply is copied back to the
      original customer, so it reads to them like a normal chat with the
      shop's bot, not with a stranger's personal account.

   Requires the bot's webhook to be registered once — see README.md — with
   a secret token this function checks via TELEGRAM_WEBHOOK_SECRET, so only
   Telegram can call it.

   GET /api/telegram-webhook just answers "ok" — open it in a browser to
   check the function is reachable. */
import { json, relayStore } from '../lib/shop.mjs';

export const config = { path: '/api/telegram-webhook' };

const tg = (token, method, body) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

export default async (req) => {
  if (req.method === 'GET') return json({ ok: true, endpoint: 'telegram-webhook' });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // only Telegram (which echoes this header back) should reach this far
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret){
    console.warn('telegram-webhook: bad or missing secret token');
    return json({ error: 'forbidden' }, 401);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const group = process.env.TELEGRAM_CHAT_ID;
  if (!token || !group){
    console.error('telegram-webhook: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing');
    return json({ ok: true }); // 200 so Telegram doesn't retry forever
  }

  let update;
  try { update = await req.json(); } catch { return json({ ok: true }); }
  const msg = update.message;
  if (!msg) return json({ ok: true }); // edits, reactions, etc. — nothing to do

  const store = await relayStore();
  const inGroup = String(msg.chat.id) === String(group);

  // customer -> bot: a private message from anyone who isn't the group
  if (!inGroup && msg.chat.type === 'private'){
    const fwd = await tg(token, 'forwardMessage', {
      chat_id: group,
      from_chat_id: msg.chat.id,
      message_id: msg.message_id,
    });
    if (fwd.ok){
      // remember which customer this forwarded copy belongs to, so a
      // Reply to it in the group knows where to send the answer
      await store.setJSON(String(fwd.result.message_id), {
        customerId: msg.chat.id,
        name: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' '),
        username: msg.from?.username || null,
      });
      await tg(token, 'sendMessage', {
        chat_id: group,
        reply_to_message_id: fwd.result.message_id,
        text: '↑ Щоб відповісти клієнту, зробіть Reply на це повідомлення.',
      });
    } else {
      console.error('forwardMessage failed', fwd);
    }

    // a one-time greeting for a first-time customer
    const seenKey = `seen/${msg.chat.id}`;
    if (!(await store.get(seenKey))){
      await store.setJSON(seenKey, { at: new Date().toISOString() });
      await tg(token, 'sendMessage', {
        chat_id: msg.chat.id,
        text: 'Дякуємо за повідомлення! Ми відповімо тут, у цьому чаті, найближчим часом.',
      });
    }
    return json({ ok: true });
  }

  // staff -> customer: a Reply inside the group to a forwarded message
  if (inGroup && msg.reply_to_message){
    const info = await store.get(String(msg.reply_to_message.message_id), { type: 'json' });
    if (info){
      // copyMessage (not forwardMessage) so it looks like a direct message
      // from the bot, not a forward, and keeps whatever staff sent —
      // text, photo, voice note, sticker
      const res = await tg(token, 'copyMessage', {
        chat_id: info.customerId,
        from_chat_id: group,
        message_id: msg.message_id,
      });
      if (!res.ok) console.error('copyMessage failed', res);
    }
    return json({ ok: true });
  }

  return json({ ok: true });
};
