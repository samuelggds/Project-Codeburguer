const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const {
  centsToPrice, validateManifest, loadCatalog, uploadFilename,
  createUploadManager, importCatalog, createPostgresRepository,
} = require('./lib/catalog-import.cjs');

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFWQAAAAASUVORK5CYII=', 'base64');

function manifest() {
  return {
    version: 1,
    categories: [{ key: 'burgers', name: 'Hambúrgueres', image: 'burger.png' }],
    products: [
      { key: 'home-burger', name: 'X-Burger', categoryKey: 'burgers', priceCents: 2990, offer: true, image: 'burger.png' },
      { key: 'menu-burger', name: 'X-Burger', categoryKey: 'burgers', priceCents: 2199, offer: false, image: 'burger.png' },
    ],
  };
}

async function fixture(t, value = manifest()) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codeburguer-catalog-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const images = path.join(root, 'images');
  const uploads = path.join(root, 'uploads');
  const manifestPath = path.join(root, 'catalog.json');
  await fs.mkdir(images);
  await fs.writeFile(path.join(images, 'burger.png'), png);
  await fs.writeFile(manifestPath, JSON.stringify(value));
  return { root, images, uploads, manifestPath, catalog: await loadCatalog({ manifestPath }) };
}

function memoryRepository(initial = {}) {
  let state = {
    categories: [], products: [], entries: [], nextCategoryId: 51, nextProductId: 101,
    ...structuredClone(initial),
  };
  let calls = 0;
  let failAfterProducts = Infinity;
  const repository = {
    get state() { return state; },
    get calls() { return calls; },
    set failAfterProducts(value) { failAfterProducts = value; },
    async withTransaction(work, onFailure) {
      calls += 1;
      const before = structuredClone(state);
      try {
        return await work({
          async readState() { return { categories: structuredClone(state.categories), entries: structuredClone(state.entries), productIds: state.products.map((item) => item.id) }; },
          async createCategory(data) {
            const row = { id: state.nextCategoryId++, ...data };
            state.categories.push(row);
            return row.id;
          },
          async createProduct(data) {
            const row = { id: state.nextProductId++, ...data };
            state.products.push(row);
            if (state.products.length >= failAfterProducts) throw new Error('Falha de persistência simulada');
            return row.id;
          },
          async recordEntry(key, id) {
            assert.equal(state.entries.some((entry) => entry.key === key), false, 'ledger key must be unique');
            state.entries.push({ key, record_id: id });
          },
        });
      } catch (error) {
        state = before;
        await onFailure();
        throw error;
      }
    },
  };
  return repository;
}

function runImport(f, repository, options = {}) {
  return importCatalog({ catalog: f.catalog, repository, uploads: createUploadManager({ directory: f.uploads, ...options }) });
}

test('importa nomes repetidos com keys distintas, centavos, oferta, imagens e IDs gerados', async (t) => {
  const f = await fixture(t);
  const repository = memoryRepository();
  const result = await runImport(f, repository);
  assert.equal(result.categories.created, 1);
  assert.equal(result.products.created, 2);
  assert.equal(result.files.created, 3);
  assert.deepEqual(repository.state.products.map(({ id, name, price, offer, category_id }) => ({ id, name, price, offer, category_id })), [
    { id: 101, name: 'X-Burger', price: '29.90', offer: true, category_id: 51 },
    { id: 102, name: 'X-Burger', price: '21.99', offer: false, category_id: 51 },
  ]);
  assert.deepEqual(repository.state.entries.map((entry) => entry.key), ['category:burgers', 'product:home-burger', 'product:menu-burger']);
  for (const row of [...repository.state.products, ...repository.state.categories]) {
    assert.match(row.path, /^catalog-/);
    assert.deepEqual(await fs.readFile(path.join(f.uploads, row.path)), png);
  }
});

