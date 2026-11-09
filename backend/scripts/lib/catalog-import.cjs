const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_PRICE_CENTS = 9_999_999_999;
const LOCK_NAMESPACE = 1128417108;
const LOCK_ID = 1;

function normalizeCategoryName(name) {
  return name.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function centsToPrice(cents) {
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_PRICE_CENTS) {
    throw new Error('priceCents deve ser um inteiro positivo compatível com DECIMAL(10,2).');
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

function validateManifest(manifest) {
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.categories) || !Array.isArray(manifest.products)) {
    throw new Error('Catálogo inválido: esperado version: 1 e listas categories/products.');
  }
  if (!manifest.categories.length || !manifest.products.length) throw new Error('O catálogo deve conter categorias e produtos.');
  const categoryKeys = new Set();
  const categoryNames = new Set();
  const productKeys = new Set();
  function validateEntry(entry, keys, kind) {
    if (!entry || typeof entry.key !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,179}$/.test(entry.key)) {
      throw new Error(`Chave inválida em ${kind}. Use letras minúsculas, números, hífen ou sublinhado (até 180 caracteres).`);
    }
    if (keys.has(entry.key)) throw new Error(`Chave duplicada: ${kind}:${entry.key}.`);
    keys.add(entry.key);
    if (typeof entry.name !== 'string' || entry.name.trim() !== entry.name || entry.name.length < 2 || entry.name.length > 120) {
      throw new Error(`Nome inválido em ${kind}:${entry.key} (2 a 120 caracteres, sem espaços nas extremidades).`);
    }
    if (typeof entry.image !== 'string' || entry.image.length > 255 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|svg)$/.test(entry.image)) {
      throw new Error(`Imagem inválida em ${kind}:${entry.key}: informe somente o nome de um arquivo PNG ou SVG.`);
    }
  }
  for (const category of manifest.categories) {
    validateEntry(category, categoryKeys, 'category');
    const normalized = normalizeCategoryName(category.name);
    if (categoryNames.has(normalized)) throw new Error(`Nome de categoria duplicado: ${category.name}.`);
    categoryNames.add(normalized);
  }
  for (const product of manifest.products) {
    validateEntry(product, productKeys, 'product');
    if (!categoryKeys.has(product.categoryKey)) throw new Error(`Categoria desconhecida em product:${product.key}.`);
    centsToPrice(product.priceCents);
    if (typeof product.offer !== 'boolean') throw new Error(`offer deve ser boolean em product:${product.key}.`);
  }
  return manifest;
}

