import { test, expect } from '@playwright/test'
import { mockCatalog } from './fixtures/catalog.js'

const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFWQAAAAASUVORK5CYII=', 'base64')
const admin = { id: 'admin-1', name: 'Admin Teste', email: 'admin@example.com', admin: true }
const client = { id: 'client-1', name: 'Cliente Teste', email: 'cliente@example.com', admin: false }
const initialProducts = [
  { id: 1, name: 'X-Tudo', price: '29.90', offer: false, path: 'burger.png', url: '/product-file/burger.png', category_id: 1, category: { id: 1, name: 'Hambúrgueres' } },
  { id: 2, name: 'Coca-Cola', price: '8.00', offer: true, path: 'cola.png', url: '/product-file/cola.png', category_id: 2, category: { id: 2, name: 'Bebidas' } },
]
const initialOrders = [
  { id: '11111111-1111-4111-8111-111111111111', user: { id: 'customer-1', name: 'Rodolfo Mori' }, products: [{ id: 1, name: 'X-Tudo', price: '29.90', quantity: 2 }], status: 'Em preparação', created_at: '2026-11-08T10:00:00.000Z' },
  { id: '22222222-2222-4222-8222-222222222222', user: { id: 'customer-2', name: 'Ana Silva' }, products: [{ id: 2, name: 'Coca-Cola', price: '8.00', quantity: 1 }], status: 'Entregue', created_at: '2026-11-08T09:00:00.000Z' },
]

function payload(request) {
  if ((request.headers()['content-type'] || '').includes('application/json')) return request.postDataJSON()
  const body = request.postDataBuffer()?.toString('utf8') || ''
  return Object.fromEntries([...body.matchAll(/name="([^"]+)"(?:; filename="([^"]*)")?\r\n(?:Content-Type:[^\r]+\r\n)?\r\n([^]*?)\r\n--/g)]
    .map(([, name, filename, value]) => [name, filename ?? value]))
}

async function mockAdminApi(page, options = {}) {
  await mockCatalog(page)
  const state = {
    products: structuredClone(initialProducts),
    orders: structuredClone(initialOrders),
    writes: [],
    sessionCalls: 0,
    failWrite: false,
    ...options,
  }
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
  await page.route('**/product-file/**', route => route.fulfill({ contentType: 'image/png', body: transparentPng }))
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const method = request.method()
    const respond = (data, status = 200) => route.fulfill({ status, json: data })
    if (path === '/catalog' || path.startsWith('/category-file/')) return route.fallback()
    if (path.startsWith('/product-file/')) return route.fulfill({ contentType: 'image/png', body: transparentPng })
    if (path === '/login' && method === 'POST') return respond({ ...(state.loginUser || admin), token: 'test-only-admin-token' })
    if (path === '/admin/session') {
      state.sessionCalls += 1
      if (state.sessionStatus) return respond({ message: 'Acesso restrito' }, state.sessionStatus)
      return respond(admin)
    }
    if (path === '/categories') return respond([{ id: 1, name: 'Hambúrgueres' }, { id: 2, name: 'Bebidas' }])
    if (!['GET', 'HEAD'].includes(method)) {
      const data = payload(request)
      state.writes.push({ path, method, data, authorization: request.headers().authorization })
      if (state.failWrite) return respond({ error: 'Falha simulada ao salvar' }, 500)
    }
    if (path === '/products' && method === 'GET') {
      if (state.failProducts) return respond({ error: 'Falha simulada ao carregar produtos' }, 500)
      return respond(state.products)
    }
    if (path === '/products' && method === 'POST') {
      const data = payload(request)
      const product = { ...data, id: 3, price: String(data.price), offer: data.offer === true || data.offer === 'true', category_id: Number(data.category_id), path: 'new-product.png', url: '/product-file/new-product.png' }
      product.category = { id: product.category_id, name: product.category_id === 1 ? 'Hambúrgueres' : 'Bebidas' }
      state.products.push(product)
      return respond(product, 201)
    }
    const productMatch = path.match(/^\/products\/(\d+)$/)
    if (productMatch) {
      const product = state.products.find(value => value.id === Number(productMatch[1]))
      if (!product) return respond({ message: 'Produto não encontrado' }, 404)
      if (method === 'GET') return respond(product)
      if (method === 'DELETE') {
        state.products = state.products.filter(value => value.id !== product.id)
        return route.fulfill({ status: 204 })
      }
      if (method === 'PUT') {
        const data = payload(request)
        Object.assign(product, data)
        if ('offer' in data) product.offer = data.offer === true || data.offer === 'true'
        if ('category_id' in data) product.category_id = Number(data.category_id)
        return respond(product)
      }
    }
    if (path === '/orders' && method === 'GET') return respond(state.orders)
    const orderMatch = path.match(/^\/orders\/([^/]+)$/)
    if (orderMatch && method === 'PUT') {
      const order = state.orders.find(value => value.id === orderMatch[1])
      if (!order) return respond({ message: 'Pedido não encontrado' }, 404)
      order.status = payload(request).status
      return respond({ message: 'Status atualizado com sucesso' })
    }
    return respond({ message: 'Endpoint de teste não previsto: ' + method + ' ' + path }, 404)
  })
  return state
}