test('rerun preserva nome, preço, oferta, categoria e imagem editados, sem duplicar nem copiar', async (t) => {
  const f = await fixture(t);
  const repository = memoryRepository();
  await runImport(f, repository);
  Object.assign(repository.state.products[0], { name: 'Editado pelo admin', price: '34.01', offer: false, path: 'admin-upload.png', category_id: 82 });
  Object.assign(repository.state.categories[0], { name: 'Categoria renomeada', path: 'custom-category.svg' });
  const before = structuredClone(repository.state);
  const result = await runImport(f, repository);
  assert.deepEqual(repository.state, before);
  assert.equal(result.categories.unchanged, 1);
  assert.equal(result.products.unchanged, 2);
  assert.deepEqual(result.files, { created: 0, reused: 0 });
});

test('ledger conserva tombstone de produto excluído; rerun não recria nem copia sua imagem', async (t) => {
  const f = await fixture(t);
  const repository = memoryRepository();
  await runImport(f, repository);
  repository.state.products = repository.state.products.filter((product) => product.id !== 101);
  const result = await runImport(f, repository);
  assert.equal(repository.state.products.length, 1);
  assert.equal(repository.state.entries.length, 3);
  assert.equal(result.products.deleted, 1);
  assert.equal(result.products.unchanged, 1);
  assert.equal(result.files.created, 0);
});

test('reutiliza categoria existente sem acento preservando seu nome e imagem', async (t) => {
  const f = await fixture(t);
  const existing = { id: 7, name: 'Hamburgueres', path: 'old-category.png' };
  const repository = memoryRepository({ categories: [existing] });
  const result = await runImport(f, repository);
  assert.equal(result.categories.reused, 1);
  assert.equal(result.categories.created, 0);
  assert.equal(result.files.created, 2);
  assert.deepEqual(repository.state.categories, [existing]);
  assert.ok(repository.state.products.every((product) => product.category_id === 7));
  assert.deepEqual(repository.state.entries[0], { key: 'category:burgers', record_id: 7 });
});

test('prefere grafia exata quando há mais de uma categoria equivalente', async (t) => {
  const f = await fixture(t);
  const repository = memoryRepository({ categories: [{ id: 2, name: 'Hamburgueres' }, { id: 3, name: 'Hambúrgueres' }] });
  await runImport(f, repository);
  assert.ok(repository.state.products.every((product) => product.category_id === 3));
  assert.equal(repository.state.categories.length, 2);
});

test('preserva categoria excluída e relata produtos novos sem categoria', async (t) => {
  const f = await fixture(t);
  const repository = memoryRepository({ entries: [{ key: 'category:burgers', record_id: 77 }] });
  const result = await runImport(f, repository);
  assert.equal(result.categories.deleted, 1);
  assert.equal(result.products.skippedMissingCategory, 2);
  assert.equal(repository.state.categories.length, 0);
  assert.equal(repository.state.products.length, 0);
  assert.equal(result.files.created, 0);
});

test('erro no banco reverte linhas/ledger e remove somente uploads novos; rerun pode recuperar', async (t) => {
  const f = await fixture(t);
  await fs.mkdir(f.uploads);
  const existingFilename = uploadFilename('product', f.catalog.manifest.products[0], f.catalog.assets.get('burger.png'));
  await fs.writeFile(path.join(f.uploads, existingFilename), png);
  await fs.writeFile(path.join(f.uploads, 'user-file.txt'), 'existing upload');
  const repository = memoryRepository();
  const before = structuredClone(repository.state);
  repository.failAfterProducts = 1;
  await assert.rejects(runImport(f, repository), /persistência simulada/);
  assert.deepEqual(repository.state, before);
  assert.deepEqual((await fs.readdir(f.uploads)).sort(), [existingFilename, 'user-file.txt'].sort());
  assert.deepEqual(await fs.readFile(path.join(f.uploads, existingFilename)), png);
  repository.failAfterProducts = Infinity;
  const result = await runImport(f, repository);
  assert.equal(result.products.created, 2);
  assert.equal(result.files.reused, 1);
});

