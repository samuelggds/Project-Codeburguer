const { randomUUID } = require('node:crypto');

function createCategorySlug(name, suffix = randomUUID()) {
  const base = String(name).normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
  return `${base || 'categoria'}-${suffix}`;
}

module.exports = { createCategorySlug };