async function loadCatalog({ manifestPath, imagesDirectory = path.join(path.dirname(manifestPath), 'images'), filesystem = fs }) {
  const manifest = validateManifest(JSON.parse(await filesystem.readFile(manifestPath, 'utf8')));
  const assets = new Map();
  for (const entry of [...manifest.categories, ...manifest.products]) {
    if (assets.has(entry.image)) continue;
    const filename = path.join(imagesDirectory, entry.image);
    const stat = await filesystem.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Asset deve ser um arquivo regular: ${entry.image}.`);
    const bytes = await filesystem.readFile(filename);
    const extension = path.extname(entry.image);
    if (extension === '.png' && (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE))) {
      throw new Error(`Asset PNG inválido: ${entry.image}.`);
    }
    if (extension === '.svg' && !/<svg\b[^>]*>[\s\S]*<\/svg\s*>/i.test(bytes.toString('utf8'))) {
      throw new Error(`Asset SVG inválido: ${entry.image}.`);
    }
    assets.set(entry.image, { bytes, extension, digest: createHash('sha256').update(bytes).digest('hex') });
  }
  return { manifest, assets };
}

function uploadFilename(kind, entry, asset) {
  return `catalog-${kind}-${entry.key}-${asset.digest.slice(0, 16)}${asset.extension}`;
}

function createUploadManager({ directory, filesystem = fs }) {
  const created = [];
  let reused = 0;
  return {
    async stage(kind, entry, asset) {
      const filename = uploadFilename(kind, entry, asset);
      const destination = path.join(directory, filename);
      await filesystem.mkdir(directory, { recursive: true });
      let handle;
      try {
        handle = await filesystem.open(destination, 'wx');
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const stat = await filesystem.lstat(destination);
        if (!stat.isFile() || stat.isSymbolicLink() || !(await filesystem.readFile(destination)).equals(asset.bytes)) {
          throw new Error(`Upload existente divergente; nenhum arquivo foi sobrescrito: ${filename}.`);
        }
        reused += 1;
        return filename;
      }
      created.push(destination);
      try { await handle.writeFile(asset.bytes); }
      finally { await handle.close(); }
      return filename;
    },
    async rollback() {
      const failures = [];
      for (const filename of created) {
        try { await filesystem.unlink(filename); }
        catch (error) { if (error.code !== 'ENOENT') failures.push(error); }
      }
      if (failures.length) throw new AggregateError(failures, 'Não foi possível limpar todos os novos uploads após a falha.');
    },
    summary() { return { created: created.length, reused }; },
  };
}

function planImport(manifest, state) {
  const entries = new Map(state.entries.map((entry) => [entry.key, Number(entry.record_id)]));
  const categories = new Map(state.categories.map((category) => [Number(category.id), category]));
  const productIds = new Set(state.productIds.map(Number));
  const categoryIds = new Map();
  const newCategories = [];
  const reusedCategories = [];
  const newProducts = [];
  const summary = {
    categories: { created: 0, reused: 0, unchanged: 0, deleted: 0 },
    products: { created: 0, unchanged: 0, deleted: 0, skippedMissingCategory: 0 },
  };
  for (const category of manifest.categories) {
    const ledgerKey = `category:${category.key}`;
    if (entries.has(ledgerKey)) {
      const id = entries.get(ledgerKey);
      if (categories.has(id)) {
        categoryIds.set(category.key, id);
        summary.categories.unchanged += 1;
      } else summary.categories.deleted += 1;
      continue;
    }
    const matches = state.categories.filter((candidate) => normalizeCategoryName(candidate.name) === normalizeCategoryName(category.name));
    // Prefer an exact spelling, then the oldest ID, without changing any existing fields.
    matches.sort((a, b) => Number(b.name === category.name) - Number(a.name === category.name) || Number(a.id) - Number(b.id));
    if (matches.length) {
      const id = Number(matches[0].id);
      categoryIds.set(category.key, id);
      reusedCategories.push({ entry: category, id });
      summary.categories.reused += 1;
    } else {
      newCategories.push(category);
      summary.categories.created += 1;
    }
  }
  const newCategoryKeys = new Set(newCategories.map((entry) => entry.key));
  for (const product of manifest.products) {
    const ledgerKey = `product:${product.key}`;
    if (entries.has(ledgerKey)) {
      if (productIds.has(entries.get(ledgerKey))) summary.products.unchanged += 1;
      else summary.products.deleted += 1;
    } else if (!categoryIds.has(product.categoryKey) && !newCategoryKeys.has(product.categoryKey)) {
      summary.products.skippedMissingCategory += 1;
    } else {
      newProducts.push(product);
      summary.products.created += 1;
    }
  }
  return { categoryIds, newCategories, reusedCategories, newProducts, summary };
}

async function importCatalog({ catalog, repository, uploads }) {
  return repository.withTransaction(async (transaction) => {
    const plan = planImport(catalog.manifest, await transaction.readState());
    const filenames = new Map();
    // Finish all filesystem writes before inserting records. The lock also covers rollback cleanup.
    for (const [kind, entries] of [['category', plan.newCategories], ['product', plan.newProducts]]) {
      for (const entry of entries) {
        filenames.set(`${kind}:${entry.key}`, await uploads.stage(kind, entry, catalog.assets.get(entry.image)));
      }
    }
    for (const { entry, id } of plan.reusedCategories) await transaction.recordEntry(`category:${entry.key}`, id);
    for (const category of plan.newCategories) {
      const id = await transaction.createCategory({ name: category.name, path: filenames.get(`category:${category.key}`) });
      plan.categoryIds.set(category.key, id);
      await transaction.recordEntry(`category:${category.key}`, id);
    }
    for (const product of plan.newProducts) {
      const id = await transaction.createProduct({
        name: product.name,
        price: centsToPrice(product.priceCents),
        offer: product.offer,
        path: filenames.get(`product:${product.key}`),
        category_id: plan.categoryIds.get(product.categoryKey),
      });
      await transaction.recordEntry(`product:${product.key}`, id);
    }
    return { ...plan.summary, files: uploads.summary() };
  }, () => uploads.rollback());
}

function createPostgresRepository(client) {
  const transaction = {
    async readState() {
      const entries = (await client.query('SELECT key, record_id FROM catalog_seed_entries')).rows;
      const categories = (await client.query('SELECT id, name FROM categories ORDER BY id')).rows;
      const productIds = (await client.query("SELECT p.id FROM products p JOIN catalog_seed_entries e ON e.record_id = p.id WHERE e.key LIKE 'product:%'")).rows.map((row) => row.id);
      return { entries, categories, productIds };
    },
    async createCategory(category) {
      const result = await client.query('INSERT INTO categories (name, path, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id', [category.name, category.path]);
      return result.rows[0].id;
    },
    async createProduct(product) {
      const result = await client.query('INSERT INTO products (name, price, path, offer, category_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id', [product.name, product.price, product.path, product.offer, product.category_id]);
      return result.rows[0].id;
    },
    async recordEntry(key, id) {
      await client.query('INSERT INTO catalog_seed_entries (key, record_id, created_at) VALUES ($1, $2, NOW())', [key, id]);
    },
  };
  return {
    async withTransaction(work, onFailure) {
      // A session lock stays held during ROLLBACK and file cleanup, unlike a transaction lock.
      await client.query('SELECT pg_advisory_lock($1, $2)', [LOCK_NAMESPACE, LOCK_ID]);
      let active = false;
      let committing = false;
      let result;
      let failure;
      try {
        await client.query('BEGIN');
        active = true;
        const schema = await client.query("SELECT numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'products' AND column_name = 'price'");
        if (schema.rows[0]?.numeric_precision !== 10 || schema.rows[0]?.numeric_scale !== 2) {
          throw new Error('Execute as migrations antes do seed: products.price deve ser DECIMAL(10,2).');
        }
        result = await work(transaction);
        committing = true;
        await client.query('COMMIT');
        active = false;
      } catch (error) {
        failure = error;
        if (active) {
          try { await client.query('ROLLBACK'); }
          catch (rollbackError) { failure = new AggregateError([error, rollbackError], 'Falha na importação e no rollback do banco.'); }
        }
        // A lost connection during COMMIT can mean it succeeded. Keep its images until a rerun verifies the ledger.
        const uncertainCommit = committing && !(error.severity && /^[0-9A-Z]{5}$/.test(error.code || ''));
        if (uncertainCommit) {
          failure = new Error('Não foi possível confirmar o COMMIT. Novas imagens foram preservadas; execute novamente para verificar o ledger.', { cause: failure });
        } else {
          try { await onFailure(); }
          catch (cleanupError) { failure = new AggregateError([failure, cleanupError], 'Falha na importação; a limpeza de novos uploads também falhou.'); }
        }
      }
      try { await client.query('SELECT pg_advisory_unlock($1, $2)', [LOCK_NAMESPACE, LOCK_ID]); }
      catch (unlockError) {
        if (!failure) failure = new Error('Catálogo salvo, mas a liberação do lock falhou. Encerre a conexão antes de tentar novamente.', { cause: unlockError });
      }
      if (failure) throw failure;
      return result;
    },
  };
}

module.exports = { normalizeCategoryName, centsToPrice, validateManifest, loadCatalog, uploadFilename, createUploadManager, planImport, importCatalog, createPostgresRepository };