test('upload divergente nunca é sobrescrito e arquivos anteriores são preservados', async (t) => {
  const f = await fixture(t);
  await fs.mkdir(f.uploads);
  const filename = uploadFilename('product', f.catalog.manifest.products[1], f.catalog.assets.get('burger.png'));
  await fs.writeFile(path.join(f.uploads, filename), 'different existing contents');
  const repository = memoryRepository();
  await assert.rejects(runImport(f, repository), /Upload existente divergente/);
  assert.equal(repository.state.entries.length, 0);
  assert.equal(repository.state.products.length, 0);
  assert.equal(repository.state.categories.length, 0);
  assert.equal(await fs.readFile(path.join(f.uploads, filename), 'utf8'), 'different existing contents');
  assert.deepEqual(await fs.readdir(f.uploads), [filename]);
});

test('falha ao gravar arquivo parcial remove o arquivo sem inserir registros', async (t) => {
  const f = await fixture(t);
  const repository = memoryRepository();
  const filesystem = {
    ...fs,
    async open(...args) {
      const handle = await fs.open(...args);
      return {
        async writeFile() { await handle.writeFile('partial'); throw new Error('Disk full'); },
        async close() { await handle.close(); },
      };
    },
  };
  await assert.rejects(runImport(f, repository, { filesystem }), /Disk full/);
  assert.equal(repository.state.entries.length, 0);
  assert.deepEqual(await fs.readdir(f.uploads), []);
});

test('conversão de centavos é exata nos limites e rejeita valores incompatíveis', () => {
  for (const [cents, price] of [[1, '0.01'], [90, '0.90'], [100, '1.00'], [2990, '29.90'], [9_999_999_999, '99999999.99']]) assert.equal(centsToPrice(cents), price);
  for (const value of [0, -1, 29.9, '2990', NaN, Infinity, 10_000_000_000, Number.MAX_SAFE_INTEGER]) assert.throws(() => centsToPrice(value), /priceCents/);
});

test('rejeita versão, nomes, referências, keys, ofertas e paths inválidos', () => {
  const mutations = [
    (value) => { value.version = 2; },
    (value) => { value.categories = []; },
    (value) => { value.products = []; },
    (value) => { value.products[0].key = '../escape'; },
    (value) => { value.products[1].key = value.products[0].key; },
    (value) => { value.categories.push({ ...value.categories[0] }); },
    (value) => { value.categories.push({ ...value.categories[0], key: 'alias', name: 'Hamburgueres' }); },
    (value) => { value.products[0].name = ' '; },
    (value) => { value.products[0].name = 'x'.repeat(121); },
    (value) => { value.products[0].categoryKey = 'missing'; },
    (value) => { value.products[0].offer = 'true'; },
    (value) => { value.products[0].priceCents = 12.5; },
    (value) => { value.products[0].image = '../burger.png'; },
    (value) => { value.products[0].image = 'C:\\burger.png'; },
    (value) => { value.products[0].image = 'burger.exe'; },
  ];
  for (const mutate of mutations) {
    const value = manifest();
    mutate(value);
    assert.throws(() => validateManifest(value));
  }
});

test('valida presença e conteúdo dos assets antes de retornar catálogo', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.images, 'burger.png'), 'not a PNG');
  await assert.rejects(loadCatalog({ manifestPath: f.manifestPath }), /PNG inválido/);
  await fs.unlink(path.join(f.images, 'burger.png'));
  await assert.rejects(loadCatalog({ manifestPath: f.manifestPath }), { code: 'ENOENT' });
  const value = manifest();
  value.categories[0].image = 'category.svg';
  await fs.writeFile(path.join(f.images, 'burger.png'), png);
  await fs.writeFile(f.manifestPath, JSON.stringify(value));
  await fs.writeFile(path.join(f.images, 'category.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
  assert.equal((await loadCatalog({ manifestPath: f.manifestPath })).assets.size, 2);
  await fs.writeFile(path.join(f.images, 'category.svg'), '<html>bad SVG</html>');
  await assert.rejects(loadCatalog({ manifestPath: f.manifestPath }), /SVG inválido/);
});

