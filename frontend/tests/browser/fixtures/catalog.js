import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const seed = JSON.parse(readFileSync(new URL('../../../../backend/catalog/catalog.json', import.meta.url), 'utf8'))
const imageDirectory = new URL('../../../../backend/catalog/images/', import.meta.url)

export const adminUser = { id: 'admin-catalog', name: 'Admin Catálogo', email: 'catalog@example.com', admin: true }
export const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFWQAAAAASUVORK5CYII=', 'base64')

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** The same 40 products and four categories imported into the real database. */
export function seedCatalog() {
  const categories = seed.categories.map((category, index) => ({
    id: index + 1,
    sourceKey: category.key,
    slug: category.slug || slugify(category.name),
    name: category.name,
    description: category.description || '',
    path: category.image,
    url: `/api/category-file/${category.image}`,
  }))
  return {
    categories,
    products: seed.products.map((product, index) => ({
      id: index + 1,
      sourceKey: product.key,
      name: product.name,
      description: product.description || '',
      price: (product.priceCents / 100).toFixed(2),
      offer: product.offer,
      category_id: categories.find(category => category.sourceKey === product.categoryKey).id,
      path: product.image,
      url: `/api/product-file/${product.image}`,
    })),
  }
}

export function categoryProducts(sourceKey) {
  const catalog = seedCatalog()
  const category = catalog.categories.find(item => item.sourceKey === sourceKey)
  return catalog.products.filter(product => product.category_id === category.id)
}

/** Serve actual PNG/SVG assets so layout tests still exercise intrinsic sizes. */
export async function mockCatalogAssets(page) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
  await page.route(/\/(?:api\/)?(?:product|category)-file\//, async route => {
    const filename = new URL(route.request().url()).pathname.split('/').pop()
    if (!seed.categories.some(item => item.image === filename) && !seed.products.some(item => item.image === filename)) {
      return ['uploaded-category.png', 'uploaded-product.png'].includes(filename)
        ? route.fulfill({ contentType: 'image/png', body: transparentPng })
        : route.fulfill({ status: 404, body: 'Imagem não encontrada na fixture' })
    }
    return route.fulfill({ path: fileURLToPath(new URL(filename, imageDirectory)) })
  })
}

/** Mutable response state lets tests exercise failures and delayed hydration. */
export async function mockCatalog(page, options = {}) {
  const state = { catalog: seedCatalog(), status: 200, requests: [], waitForResponse: null, ...options }
  await mockCatalogAssets(page)
  await page.route('**/api/catalog', async route => {
    state.requests.push({ method: route.request().method(), authorization: route.request().headers().authorization })
    if (state.waitForResponse) await state.waitForResponse
    await route.fulfill({ status: state.status, json: state.status === 200 ? state.catalog : { error: 'Catálogo temporariamente indisponível' } })
  })
  return state
}

function requestPayload(request) {
  if ((request.headers()['content-type'] || '').includes('application/json')) return request.postDataJSON()
  const body = request.postDataBuffer()?.toString('utf8') || ''
  return Object.fromEntries([...body.matchAll(/name="([^"]+)"(?:; filename="([^"]*)")?\r\n(?:Content-Type:[^\r]+\r\n)?\r\n([^]*?)\r\n--/g)]
    .map(([, name, filename, value]) => [name, filename ?? value]))
}

/** Admin mutations and the public snapshot share state, as on the real API. */
export async function mockLiveCatalog(page, options = {}) {
  const state = await mockCatalog(page, options)
  state.writes = []
  state.failWrite = false
  const withCategory = product => ({ ...product, category: state.catalog.categories.find(category => category.id === product.category_id) })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const method = request.method()
    const respond = (json, status = 200) => route.fulfill({ status, json })
    if (path === '/catalog' || /^\/(?:product|category)-file\//.test(path)) return route.fallback()
    if (path === '/admin/session') return respond(adminUser)
    if (path === '/orders' && method === 'GET') return respond([])
    if (!['GET', 'HEAD'].includes(method)) {
      state.writes.push({ path, method, data: requestPayload(request), authorization: request.headers().authorization })
      if (state.failWrite) return respond({ error: 'Falha simulada ao salvar' }, 500)
    }
    if (path === '/categories' && method === 'GET') return respond(state.catalog.categories)
    if (path === '/categories' && method === 'POST') {
      const data = requestPayload(request)
      const category = {
        id: Math.max(0, ...state.catalog.categories.map(item => item.id)) + 1,
        name: data.name,
        description: data.description || '',
        slug: `${slugify(data.name)}-11111111-1111-4111-8111-111111111111`,
        path: 'uploaded-category.png',
        url: '/api/category-file/uploaded-category.png',
      }
      state.catalog.categories.push(category)
      return respond(category, 201)
    }
    const categoryMatch = path.match(/^\/categories\/(\d+)$/)
    if (categoryMatch) {
      const category = state.catalog.categories.find(item => item.id === Number(categoryMatch[1]))
      if (!category) return respond({ error: 'Categoria não encontrada' }, 404)
      if (method === 'GET') return respond(category)
      if (method === 'PUT') {
        const { file, ...data } = requestPayload(request)
        Object.assign(category, data)
        if (file) Object.assign(category, { path: 'uploaded-category.png', url: '/api/category-file/uploaded-category.png' })
        return respond(category)
      }
    }
    if (path === '/products' && method === 'GET') return respond(state.catalog.products.map(withCategory))
    if (path === '/products' && method === 'POST') {
      const data = requestPayload(request)
      const product = {
        id: Math.max(0, ...state.catalog.products.map(item => item.id)) + 1,
        name: data.name,
        description: data.description || '',
        price: String(data.price),
        category_id: Number(data.category_id),
        offer: data.offer === true || data.offer === 'true',
        path: 'uploaded-product.png',
        url: '/api/product-file/uploaded-product.png',
      }
      state.catalog.products.push(product)
      return respond(withCategory(product), 201)
    }
    const productMatch = path.match(/^\/products\/(\d+)$/)
    if (productMatch) {
      const product = state.catalog.products.find(item => item.id === Number(productMatch[1]))
      if (!product) return respond({ error: 'Produto não encontrado' }, 404)
      if (method === 'GET') return respond(withCategory(product))
      if (method === 'PUT') {
        const { file, ...data } = requestPayload(request)
        Object.assign(product, data)
        if ('offer' in data) product.offer = data.offer === true || data.offer === 'true'
        if ('category_id' in data) product.category_id = Number(data.category_id)
        if (file) Object.assign(product, { path: 'uploaded-product.png', url: '/api/product-file/uploaded-product.png' })
        return respond(withCategory(product))
      }
      if (method === 'DELETE') {
        state.catalog.products = state.catalog.products.filter(item => item.id !== product.id)
        return route.fulfill({ status: 204 })
      }
    }
    return respond({ error: `Endpoint de teste não previsto: ${method} ${path}` }, 404)
  })
  return state
}

export async function signInAsCatalogAdmin(page, path = '/admin/produtos') {
  await page.goto('/login')
  await page.evaluate(user => {
    sessionStorage.setItem('devburger_token', 'test-only-catalog-token')
    sessionStorage.setItem('devburger_user', JSON.stringify(user))
  }, adminUser)
  await page.goto(path)
}
