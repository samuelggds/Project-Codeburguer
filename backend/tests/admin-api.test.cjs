const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('sucrase/register');

process.env.JWT_SECRET = 'admin-route-tests-only-not-a-deployment-secret';
const express = require('express');
const jwt = require('jsonwebtoken');
const adminId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const orderId = '33333333-3333-4333-8333-333333333333';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFWQAAAAASUVORK5CYII=', 'base64');
let users, products, categories, seedEntries, orders, savedImages, discardedImages, shouldFailWrite;
let server, base;

function stub(relative, exports) {
  const filename = require.resolve(path.join(__dirname, '..', 'src', relative));
  require.cache[filename] = { id: filename, filename, loaded: true, exports: { __esModule: true, default: exports } };
}

function product(data) {
  return {
    ...data,
    async update(values) {
      if (shouldFailWrite) throw new Error('Test persistence failure');
      Object.assign(this, values);
      return this;
    },
    async destroy() { products = products.filter((item) => item.id !== this.id); },
  };
}

function category(data) {
  return {
    ...data,
    async update(values) {
      if (shouldFailWrite) throw new Error('Test persistence failure');
      if (categories.some((item) => item.id !== this.id && item.name === values.name)) {
        throw Object.assign(new Error('Duplicate category'), { name: 'SequelizeUniqueConstraintError' });
      }
      Object.assign(this, values);
      return this;
    },
  };
}

stub('app/models/User.js', {
  findByPk: async (id) => users.find((user) => user.id === id),
  findOne: async ({ where }) => users.find((user) => user.email === where.email),
  create: async (data) => { users.push(data); return data; },
});
stub('app/models/Products.js', {
  findAll: async (options) => products.filter((item) =>
    (!options?.where?.id || options.where.id.includes(item.id)) &&
    (options?.where?.category_id === undefined || options.where.category_id === item.category_id)),
  findByPk: async (id) => products.find((item) => item.id === Number(id)),
  create: async (data) => {
    if (shouldFailWrite) throw new Error('Test persistence failure');
    const value = product({ id: 2, ...data });
    products.push(value);
    return value;
  },
});
stub('app/models/Category.js', {
  findByPk: async (id) => categories.find((item) => item.id === Number(id)),
  findAll: async () => categories,
  create: async (data) => {
    if (shouldFailWrite) throw new Error('Test persistence failure');
    if (categories.some((item) => item.name === data.name)) {
      throw Object.assign(new Error('Duplicate category'), { name: 'SequelizeUniqueConstraintError' });
    }
    const value = category({ id: Math.max(...categories.map((item) => item.id), 0) + 1, ...data });
    categories.push(value);
    return value;
  },
});
stub('app/models/CatalogSeedEntry.js', { findAll: async () => seedEntries });
stub('app/models/Order.js', {
  findAll: async ({ where }) => orders.filter((order) => !where.user_id || where.user_id === order.user_id),
  findByPk: async (id) => orders.find((order) => order.id === id),
});
const imageFilename = require.resolve('../src/app/lib/productImages.js');
const imageHelpers = require(imageFilename);
require.cache[imageFilename].exports = {
  ...imageHelpers,
  saveProductImage: async () => { savedImages += 1; return savedImages === 1 ? 'new-image.png' : `new-image-${savedImages}.png`; },
  discardNewProductImage: async (filename) => { if (filename) discardedImages.push(filename); },
};
const routes = require('../src/routes.js').default;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(routes);
  server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });

beforeEach(() => {
  users = [
    { id: adminId, name: 'Administrador', email: 'admin@example.com', admin: true },
    { id: clientId, name: 'Cliente', email: 'cliente@example.com', admin: false },
  ];
  products = [product({ id: 1, name: 'X-Tudo', description: 'Hambúrguer da casa', price: '29.00', category_id: 1, offer: false, path: 'original.png' })];
  categories = [category({ id: 1, name: 'Hambúrgueres', slug: 'hamburgueres', description: 'Feitos na hora', path: 'burgers.png' })];
  seedEntries = [{ key: 'category:burgers', record_id: 1 }, { key: 'product:burger', record_id: 1 }];
  const snapshot = [{ id: 1, name: 'X-Tudo', price: '29.00', quantity: 2, url: '/product-file/original.png' }];
  orders = [{
    id: orderId, user_id: clientId, user_name: 'Cliente', status: 'Pedido realizado', products: snapshot,
    toJSON() { return { id: this.id, user_id: this.user_id, user_name: this.user_name, status: this.status, products: this.products }; },
    async update(values) { Object.assign(this, values); },
  }];
  savedImages = 0;
  discardedImages = [];
  shouldFailWrite = false;
});

