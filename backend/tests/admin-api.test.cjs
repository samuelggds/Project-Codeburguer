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
let users, products, orders, savedImages, discardedImages, shouldFailWrite;
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

stub('app/models/User.js', {
  findByPk: async (id) => users.find((user) => user.id === id),
  findOne: async ({ where }) => users.find((user) => user.email === where.email),
  create: async (data) => { users.push(data); return data; },
});
stub('app/models/Products.js', {
  findAll: async (options) => options?.where?.id ? products.filter((item) => options.where.id.includes(item.id)) : products,
  findByPk: async (id) => products.find((item) => item.id === Number(id)),
  create: async (data) => {
    if (shouldFailWrite) throw new Error('Test persistence failure');
    const value = product({ id: 2, ...data });
    products.push(value);
    return value;
  },
});
stub('app/models/Category.js', {
  findByPk: async (id) => Number(id) === 1 ? { id: 1, name: 'Hambúrgueres' } : null,
  findAll: async () => [{ id: 1, name: 'Hambúrgueres' }],
});
stub('app/models/Order.js', {
  findAll: async ({ where }) => orders.filter((order) => !where.user_id || where.user_id === order.user_id),
  findByPk: async (id) => orders.find((order) => order.id === id),
});
const imageFilename = require.resolve('../src/app/lib/productImages.js');
const imageHelpers = require(imageFilename);
require.cache[imageFilename].exports = {
  ...imageHelpers,
  saveProductImage: async () => { savedImages += 1; return 'new-image.png'; },
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
  products = [product({ id: 1, name: 'X-Tudo', price: '29.00', category_id: 1, offer: false, path: 'original.png' })];
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

test('server checks current admin role before every protected endpoint and upload', async () => {
  for (const id of [null, clientId, 'missing-user']) {
    const expected = id === clientId ? 403 : 401;
    for (const [method, url] of [['GET','/admin/session'], ['GET','/products/1'], ['POST','/products'], ['PUT','/products/1'], ['DELETE','/products/1'], ['PUT','/orders/' + orderId]]) {
      const result = await request(url, { id, method, body: method === 'POST' ? form() : undefined });
      assert.equal(result.status, expected, method + ' ' + url + ' role=' + id);
    }
  }
  assert.equal(savedImages, 0);
  assert.equal(products.length, 1);
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
  const created = await request('/products', { method: 'POST', body: form() });
  const result = await created.json();
  assert.equal(created.status, 201, JSON.stringify(result));
  assert.equal(Number(result.price), 29.9);
  assert.equal(result.offer, true);
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
  for (const change of [{ name: ' ' }, { price: '-1' }, { price: '1.234' }, { price: '100000000' }, { category_id: '999' }]) {
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
