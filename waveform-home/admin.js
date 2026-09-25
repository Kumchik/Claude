/* /admin.html — керування товарами, категоріями, цінами, кольорами й
   фото без правки коду. Пароль (ADMIN_PASSWORD у Netlify) зберігається
   лише в sessionStorage цієї вкладки — на сервер він іде тільки в
   момент "Зберегти" чи завантаження фото, в заголовку x-admin-password
   (netlify/functions/admin-catalog.mjs, admin-photo.mjs). Поточні дані
   читаються з /api/catalog (публічний, без пароля) — той самий
   ендпоінт, що й на головній сторінці. */

const PW_KEY = 'wfAdminPw';
const $ = id => document.getElementById(id);

function showLogin(message){
  $('editView').hidden = true;
  $('loginView').hidden = false;
  $('loginError').hidden = !message;
  if (message) $('loginError').textContent = message;
}

// ідентифікатори мають бути a-z0-9- (те саме перевіряє сервер, shop.mjs),
// а назви тут зазвичай українською — транслітеруємо, щоб id не губився
const TRANSLIT = { а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ie',ж:'zh',з:'z',и:'y',
  і:'i',ї:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ь:'',ю:'iu',я:'ia',ʼ:'',"'":'' };
function slugify(name){
  const translit = String(name).toLowerCase()
    .split('').map(ch => TRANSLIT[ch] ?? ch).join('');
  const slug = translit.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  // nothing usable came out of it (emoji-only name, etc.) — still need a valid id
  return slug || `item-${Math.random().toString(36).slice(2, 8)}`;
}
function uniqueSlug(base, taken){
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  taken.add(id);
  return id;
}

/* A request with the admin password attached; on a wrong/expired
   password, sends the tab back to the login screen. Throws with a
   user-facing message on any other failure. */
async function authedFetch(url, body){
  const password = sessionStorage.getItem(PW_KEY);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-password': password || '' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401){
    sessionStorage.removeItem(PW_KEY);
    showLogin('Невірний пароль. Спробуйте ще раз.');
    throw new Error('');
  }
  if (!res.ok) throw new Error(data.error || 'Не вдалося зберегти.');
  return data;
}

/* ---------- кольори (Dune і, повторно, кожен товар) ---------- */
function addColorRow(container, color = { id: '', name: '', hex: '#CCCCCC' }){
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
  container.appendChild(row);
}

function readColorRows(container){
  const rows = [...container.querySelectorAll('.admin-color-row')];
  const taken = new Set();
  return rows.map(row => {
    const name = row.querySelector('.cr-name').value.trim();
    const hex = row.querySelector('.cr-hex').value.trim();
    const id = row.dataset.id || uniqueSlug(slugify(name), taken);
    taken.add(row.dataset.id || id);
    return { id, name, hex };
  });
}

/* ---------- категорії ---------- */
function addCategoryRow(cat = { id: '', name: '' }){
  const tpl = $('categoryRowTpl').content.cloneNode(true);
  const row = tpl.querySelector('.admin-category-row');
  row.dataset.id = cat.id;
  row.querySelector('.cat-name').value = cat.name;
  row.querySelector('.cat-name').addEventListener('input', refreshCategoryOptions);
  row.querySelector('.cat-remove').addEventListener('click', () => { row.remove(); refreshCategoryOptions(); });
  $('categoryRows').appendChild(row);
  refreshCategoryOptions();
}

function readCategoryRows(){
  const rows = [...$('categoryRows').querySelectorAll('.admin-category-row')];
  const taken = new Set();
  return rows.map(row => {
    const name = row.querySelector('.cat-name').value.trim();
    const id = row.dataset.id || uniqueSlug(slugify(name), taken);
    taken.add(row.dataset.id || id);
    return { id, name };
  });
}

// keeps every product's category <select> (and Dune's own) in sync whenever a category is added/renamed/removed
function refreshCategoryOptions(){
  const categories = readCategoryRows();
  document.querySelectorAll('.pr-category').forEach(select => {
    const current = select.value;
    select.innerHTML = categories.length
      ? categories.map(c => `<option value="${c.id}"></option>`).join('')
      : '<option value="">— спершу додайте категорію —</option>';
    [...select.options].forEach((opt, i) => { if (categories[i]) opt.textContent = categories[i].name; });
    if (categories.some(c => c.id === current)) select.value = current;
  });
  const dune = $('fCategory');
  if (dune){
    const current = dune.value;
    dune.innerHTML = ['<option value="">— без категорії (як зараз) —</option>']
      .concat(categories.map(c => `<option value="${c.id}"></option>`)).join('');
    [...dune.options].slice(1).forEach((opt, i) => { opt.textContent = categories[i].name; });
    if (!current || categories.some(c => c.id === current)) dune.value = current;
  }
}