async function request(url, { id = adminId, method = 'GET', data, body, token } = {}) {
  const headers = {};
  if (id) headers.Authorization = 'Bearer ' + (token || jwt.sign({ id, name: 'Teste', admin: true }, process.env.JWT_SECRET));
  if (data) headers['Content-Type'] = 'application/json';
  return fetch(base + url, { method, headers, body: data ? JSON.stringify(data) : body });
}

function form(overrides = {}, image = { data: png, type: 'image/png', name: 'produto.png' }) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: 'Combo Nuggets', price: '29.90', category_id: '1', offer: 'true', ...overrides })) data.append(key, value);
  if (image) data.append('file', new Blob([image.data], { type: image.type }), image.name);
  return data;
}

function categoryForm(overrides = {}, image = { data: png, type: 'image/png', name: 'categoria.png' }) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: 'Porções especiais', description: 'Para compartilhar com a família', ...overrides })) data.append(key, value);
  if (image) data.append('file', new Blob([image.data], { type: image.type }), image.name);
  return data;
}

test('server checks current admin role before every protected endpoint and upload', async () => {
  for (const id of [null, clientId, 'missing-user']) {
    const expected = id === clientId ? 403 : 401;
    for (const [method, url] of [['GET','/admin/session'], ['GET','/products/1'], ['POST','/products'], ['PUT','/products/1'], ['DELETE','/products/1'], ['GET','/categories/1'], ['POST','/categories'], ['PUT','/categories/1'], ['PUT','/orders/' + orderId]]) {
      const result = await request(url, { id, method, body: method === 'POST' ? (url === '/categories' ? categoryForm() : form()) : undefined });
      assert.equal(result.status, expected, method + ' ' + url + ' role=' + id);
    }
  }
  assert.equal(savedImages, 0);
  assert.equal(products.length, 1);
  assert.equal(categories.length, 1);
  assert.equal(orders[0].status, 'Pedido realizado');
  assert.equal((await request('/admin/session')).status, 200);
  users[0].admin = false;
  assert.equal((await request('/admin/session')).status, 403, 'revoked role must beat a valid JWT admin claim');
});

test('public registration cannot grant administrator role', async () => {
  const response = await request('/users', { id: null, method: 'POST', data: { name: 'Novo cliente', email: 'novo@example.com', password: 'testpass123', admin: true } });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).admin, false);
  assert.equal(users.at(-1).admin, false);
});

test('multipart create and edit accept reais with cents and preserve the current image without a new file', async () => {
  const created = await request('/products', { method: 'POST', body: form({ description: 'Molho especial da casa' }) });
  const result = await created.json();
  assert.equal(created.status, 201, JSON.stringify(result));
  assert.equal(Number(result.price), 29.9);
  assert.equal(result.offer, true);
  assert.equal(result.description, 'Molho especial da casa');
  assert.equal(savedImages, 1);
  const update = await request('/products/2', { method: 'PUT', body: form({ name: 'Combo atualizado', price: '32.50', offer: 'false' }, null) });
  assert.equal(update.status, 200);
  const updated = await update.json();
  assert.equal(Number(updated.price), 32.5);
  assert.equal(updated.path, 'new-image.png');
  assert.equal(updated.offer, false);
  assert.equal(savedImages, 1);
  const offer = await request('/products/2', { method: 'PUT', data: { offer: true } });
  assert.equal(offer.status, 200);
  assert.equal(products[1].name, 'Combo atualizado');
  assert.equal(products[1].offer, true);
});

test('invalid fields, prices, category, missing image and unsafe uploads do not create products or files', async () => {
  for (const change of [{ name: ' ' }, { description: 'x'.repeat(1001) }, { price: '-1' }, { price: '1.234' }, { price: '100000000' }, { category_id: '999' }]) {
    const response = await request('/products', { method: 'POST', body: form(change) });
    assert.equal(response.status, 400, JSON.stringify(change));
  }
  assert.equal((await request('/products', { method: 'POST', body: form({}, null) })).status, 400);
  for (const image of [
    { data: '<svg/>', type: 'image/svg+xml', name: 'bad.svg' },
    { data: '<html>not an image</html>', type: 'image/png', name: 'bad.png' },
    { data: png, type: 'image/png', name: 'bad.html' },
  ]) {
    assert.equal((await request('/products', { method: 'POST', body: form({}, image) })).status, 400);
  }
  assert.equal((await request('/products', { method: 'POST', body: form({}, { data: Buffer.alloc(5 * 1024 * 1024 + 1), type: 'image/png', name: 'large.png' }) })).status, 413);
  assert.equal(products.length, 1);
  assert.equal(savedImages, 0);
});

