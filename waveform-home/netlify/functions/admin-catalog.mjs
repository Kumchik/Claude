/* POST /api/admin-catalog — saves product name, price and the colour
   palette from /admin.html. Protected by the ADMIN_PASSWORD env var
   (Netlify: Site configuration → Environment variables), sent by the
   admin page as the x-admin-password header. See README.md ("Адмінка")
   for setup and netlify/lib/shop.mjs for validateCatalog/saveCatalog. */
import { json, validateCatalog, saveCatalog } from '../lib/shop.mjs';

export const config = { path: '/api/admin-catalog' };

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const password = process.env.ADMIN_PASSWORD;
  if (!password){
    console.error('admin-catalog: ADMIN_PASSWORD is not set');
    return json({ error: 'Адмінка не налаштована: немає ADMIN_PASSWORD у Netlify.' }, 501);
  }
  if (req.headers.get('x-admin-password') !== password){
    return json({ error: 'Невірний пароль.' }, 401);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Некоректні дані.' }, 400); }
  const { catalog, error } = validateCatalog(body);
  if (error) return json({ error }, 400);

  await saveCatalog(catalog);
  console.log(`admin-catalog: saved (price ${catalog.price} ₴, ${catalog.filaments.length} colours)`);
  return json({ ok: true, catalog });
};