/* ---------- товари ---------- */
function renderPhotos(row, photos){
  const box = row.querySelector('.admin-photos');
  box.innerHTML = '';
  photos.forEach((id, i) => {
    const tpl = $('productPhotoTpl').content.cloneNode(true);
    const el = tpl.querySelector('.admin-photo');
    el.querySelector('img').src = `/api/product-photo?id=${encodeURIComponent(id)}`;
    el.querySelector('.ph-remove').addEventListener('click', () => {
      photos.splice(i, 1);
      renderPhotos(row, photos);
    });
    box.appendChild(el);
  });
}

function addProductRow(product = { id: '', name: '', categoryId: '', price: '', description: '', photos: [], filaments: [] }){
  const tpl = $('productRowTpl').content.cloneNode(true);
  const row = tpl.querySelector('.admin-product');
  row.dataset.id = product.id;
  row.querySelector('.pr-name').value = product.name;
  row.querySelector('.pr-price').value = product.price;
  row.querySelector('.pr-description').value = product.description;
  row.querySelector('.pr-remove').addEventListener('click', () => row.remove());

  const photos = [...product.photos];
  renderPhotos(row, photos);
  const fileInput = row.querySelector('.pr-photo-input');
  const status = row.querySelector('.pr-photo-status');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    status.hidden = false;
    status.textContent = 'Завантаження…';
    try {
      const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const data = await authedFetch('/api/admin-photo', { contentType: file.type, dataBase64 });
      photos.push(data.id);
      renderPhotos(row, photos);
      status.hidden = true;
    } catch (err){
      status.textContent = err.message || 'Не вдалося завантажити фото.';
    }
  });

  const colorsBox = row.querySelector('.pr-colors');
  product.filaments.forEach(c => addColorRow(colorsBox, c));
  row.querySelector('.pr-add-color').addEventListener('click', () => addColorRow(colorsBox));

  $('productRows').appendChild(row);
  refreshCategoryOptions();
  row.querySelector('.pr-category').value = product.categoryId;
  // remember the current photo ids on the row itself, read back in readProductRows()
  row._photos = photos;
}

function readProductRows(){
  const rows = [...$('productRows').querySelectorAll('.admin-product')];
  const taken = new Set();
  return rows.map(row => {
    const name = row.querySelector('.pr-name').value.trim();
    const id = row.dataset.id || uniqueSlug(slugify(name), taken);
    taken.add(row.dataset.id || id);
    return {
      id,
      name,
      categoryId: row.querySelector('.pr-category').value,
      price: Number(row.querySelector('.pr-price').value),
      description: row.querySelector('.pr-description').value.trim(),
      photos: row._photos || [],
      filaments: readColorRows(row.querySelector('.pr-colors')),
    };
  });
}

/* ---------- load / save ---------- */
async function loadCatalogIntoForm(){
  const res = await fetch('/api/catalog');
  if (!res.ok) throw new Error('catalog fetch failed');
  const cat = await res.json();

  $('fProductName').value = cat.productName;
  $('fPrice').value = cat.price;
  $('colorRows').innerHTML = '';
  cat.filaments.forEach(c => addColorRow($('colorRows'), c));

  $('categoryRows').innerHTML = '';
  (cat.categories || []).forEach(addCategoryRow);
  refreshCategoryOptions(); // populates #fCategory even when there are zero categories yet
  $('fCategory').value = cat.duneCategoryId || '';

  $('productRows').innerHTML = '';
  (cat.products || []).forEach(addProductRow);
}

async function saveCatalog(){
  const body = {
    productName: $('fProductName').value.trim(),
    price: Number($('fPrice').value),
    filaments: readColorRows($('colorRows')),
    categories: readCategoryRows(),
    products: readProductRows(),
    duneCategoryId: $('fCategory').value,
  };
  return authedFetch('/api/admin-catalog', body);
}

document.addEventListener('DOMContentLoaded', () => {
  $('addColorBtn').addEventListener('click', () => addColorRow($('colorRows')));
  $('addCategoryBtn').addEventListener('click', () => addCategoryRow());
  $('addProductBtn').addEventListener('click', () => addProductRow());

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