test('product deletion leaves historical order snapshots and old images intact', async () => {
  const before = JSON.stringify(orders[0].products);
  assert.equal((await request('/products/1', { method: 'DELETE' })).status, 204);
  assert.equal(products.length, 0);
  assert.equal(JSON.stringify(orders[0].products), before);
  assert.deepEqual(discardedImages, []);
  assert.equal((await request('/products/1')).status, 404);
  assert.equal((await request('/products/1', { method: 'DELETE' })).status, 404);
  assert.equal((await request('/products/not-an-id')).status, 400);
});

test('order status is validated and normal users only list their own orders', async () => {
  assert.equal((await request('/orders/' + orderId, { method: 'PUT', data: { status: 'Inventado' } })).status, 400);
  assert.equal(orders[0].status, 'Pedido realizado');
  for (const status of ['Em preparação', 'Pronto', 'A caminho', 'Entregue']) {
    const response = await request('/orders/' + orderId, { method: 'PUT', data: { status } });
    assert.equal(response.status, 200);
    assert.equal(orders[0].status, status);
  }
  assert.equal((await request('/orders/not-uuid', { method: 'PUT', data: { status: 'Pronto' } })).status, 400);
  assert.equal((await (await request('/orders', { id: clientId })).json()).length, 1);
  orders[0].user_id = adminId;
  assert.equal((await (await request('/orders', { id: clientId })).json()).length, 0);
  assert.equal((await (await request('/orders')).json()).length, 1);
});

test('catalog is public with invalid or missing JWT, has no cache and exposes only public fields', async () => {
  Object.assign(products[0], { user_id: clientId, password_hash: 'private', email: 'private@example.com' });
  Object.assign(categories[0], { admin: true, token: 'private' });
  seedEntries.push({ key: 'product:deleted-product', record_id: 99 });
  const expected = {
    categories: [{ id: 1, slug: 'hamburgueres', name: 'Hambúrgueres', description: 'Feitos na hora', path: 'burgers.png', url: '/category-file/burgers.png', sourceKey: 'burgers' }],
    products: [{ id: 1, name: 'X-Tudo', description: 'Hambúrguer da casa', price: '29.00', path: 'original.png', url: '/product-file/original.png', offer: false, category_id: 1, sourceKey: 'burger' }],
  };
  for (const options of [{ id: null }, { token: 'expired-invalid-token' }, { id: clientId }]) {
    const response = await request('/catalog', options);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), expected);
  }
  assert.equal((await request('/categories', { id: null })).status, 401);
  assert.equal((await request('/products', { id: null })).status, 401);
});

test('admin creates and edits a category with description, safe image and a stable server-generated slug', async () => {
  const response = await request('/categories', { method: 'POST', body: categoryForm({ slug: 'client-controlled', admin: 'true' }) });
  const created = await response.json();
  assert.equal(response.status, 201, JSON.stringify(created));
  assert.match(created.slug, /^porcoes-especiais-[0-9a-f-]{36}$/);
  assert.equal(created.admin, undefined);
  assert.equal(created.description, 'Para compartilhar com a família');
  assert.equal(created.path, 'new-image.png');
  assert.equal((await request('/categories/' + created.id)).status, 200);
  const catalogAfterCreate = await (await request('/catalog', { id: null })).json();
  const visible = catalogAfterCreate.categories.find((item) => item.id === created.id);
  assert.equal(visible.name, created.name);
  assert.equal(visible.description, created.description);
  assert.equal(visible.url, '/category-file/new-image.png');
  assert.equal(visible.sourceKey, undefined, 'new categories do not inherit a seed identity');

  const changed = await request('/categories/' + created.id, { method: 'PUT', body: categoryForm({ name: 'Lanches especiais', description: 'Nova descrição', slug: 'must-not-change' }, null) });
  assert.equal(changed.status, 200);
  const edited = await changed.json();
  assert.equal(edited.slug, created.slug);
  assert.equal(edited.path, created.path);
  assert.equal(edited.name, 'Lanches especiais');
  assert.equal(edited.description, 'Nova descrição');
  assert.equal(savedImages, 1, 'editing metadata does not require another upload');

  const replacement = new FormData();
  replacement.append('file', new Blob([png], { type: 'image/png' }), 'nova.png');
  assert.equal((await request('/categories/' + created.id, { method: 'PUT', body: replacement })).status, 200);
  const catalogAfterEdit = await (await request('/catalog', { id: null })).json();
  const updated = catalogAfterEdit.categories.find((item) => item.id === created.id);
  assert.equal(updated.slug, created.slug);
  assert.equal(updated.name, 'Lanches especiais');
  assert.equal(updated.description, 'Nova descrição');
  assert.equal(updated.url, '/category-file/new-image-2.png');
  assert.deepEqual(discardedImages, [], 'existing category images are retained');
});