async function authenticate(page, user = admin, path = '/admin/pedidos') {
  await page.goto('/')
  await page.evaluate(value => {
    sessionStorage.setItem('devburger_token', 'test-only-admin-token')
    sessionStorage.setItem('devburger_user', JSON.stringify(value))
  }, user)
  await page.goto(path)
}

function productRow(page, name) {
  return page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) })
}

async function orderTab(page, name) {
  await page.getByRole('tab', { name, exact: true }).or(page.getByRole('button', { name, exact: true })).click()
}

for (const user of [admin, client]) {
  test(`login routes ${user.admin ? 'administrators to the dashboard' : 'customers to the home'}`, async ({ page }) => {
    await mockAdminApi(page, { loginUser: user })
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Senha', { exact: true }).fill('test-password')
    await page.getByRole('button', { name: 'ENTRAR', exact: true }).click()
    await expect(page).toHaveURL(user.admin ? /\/admin\/pedidos$/ : /\/$/)
    if (user.admin) await expect(page.getByText('Rodolfo Mori', { exact: true })).toBeVisible()
    else await expect(page.getByRole('heading', { name: 'OFERTAS DO DIA', exact: true })).toBeVisible()
  })
}

test('anonymous visitors and customers cannot open any dashboard route', async ({ page }) => {
  const api = await mockAdminApi(page)
  await page.goto('/admin/produtos/novo')
  await expect(page).toHaveURL(/\/login$/)
  for (const path of ['/admin/pedidos', '/admin/produtos', '/admin/produtos/novo', '/admin/produtos/1/editar']) {
    await authenticate(page, client, path)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'OFERTAS DO DIA', exact: true })).toBeVisible()
  }
  expect(api.sessionCalls).toBe(0)
  expect(api.writes).toEqual([])
})

test('a locally forged admin flag does not bypass the server admin check', async ({ page }) => {
  const api = await mockAdminApi(page, { sessionStatus: 403 })
  await authenticate(page)
  await expect(page.getByText(/Acesso restrito/).first()).toBeVisible()
  await expect(page.getByText('Rodolfo Mori', { exact: true })).toHaveCount(0)
  expect(api.sessionCalls).toBeGreaterThan(0)
  expect(api.writes).toEqual([])
})

test('an expired admin session returns to login', async ({ page }) => {
  await mockAdminApi(page, { sessionStatus: 401 })
  await authenticate(page)
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('devburger_token'))).toBeNull()
})

