/* GET /api/np — suggestions for the checkout form from Nova Poshta's API.
     ?type=cities&q=Киї            → settlements matching the text
     ?type=warehouses&city=<ref>&q= → branches / parcel lockers in that city

   Runs on the server so the optional NP_API_KEY (Nova Poshta → Налаштування
   → Безпека → API-ключ) never reaches the page. Works without a key for as
   long as Nova Poshta allows anonymous lookups; add the key in Netlify if
   suggestions stop appearing. */
import { json } from '../lib/shop.mjs';

export const config = { path: '/api/np' };

const NP_API = 'https://api.novaposhta.ua/v2.0/json/';

async function np(modelName, calledMethod, methodProperties){
  const res = await fetch(NP_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey: process.env.NP_API_KEY || '', modelName, calledMethod, methodProperties }),
  });
  if (!res.ok) throw new Error(`Nova Poshta HTTP ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(`Nova Poshta: ${(body.errors || []).join('; ') || 'error'}`);
  return body.data || [];
}

// suggestions change rarely: let browsers and Netlify's CDN reuse them
const cached = data => new Response(JSON.stringify(data), {
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' },
});

export default async (req) => {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim().slice(0, 60);
  try {
    if (p.get('type') === 'cities'){
      if (q.length < 2) return cached([]);
      const data = await np('Address', 'searchSettlements', { CityName: q, Limit: '8', Page: '1' });
      const cities = (data[0]?.Addresses || [])
        .filter(a => a.DeliveryCity && Number(a.Warehouses) > 0)
        .map(a => ({ ref: a.DeliveryCity, name: a.MainDescription, area: a.Present }));
      return cached(cities);
    }
    if (p.get('type') === 'warehouses'){
      const city = (p.get('city') || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(city)) return json({ error: 'bad city' }, 400);
      const data = await np('AddressGeneral', 'getWarehouses', {
        CityRef: city, FindByString: q, Limit: '30', Page: '1', Language: 'UA',
      });
      const list = data.map(w => ({
        name: w.Description,
        kind: w.CategoryOfWarehouse === 'Postomat' ? 'Поштомат' : 'Відділення',
      }));
      return cached(list);
    }
    return json({ error: 'unknown type' }, 400);
  } catch (e){
    console.error('np lookup failed', e.message);
    return json({ error: 'lookup failed' }, 502);
  }
};