test('category validation rejects missing fields, invalid IDs, duplicates and unsafe uploads', async () => {
  for (const change of [{ name: ' ' }, { name: 'x'.repeat(121) }, { description: '' }, { description: 'x'.repeat(501) }]) {
    assert.equal((await request('/categories', { method: 'POST', body: categoryForm(change) })).status, 400);
  }
  const missingDescription = categoryForm();
  missingDescription.delete('description');
  assert.equal((await request('/categories', { method: 'POST', body: missingDescription })).status, 400);
  assert.equal((await request('/categories', { method: 'POST', body: categoryForm({}, null) })).status, 400);
  for (const image of [
    { data: '<svg/>', type: 'image/svg+xml', name: 'bad.svg' },
    { data: '<html>not a PNG</html>', type: 'image/png', name: 'bad.png' },
    { data: png, type: 'image/png', name: 'bad.html' },
  ]) {
    assert.equal((await request('/categories', { method: 'POST', body: categoryForm({}, image) })).status, 400);
    assert.equal((await request('/categories/1', { method: 'PUT', body: categoryForm({}, image) })).status, 400);
  }
  const largeImage = { data: Buffer.alloc(5 * 1024 * 1024 + 1), type: 'image/png', name: 'large.png' };
  assert.equal((await request('/categories', { method: 'POST', body: categoryForm({}, largeImage) })).status, 413);
  assert.equal(savedImages, 0);
  assert.equal(categories.length, 1);
  for (const method of ['GET', 'PUT']) {
    assert.equal((await request('/categories/invalid', { method })).status, 400);
    assert.equal((await request('/categories/99', { method })).status, 404);
  }
  assert.equal((await request('/categories/1', { method: 'PUT', data: {} })).status, 400);
  assert.equal((await request('/categories', { method: 'POST', body: categoryForm({ name: 'Hambúrgueres' }) })).status, 409);
  assert.equal(categories.length, 1);
  assert.deepEqual(discardedImages, ['new-image.png'], 'failed category creation removes its new upload');
});

test('product category, offer and description changes appear immediately in the public catalog and filtered list', async () => {
  const createdCategory = await (await request('/categories', { method: 'POST', body: categoryForm() })).json();
  const changed = await request('/products/1', { method: 'PUT', data: { category_id: createdCategory.id, offer: true, description: 'Agora na nova categoria', price: '31.90' } });
  assert.equal(changed.status, 200);
  const catalog = await (await request('/catalog', { id: null })).json();
  assert.equal(catalog.products[0].category_id, createdCategory.id);
  assert.equal(catalog.products[0].offer, true);
  assert.equal(catalog.products[0].description, 'Agora na nova categoria');
  assert.equal(typeof catalog.products[0].price, 'string');
  assert.equal(Number(catalog.products[0].price), 31.9);
  assert.equal(catalog.products[0].sourceKey, 'burger', 'moving categories preserves product identity');
  assert.deepEqual(await (await request('/products?category_id=1', { id: clientId })).json(), []);
  assert.deepEqual((await (await request('/products?category_id=' + createdCategory.id, { id: clientId })).json()).map((item) => item.id), [1]);
  assert.equal((await request('/products?category_id=invalid')).status, 400);

  assert.equal((await request('/products/1', { method: 'PUT', data: { offer: false } })).status, 200);
  assert.equal((await (await request('/catalog', { id: null })).json()).products[0].offer, false);
  const createdProduct = await request('/products', { method: 'POST', body: form({ category_id: String(createdCategory.id) }) });
  assert.equal(createdProduct.status, 201);
  const catalogWithNewProduct = await (await request('/catalog', { id: null })).json();
  assert.equal(catalogWithNewProduct.products[1].sourceKey, undefined);
  assert.equal(catalogWithNewProduct.products[1].description, '');
});

test('category writes require the current admin role even when the request contains an admin JWT claim', async () => {
  users[0].admin = false;
  assert.equal((await request('/categories', { method: 'POST', body: categoryForm() })).status, 403);
  assert.equal((await request('/categories/1', { method: 'PUT', data: { name: 'Unauthorized', admin: true } })).status, 403);
  assert.equal((await request('/categories/1')).status, 403);
  assert.equal(categories[0].name, 'Hambúrgueres');
  assert.equal(savedImages, 0);
});
