const path = require('node:path');
const { loadCatalog, createUploadManager, importCatalog, createPostgresRepository } = require('./lib/catalog-import.cjs');

async function main(args = process.argv.slice(2)) {
  if (args.some((argument) => argument !== '--dry-run' && argument !== '--help')) {
    throw new Error('Argumento desconhecido. Use node scripts/seed-catalog.cjs --help.');
  }
  if (args.includes('--help')) {
    console.log('Importar: npm run seed:catalog\nValidar sem banco/.env: node scripts/seed-catalog.cjs --dry-run\nExecute as migrations antes da importação. Reruns preservam alterações e exclusões.');
    return;
  }
  const backendDirectory = path.resolve(__dirname, '..');
  const catalog = await loadCatalog({ manifestPath: path.join(backendDirectory, 'catalog', 'catalog.json') });
  if (args.includes('--dry-run')) {
    console.log(JSON.stringify({ dryRun: true, version: catalog.manifest.version, categories: catalog.manifest.categories.length, products: catalog.manifest.products.length, offers: catalog.manifest.products.filter((product) => product.offer).length, assets: catalog.assets.size }, null, 2));
    return;
  }
  // Delay config and database imports so validation/dry-run work without credentials or a connection.
  const config = require('../src/config/database.js');
  const { Client } = require('pg');
  const client = new Client({ host: config.host, port: config.port, user: config.username, password: config.password, database: config.database });
  try {
    await client.connect();
    const result = await importCatalog({
      catalog,
      repository: createPostgresRepository(client),
      uploads: createUploadManager({ directory: path.join(backendDirectory, 'uploads') }),
    });
    console.log(JSON.stringify(result, null, 2));
  } finally { await client.end(); }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Falha ao importar catálogo: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };
