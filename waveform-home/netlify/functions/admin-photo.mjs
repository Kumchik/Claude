/* POST /api/admin-photo — uploads one product photo from /admin.html.
   Protected by ADMIN_PASSWORD (x-admin-password header), like
   admin-catalog.mjs. Body: { contentType, dataBase64 } — dataBase64 is
   the raw base64 (no "data:...;base64," prefix, admin.js strips it).
   Stores the bytes in Netlify Blobs (photosStore, see shop.mjs) and
   returns { ok, id }; the photo is then served back by
   product-photo.mjs at /api/product-photo?id=<id>. */
import { json, photosStore, MAX_PHOTO_BYTES, PHOTO_TYPES } from '../lib/shop.mjs';

export const config = { path: '/api/admin-photo' };

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const password = process.env.ADMIN_PASSWORD;
  if (!password){
    console.error('admin-photo: ADMIN_PASSWORD is not set');
    return json({ error: 'Адмінка не налаштована: немає ADMIN_PASSWORD у Netlify.' }, 501);
  }
  if (req.headers.get('x-admin-password') !== password){
    return json({ error: 'Невірний пароль.' }, 401);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Некоректні дані.' }, 400); }
  const contentType = String(body?.contentType || '');
  if (!PHOTO_TYPES.includes(contentType)){
    return json({ error: 'Дозволені формати: JPEG, PNG, WebP, GIF.' }, 400);
  }
  let bytes;
  try { bytes = Buffer.from(String(body?.dataBase64 || ''), 'base64'); }
  catch { return json({ error: 'Некоректний файл.' }, 400); }
  if (!bytes.length) return json({ error: 'Порожній файл.' }, 400);
  if (bytes.length > MAX_PHOTO_BYTES){
    return json({ error: `Файл завеликий (максимум ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} МБ). Стисніть фото й спробуйте ще раз.` }, 400);
  }

  const id = crypto.randomUUID();
  const store = await photosStore();
  await store.set(id, bytes, { metadata: { contentType } });
  console.log(`admin-photo: saved ${id} (${contentType}, ${Math.round(bytes.length / 1024)} KB)`);
  return json({ ok: true, id });
};
