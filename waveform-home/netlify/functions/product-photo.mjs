/* GET /api/product-photo?id=<id> — serves one photo uploaded from
   /admin.html (see admin-photo.mjs). Public: photos aren't secret, they
   just aren't guessable (random id) or listable. */
import { photosStore } from '../lib/shop.mjs';

export const config = { path: '/api/product-photo' };

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^[a-f0-9-]{10,60}$/i.test(id)) return new Response('Not found', { status: 404 });

  const store = await photosStore();
  const entry = await store.getWithMetadata(id, { type: 'arrayBuffer' });
  if (!entry) return new Response('Not found', { status: 404 });

  return new Response(entry.data, {
    headers: {
      'content-type': entry.metadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