test('CLI dry-run valida catálogo real sem .env, senha, banco ou uploads', () => {
  const env = { ...process.env, DB_PASSWORD: '', DB_HOST: 'invalid.invalid', DB_PORT: '1' };
  const result = spawnSync(process.execPath, [path.join(__dirname, 'seed-catalog.cjs'), '--dry-run'], { cwd: os.tmpdir(), encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.dryRun, true);
  assert.equal(report.categories, 4);
  assert.equal(report.products, 40);
  assert.equal(report.offers, 4);
});

test('adapter PostgreSQL mantém lock até rollback e limpeza de arquivos', async () => {
  const events = [];
  const client = { async query(sql) {
    events.push(sql);
    return { rows: sql.includes('information_schema') ? [{ numeric_precision: 10, numeric_scale: 2 }] : [] };
  } };
  const repository = createPostgresRepository(client);
  await assert.rejects(repository.withTransaction(async () => { events.push('WORK'); throw new Error('insert failed'); }, async () => { events.push('CLEANUP'); }), /insert failed/);
  assert.match(events[0], /pg_advisory_lock/);
  assert.ok(events.indexOf('BEGIN') < events.indexOf('WORK'));
  assert.ok(events.indexOf('ROLLBACK') < events.indexOf('CLEANUP'));
  assert.match(events.at(-1), /pg_advisory_unlock/);
  assert.ok(!events.includes('COMMIT'));
});

test('adapter exige migration decimal antes de executar a importação', async () => {
  const events = [];
  const client = { async query(sql) { events.push(sql); return { rows: sql.includes('information_schema') ? [{ numeric_precision: 32, numeric_scale: 0 }] : [] }; } };
  await assert.rejects(createPostgresRepository(client).withTransaction(async () => { throw new Error('must not start'); }, async () => {}), /Execute as migrations/);
  assert.ok(events.includes('ROLLBACK'));
  assert.ok(!events.includes('COMMIT'));
});

test('adapter usa parâmetros, preços em reais e IDs retornados, sem forçar IDs', async () => {
  const queries = [];
  const client = { async query(sql, params) {
    queries.push({ sql, params });
    if (sql.includes('information_schema')) return { rows: [{ numeric_precision: 10, numeric_scale: 2 }] };
    return { rows: sql.startsWith('INSERT') ? [{ id: 830 }] : [] };
  } };
  const result = await createPostgresRepository(client).withTransaction(async (transaction) => {
    assert.deepEqual(await transaction.readState(), { entries: [], categories: [], productIds: [] });
    const id = await transaction.createProduct({ name: "Chef's Burger", price: '29.90', path: 'image.png', offer: true, category_id: 9 });
    await transaction.recordEntry('product:burger', id);
    return id;
  }, async () => { throw new Error('cleanup must not run on success'); });
  assert.equal(result, 830);
  const insert = queries.find(({ sql }) => sql.startsWith('INSERT INTO products'));
  assert.deepEqual(insert.params, ["Chef's Burger", '29.90', 'image.png', true, 9]);
  assert.ok(!insert.sql.includes("Chef's Burger"));
  assert.ok(!insert.sql.includes('(id,'));
  assert.ok(queries.some(({ sql }) => sql === 'COMMIT'));
});

test('falha SQL no COMMIT limpa arquivos; confirmação incerta preserva imagens', async () => {
  for (const uncertain of [false, true]) {
    let cleaned = false;
    const client = { async query(sql) {
      if (sql === 'COMMIT') {
        const error = new Error('commit failed');
        if (!uncertain) Object.assign(error, { code: '23514', severity: 'ERROR' });
        throw error;
      }
      return { rows: sql.includes('information_schema') ? [{ numeric_precision: 10, numeric_scale: 2 }] : [] };
    } };
    await assert.rejects(createPostgresRepository(client).withTransaction(async () => ({}), async () => { cleaned = true; }), uncertain ? /confirmar o COMMIT/ : /commit failed/);
    assert.equal(cleaned, !uncertain);
  }
});

test('migration mantém ledger independente das tabelas editáveis', async () => {
  const migration = require('../src/database/migrations/20261108130000-create-catalog-seed-entries.js');
  let definition;
  await migration.up({ async createTable(name, fields) { assert.equal(name, 'catalog_seed_entries'); definition = fields; } }, { STRING: 'string', INTEGER: 'integer', DATE: 'date' });
  assert.equal(definition.key.primaryKey, true);
  assert.equal(definition.record_id.references, undefined);
  assert.equal(definition.record_id.allowNull, false);
});
