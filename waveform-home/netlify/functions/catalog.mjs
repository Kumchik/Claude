/* GET /api/catalog — the current product name, price and colour palette.
   Public (no secrets here): the site's own pages read this on load
   instead of having the price and colours hardcoded, so /admin.html can
   change them without a code deploy. See netlify/lib/shop.mjs for where
   this is stored (Netlify Blobs) and README.md ("Адмінка"). */
import { json, getCatalog } from '../lib/shop.mjs';

export const config = { path: '/api/catalog' };

export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const catalog = await getCatalog();
  return json(catalog);
};
