/* /admin.html — керування ціною й кольорами без правки коду.
   Пароль (ADMIN_PASSWORD у Netlify) зберігається лише в sessionStorage
   цієї вкладки — на сервер він іде тільки в момент "Зберегти", в
   заголовку x-admin-password (netlify/functions/admin-catalog.mjs).
   Кольори читаються з /api/catalog (публічний, без пароля) — той самий
   ендпоінт, що й на головній сторінці. */

const PW_KEY = 'wfAdminPw';
const $ = id => document.getElementById(id);

function showLogin(message){
  $('editView').hidden = true;
  $('loginView').hidden = false;
  $('loginError').hidden = !message;
  if (message) $('loginError').textContent = message;
}

function slugify(name){
  return String(name).toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'color';
}
function uniqueSlug(base, taken){
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  taken.add(id);
  return id;
}

function addColorRow(color = { id: '', name: '', hex: '#CCCCCC' }){
  const tpl = $('colorRowTpl').content.cloneNode(true);
  const row = tpl.querySelector('.admin-color-row');
  row.dataset.id = color.id;
  const picker = row.querySelector('.cr-hex-picker');
  const name = row.querySelector('.cr-name');
  const hex = row.querySelector('.cr-hex');
  picker.value = /^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : '#cccccc';
  name.value = color.name;
  hex.value = color.hex;
  picker.addEventListener('input', () => { hex.value = picker.value; });
  hex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) picker.value = hex.value; });
  row.querySelector('.cr-remove').addEventListener('click', () => row.remove());
  $('colorRows').appendChild(row);
}

function readColorRows(){
  const rows = [...$('colorRows').querySelectorAll('.admin-color-row')];
  const taken = new Set();
  return rows.map(row => {
    const name = row.querySelector('.cr-name').value.trim();
    const hex = row.querySelector('.cr-hex').value.trim();
    const id = row.dataset.id || uniqueSlug(slugify(name), taken);
    if (!row.dataset.id) taken.add(id); // new row: keep its freshly-made id reserved
    else taken.add(row.dataset.id);
    return { id, name, hex };
  });
}

async function loadCatalogIntoForm(){
  const res = await fetch('/api/catalog');
  if (!res.ok) throw new Error('catalog fetch failed');
  const cat = await res.json();
  $('fProductName').value = cat.productName;
  $('fPrice').value = cat.price;
  $('colorRows').innerHTML = '';
  cat.filaments.forEach(addColorRow);
}

async function saveCatalog(){
  const password = sessionStorage.getItem(PW_KEY);
  const body = {
    productName: $('fProductName').value.trim(),
    price: Number($('fPrice').value),
    filaments: readColorRows(),
  };
  const res = await fetch('/api/admin-catalog', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-password': password || '' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401){
    sessionStorage.removeItem(PW_KEY);
    showLogin('Невірний пароль. Спробуйте ще раз.');
    return;
  }
  if (!res.ok) throw new Error(data.error || 'Не вдалося зберегти.');
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  $('addColorBtn').addEventListener('click', () => addColorRow());

  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    sessionStorage.setItem(PW_KEY, $('adminPw').value);
    try {
      await loadCatalogIntoForm();
      $('loginView').hidden = true;
      $('editView').hidden = false;
    } catch {
      showLogin('Не вдалося завантажити дані. Спробуйте ще раз.');
    }
  });

  $('catalogForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = $('catalogError'), okEl = $('catalogOk'), btn = $('catalogSave');
    errEl.hidden = true; okEl.hidden = true;
    btn.disabled = true;
    try {
      await saveCatalog();
      okEl.hidden = false;
    } catch (err){
      if (err.message){
        errEl.textContent = err.message;
        errEl.hidden = false;
      }
    } finally {
      btn.disabled = false;
    }
  });

  // already unlocked this tab? skip straight to the form
  if (sessionStorage.getItem(PW_KEY)){
    loadCatalogIntoForm()
      .then(() => { $('loginView').hidden = true; $('editView').hidden = false; })
      .catch(() => showLogin());
  }
});
