#!/usr/bin/env node
// Run from any directory: node backend/catalog/build-catalog.mjs [--check]
// Only local storefront modules and PNG originals are inputs; no database is used.
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const catalogDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.resolve(catalogDirectory, '../../frontend/src');
const imageDirectory = path.join(catalogDirectory, 'images');
const checkOnly = process.argv.slice(2).includes('--check');
assert(process.argv.slice(2).every((argument) => argument === '--check'), 'Usage: node backend/catalog/build-catalog.mjs [--check]');
const moduleURLs = new Map();
const imageFiles = new Map();
const assets = new Map();
const safeKey = /^[a-z0-9][a-z0-9-]*$/;

function insideSource(filename) {
  const relative = path.relative(sourceDirectory, filename);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Source outside frontend/src: ${filename}`);
}

function dataModule(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}

// Node cannot import PNGs like Vite. Rewrite this local data-module graph into
// in-memory ESM URLs, with PNG imports exporting their original local file URL.
// The actual array/map expressions still execute, so prices and IDs have one source.
async function moduleURL(filename) {
  insideSource(filename);
  if (moduleURLs.has(filename)) return moduleURLs.get(filename);
  let source;
  if (path.extname(filename) === '.png') {
    source = `export default ${JSON.stringify(pathToFileURL(filename).href)};`;
  } else {
    assert.equal(path.extname(filename), '.js', `Unsupported data module: ${filename}`);
    source = await readFile(filename, 'utf8');
    const imports = [...source.matchAll(/\bfrom\s+(['"])(\.[^'"]+)\1/g)];
    for (const match of imports.reverse()) {
      const dependency = await moduleURL(path.resolve(path.dirname(filename), match[2]));
      source = source.slice(0, match.index) + `from ${JSON.stringify(dependency)}` + source.slice(match.index + match[0].length);
    }
  }
  const url = dataModule(source);
  moduleURLs.set(filename, url);
  return url;
}

async function png(photo) {
  const filename = fileURLToPath(photo.image);
  insideSource(filename);
  assert.equal(path.extname(filename), '.png');
  if (!imageFiles.has(filename)) imageFiles.set(filename, await readFile(filename));
  const bytes = imageFiles.get(filename);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Not a PNG: ${filename}`);
  assert.equal(bytes.readUInt32BE(16), photo.imageWidth, `Incorrect source width: ${filename}`);
  assert.equal(bytes.readUInt32BE(20), photo.imageHeight, `Incorrect source height: ${filename}`);
  return bytes;
}

function number(value) {
  return Number(value.toFixed(4));
}

function escapeXML(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

async function svgImage(photo, rectangle) {
  const bytes = await png(photo);
  return `  <image x="${number(rectangle.x)}" y="${number(rectangle.y)}" width="${number(rectangle.width)}" height="${number(rectangle.height)}" preserveAspectRatio="xMidYMax meet" href="data:image/png;base64,${bytes.toString('base64')}"/>`;
}

// Mirror the desktop menu.css layout at --m: 2.5px. SVG only positions the
// untouched original PNGs; it does not resample or regenerate their pixels.
async function composition(product) {
  const scale = 2.5;
  let width;
  let height;
  let layers;
  if (product.sideImage) {
    width = 80 * scale;
    height = 54 * scale;
    const mainWidth = Math.min(70 * scale, product.imageWidth);
    const mainHeight = mainWidth * product.imageHeight / product.imageWidth;
    const sideWidth = Math.min(41 * scale, product.sideImage.imageWidth);
    const sideHeight = sideWidth * product.sideImage.imageHeight / product.sideImage.imageWidth;
    layers = [
      { photo: product, x: (width - mainWidth) / 2, y: (height - mainHeight) / 2, width: mainWidth, height: mainHeight },
      { photo: product.sideImage, x: width + 7 * scale - sideWidth, y: height + scale - sideHeight, width: sideWidth, height: sideHeight },
    ];
    width += 7 * scale;
    height += scale;
  } else {
    assert.equal(product.photos.length, 2, `Expected two-photo composition: ${product.id}`);
    width = 80 * scale;
    height = 60 * scale;
    let itemWidth = 0.82;
    let frontHeight = 0.9;
    let backHeight = 0.85;
    let backLift = 2 * scale;
    if (product.id === 'drink-milk') {
      width = 90 * scale;
      itemWidth = 0.72;
      frontHeight = 1;
      backLift = 6 * scale;
    }
    if (product.id === 'drink-cocktails') {
      width = 90 * scale;
      height = 70 * scale;
      itemWidth = 0.72;
      frontHeight = 0.78;
      backHeight = 0.95;
      backLift = 0;
    }
    if (product.id === 'dessert-pies') backLift = 8 * scale;
    const frontIndex = product.photoLayout === 'front-left' ? 0 : 1;
    layers = product.photos.map((photo, index) => {
      const front = index === frontIndex;
      const itemHeight = height * (front ? frontHeight : backHeight);
      const availableWidth = width * itemWidth;
      const imageWidth = Math.min(availableWidth, photo.imageWidth);
      const imageHeight = Math.min(itemHeight, photo.imageHeight);
      return {
        photo,
        x: (index === 0 ? 0 : width - availableWidth) + (availableWidth - imageWidth) / 2,
        y: height - (front ? 0 : backLift) - imageHeight,
        width: imageWidth,
        height: imageHeight,
        front,
      };
    }).sort((left, right) => Number(left.front) - Number(right.front));
  }
  const images = await Promise.all(layers.map((layer) => svgImage(layer.photo, layer)));
  return Buffer.from([
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}" height="${number(height)}" viewBox="0 0 ${number(width)} ${number(height)}" role="img">`,
    `  <title>${escapeXML(product.name)}</title>`,
    ...images,
    '</svg>',
    '',
  ].join('\n'));
}