test('product creation uploads an image and sends reais, category and offer to the API', async ({ page }) => {
  const api = await mockAdminApi(page)
  await authenticate(page, admin, '/admin/produtos/novo')
  await page.getByLabel('Nome', { exact: true }).fill('Combo Nuggets')
  await page.getByLabel('Preço', { exact: true }).fill('29,90')
  await page.getByLabel('Categoria', { exact: true }).selectOption('1')
  await page.getByLabel('Imagem do produto', { exact: true }).setInputFiles({ name: 'produto.png', mimeType: 'image/png', buffer: transparentPng })
  await page.getByLabel('Produto em oferta', { exact: true }).check()
  await page.getByRole('button', { name: 'Adicionar produto', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/produtos$/)
  await expect(productRow(page, 'Combo Nuggets')).toBeVisible()
  const saved = api.writes.find(write => write.method === 'POST' && write.path === '/products')
  expect(saved).toBeTruthy()
  expect(saved.authorization).toBe('Bearer test-only-admin-token')
  expect(saved.data).toMatchObject({ name: 'Combo Nuggets', price: '29.90', category_id: '1', offer: 'true', file: 'produto.png' })
  await expect(productRow(page, 'Combo Nuggets')).toContainText('29,90')
})

test('products can be searched, edited without replacing the image, offered and deleted with confirmation', async ({ page }) => {
  const api = await mockAdminApi(page)
  await authenticate(page, admin, '/admin/produtos')
  const search = page.getByPlaceholder('Pesquisar produto', { exact: true })
  await search.fill('x-tudo')
  await expect(productRow(page, 'X-Tudo')).toBeVisible()
  await expect(productRow(page, 'Coca-Cola')).toHaveCount(0)
  await search.fill('')
  await page.getByRole('link', { name: 'Editar X-Tudo', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/produtos\/1\/editar$/)
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('X-Tudo')
  await page.getByLabel('Nome', { exact: true }).fill('X-Tudo Especial')
  await page.getByLabel('Preço', { exact: true }).fill('32,50')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/produtos$/)
  await expect(productRow(page, 'X-Tudo Especial')).toContainText('32,50')
  const update = api.writes.find(write => write.method === 'PUT' && write.path === '/products/1')
  expect(update.data).toMatchObject({ name: 'X-Tudo Especial', price: '32.50' })
  expect(update.data).not.toHaveProperty('file')
  await page.getByLabel('Oferta de X-Tudo Especial', { exact: true }).click()
  await expect(page.getByLabel('Oferta de X-Tudo Especial', { exact: true })).toBeChecked()
  await page.reload()
  await expect(page.getByLabel('Oferta de X-Tudo Especial', { exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Excluir X-Tudo Especial', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Excluir produto', exact: true })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(api.writes.filter(write => write.method === 'DELETE')).toHaveLength(0)
  await expect(productRow(page, 'X-Tudo Especial')).toBeVisible()
  await page.getByRole('button', { name: 'Excluir X-Tudo Especial', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Excluir produto', exact: true }).click()
  await expect(productRow(page, 'X-Tudo Especial')).toHaveCount(0)
  expect(api.writes.filter(write => write.method === 'DELETE' && write.path === '/products/1')).toHaveLength(1)
  await page.reload()
  await expect(productRow(page, 'X-Tudo Especial')).toHaveCount(0)
})

test('failed product writes keep the current data and show an error', async ({ page }) => {
  const api = await mockAdminApi(page)
  await authenticate(page, admin, '/admin/produtos')
  api.failWrite = true
  const offer = page.getByLabel('Oferta de X-Tudo', { exact: true })
  await offer.click()
  await expect(page.getByRole('alert')).toContainText('Falha simulada ao salvar')
  await expect(offer).not.toBeChecked()
  expect(api.products[0].offer).toBe(false)
  await page.getByRole('link', { name: 'Editar X-Tudo', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Nome não salvo')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Falha simulada ao salvar')
  await expect(page).toHaveURL(/\/admin\/produtos\/1\/editar$/)
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Nome não salvo')
  expect(api.products[0].name).toBe('X-Tudo')
})

test('order status updates persist through reload, filter delivered orders and recover after errors', async ({ page }) => {
  const api = await mockAdminApi(page)
  await authenticate(page)
  const status = page.getByLabel('Status do pedido ' + initialOrders[0].id, { exact: true })
  await expect(status).toHaveValue('Em preparação')
  await orderTab(page, 'Em preparo')
  await expect(page.getByText('Rodolfo Mori', { exact: true })).toBeVisible()
  await expect(page.getByText('Ana Silva', { exact: true })).toHaveCount(0)
  await status.selectOption('Pronto')
  await expect(status).toHaveValue('Pronto')
  api.failWrite = true
  await status.selectOption('A caminho')
  await expect(page.getByRole('alert')).toContainText('Falha simulada ao salvar')
  await expect(status).toHaveValue('Pronto')
  api.failWrite = false
  await status.selectOption('Entregue')
  await expect(page.getByText('Rodolfo Mori', { exact: true })).toHaveCount(0)
  await orderTab(page, 'Entregues')
  await expect(page.getByText('Rodolfo Mori', { exact: true })).toBeVisible()
  await expect(page.getByText('Ana Silva', { exact: true })).toBeVisible()
  await page.reload()
  await expect(status).toHaveValue('Entregue')
  expect(api.orders[0].status).toBe('Entregue')
})

test('admin pages remain usable without document overflow on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await mockAdminApi(page)
  await authenticate(page)
  for (const path of ['/admin/pedidos', '/admin/produtos', '/admin/produtos/novo', '/admin/produtos/1/editar']) {
    await page.goto(path)
    await expect(page.getByRole('link', { name: 'Pedidos', exact: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
})


test('invalid product fields and unsupported images cannot submit a product', async ({ page }) => {
  const api = await mockAdminApi(page)
  await authenticate(page, admin, '/admin/produtos/novo')
  await page.getByRole('button', { name: 'Adicionar produto', exact: true }).click()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Nome', { exact: true }).fill('Produto de teste')
  await page.getByLabel('Preço', { exact: true }).fill('1,234')
  await page.getByLabel('Categoria', { exact: true }).selectOption('1')
  await page.getByLabel('Imagem do produto', { exact: true }).setInputFiles({ name: 'imagem.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await page.getByRole('button', { name: 'Adicionar produto', exact: true }).click()
  await expect(page.getByLabel('Preço', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Escolha uma imagem PNG, JPG ou WebP.', { exact: true })).toBeVisible()
  expect(api.writes).toEqual([])
})

test('failed deletion retains the product and allows canceling the confirmation', async ({ page }) => {
  const api = await mockAdminApi(page)
  await authenticate(page, admin, '/admin/produtos')
  api.failWrite = true
  await page.getByRole('button', { name: 'Excluir X-Tudo', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Excluir produto', exact: true })
  await dialog.getByRole('button', { name: 'Excluir produto', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Falha simulada ao salvar')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(productRow(page, 'X-Tudo')).toBeVisible()
  expect(api.products).toHaveLength(2)
})

test('a failed product list can be retried and signing out removes dashboard access', async ({ page }) => {
  const api = await mockAdminApi(page, { failProducts: true })
  await authenticate(page, admin, '/admin/produtos')
  await expect(page.getByRole('alert')).toContainText('Falha simulada ao carregar produtos')
  api.failProducts = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(productRow(page, 'X-Tudo')).toBeVisible()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('devburger_token'))).toBeNull()
  await page.goto('/admin/produtos')
  await expect(page).toHaveURL(/\/login$/)
})