async function imageAsset(kind, item) {
  const combined = Boolean(item.sideImage || item.photos?.length > 1);
  const filename = `${kind}-${item.id}.${combined ? 'svg' : 'png'}`;
  assert(!assets.has(filename), `Duplicate asset: ${filename}`);
  assets.set(filename, combined ? await composition(item) : await png(item.photos?.[0] || item));
  return filename;
}

function validateKey(item, keys) {
  assert(typeof item.id === 'string' && item.id.length <= 180 && safeKey.test(item.id), `Invalid key: ${item.id}`);
  assert(!keys.has(item.id), `Duplicate key: ${item.id}`);
  keys.add(item.id);
  assert(typeof item.name === 'string' && item.name.trim() && item.name.length <= 120, `Invalid name: ${item.id}`);
}

const home = await import(await moduleURL(path.join(sourceDirectory, 'features/home/data/catalog.js')));
const menu = await import(await moduleURL(path.join(sourceDirectory, 'features/menu/data/sections.js')));
const categoryKeys = new Set();
const productKeys = new Set();
const categories = [];
const products = [];
for (const category of home.categories) {
  validateKey(category, categoryKeys);
  categories.push({ key: category.id, name: category.menuName || category.name, image: await imageAsset('category', category) });
}

async function addProduct(product, categoryKey, offer) {
  validateKey(product, productKeys);
  assert(categoryKeys.has(categoryKey), `Unknown category for ${product.id}: ${categoryKey}`);
  assert(Number.isSafeInteger(product.priceCents) && product.priceCents > 0 && product.priceCents <= 9_999_999_999, `Invalid price: ${product.id}`);
  products.push({ key: product.id, name: product.name, categoryKey, priceCents: product.priceCents, offer, image: await imageAsset('product', product) });
}

for (const product of home.products) {
  const matches = home.categories.filter((category) => category.productIds.includes(product.id));
  assert.equal(matches.length, 1, `Home product needs exactly one category: ${product.id}`);
  await addProduct(product, matches[0].id, true);
}
for (const [categoryKey, section] of Object.entries(menu.menuSections)) {
  for (const product of section.products) await addProduct(product, categoryKey, false);
}
assert.equal(products.length, home.allProducts.length, 'Catalog differs from the storefront product collection');
const manifest = Buffer.from(`${JSON.stringify({ version: 1, categories, products }, null, 2)}\n`);
const outputs = new Map([[path.join(catalogDirectory, 'catalog.json'), manifest]]);
for (const [filename, bytes] of assets) outputs.set(path.join(imageDirectory, filename), bytes);

if (checkOnly) {
  for (const [filename, expected] of outputs) {
    const actual = await readFile(filename);
    assert(actual.equals(expected), `Catalog parity failed: ${path.relative(catalogDirectory, filename)}. Run node backend/catalog/build-catalog.mjs to regenerate.`);
  }
  const actualNames = (await readdir(imageDirectory)).sort();
  assert.deepEqual(actualNames, [...assets.keys()].sort(), 'Unexpected/missing catalog images');
} else {
  await mkdir(imageDirectory, { recursive: true });
  for (const [filename, bytes] of outputs) await writeFile(filename, bytes);
}
const counts = Object.fromEntries(categories.map((category) => [category.key, products.filter((product) => product.categoryKey === category.key).length]));
console.log(`${checkOnly ? 'Verified' : 'Generated'} ${categories.length} categories, ${products.length} products (${products.filter((product) => product.offer).length} offers), ${assets.size} images. ${JSON.stringify(counts)}`);
