import { test, expect } from '@playwright/test'
import { mockCatalog, mockLiveCatalog, seedCatalog, signInAsCatalogAdmin, transparentPng } from './fixtures/catalog.js'

const cartKey = 'dev-burguer-cesta'
const favoritesKey = 'dev-burguer-favoritos'
const upload = name => ({ name, mimeType: 'image/png', buffer: transparentPng })

async function openCategory(page, id, slug) {
  const card = page.locator(`[data-category="${id}"]`)
  await card.focus()
  await card.click()
  await expect(page).toHaveURL(new RegExp(`/cardapio/${slug}$`))
}

async function openStore(page) {
  await page.getByRole('link', { name: 'Ver loja', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'CATEGORIAS', exact: true })).toBeVisible()
}

test('admin offer checkbox adds the product to home and unchecking the last offer leaves an empty offers section', async ({ page }) => {
  const catalog = seedCatalog()
  catalog.products.forEach(product => { product.offer = false })
  const api = await mockLiveCatalog(page, { catalog })
  await signInAsCatalogAdmin(page)
  const offer = page.getByLabel('Oferta de X-Tudo especial da casa', { exact: true })
  await expect(offer).not.toBeChecked()
  // This controlled checkbox changes only after the API acknowledges the write.
  await offer.click()
  await expect(offer).toBeChecked()
  await expect.poll(() => api.catalog.products[0].offer).toBe(true)
  await openStore(page)
  await expect(page.locator('.product')).toHaveCount(1)
  await expect(page.locator('.product[data-id="burger"]')).toContainText('X-Tudo especial da casa')
  await expect(page.locator('.product[data-id="burger"]')).toContainText('35,90')
  await page.reload()
  await expect(page.locator('.product[data-id="burger"]')).toBeVisible()

  await page.goto('/admin/produtos')
  await offer.click()
  await expect(offer).not.toBeChecked()
  await expect.poll(() => api.catalog.products[0].offer).toBe(false)
  await openStore(page)
  await expect(page.getByText('Nenhum produto em oferta no momento.', { exact: true })).toBeVisible()
  await expect(page.locator('.product')).toHaveCount(0)
  await expect(page.locator('#offers-previous')).toBeDisabled()
  await expect(page.locator('#offers-next')).toBeDisabled()
  await expect(page.locator('[data-category]')).toHaveCount(4)
  expect(api.writes.filter(write => write.path === '/products/1').map(write => write.data.offer)).toEqual([true, false])
  expect(api.writes.every(write => write.authorization === 'Bearer test-only-catalog-token')).toBe(true)
  expect(api.requests.every(request => request.authorization === undefined)).toBe(true)
})

test('failed offer writes preserve both the checkbox and the public catalog', async ({ page }) => {
  const api = await mockLiveCatalog(page)
  await signInAsCatalogAdmin(page)
  api.failWrite = true
  const offer = page.getByLabel('Oferta de X-Tudo especial da casa', { exact: true })
  await offer.click()
  await expect(page.getByRole('alert')).toContainText('Falha simulada ao salvar')
  await expect(offer).toBeChecked()
  expect(api.catalog.products[0].offer).toBe(true)
  await openStore(page)
  await expect(page.locator('.product[data-id="burger"]')).toBeVisible()
  await expect(page.locator('.product')).toHaveCount(4)
})

test('a new category appears on home, opens its API slug, receives a new product and reflects a category move', async ({ page }) => {
  const api = await mockLiveCatalog(page)
  await signInAsCatalogAdmin(page, '/admin/categorias/novo')
  await page.getByLabel('Nome', { exact: true }).fill('Combos da casa')
  await page.getByLabel('Descrição', { exact: true }).fill('Combinações completas para compartilhar.')
  await page.getByLabel('Imagem da categoria', { exact: true }).setInputFiles(upload('combos.png'))
  await page.getByRole('button', { name: 'Adicionar categoria', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/categorias$/)
  await expect(page.getByRole('row').filter({ hasText: 'Combos da casa' })).toContainText('Combinações completas para compartilhar.')
  const categoryWrite = api.writes.find(write => write.method === 'POST' && write.path === '/categories')
  expect(categoryWrite).toMatchObject({ authorization: 'Bearer test-only-catalog-token', data: {
    name: 'Combos da casa', description: 'Combinações completas para compartilhar.', file: 'combos.png',
  } })
  const category = api.catalog.categories.at(-1)
  await openStore(page)
  await expect(page.locator('[data-category]')).toHaveCount(5)
  await expect(page.locator(`[data-category="category-${category.id}"]`)).toContainText(category.description)
  await openCategory(page, `category-${category.id}`, category.slug)
  await expect(page.locator('.menu-heading')).toHaveText('CARDÁPIO - COMBOS DA CASA')
  await expect(page.getByText('Nenhum produto cadastrado nesta categoria.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(new RegExp(`/cardapio/${category.slug}$`))
  await expect(page.locator('.menu-heading')).toHaveText('CARDÁPIO - COMBOS DA CASA')

  await page.goto('/admin/produtos/novo')
  await page.getByLabel('Nome', { exact: true }).fill('Combo Compartilhar')
  await page.getByLabel('Descrição', { exact: true }).fill('Dois hambúrgueres e uma porção de batatas.')
  await page.getByLabel('Preço', { exact: true }).fill('49,90')
  await page.getByLabel('Categoria', { exact: true }).selectOption(String(category.id))
  await page.getByLabel('Imagem do produto', { exact: true }).setInputFiles(upload('combo.png'))
  await page.getByRole('button', { name: 'Adicionar produto', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/produtos$/)
  const product = api.catalog.products.at(-1)
  expect(api.writes.find(write => write.method === 'POST' && write.path === '/products').data).toMatchObject({
    name: 'Combo Compartilhar', description: 'Dois hambúrgueres e uma porção de batatas.', price: '49.90', category_id: String(category.id), file: 'combo.png',
  })
  await openStore(page)
  await openCategory(page, `category-${category.id}`, category.slug)
  const productCard = page.locator(`.menu-product[data-id="product-${product.id}"]`)
  await expect(productCard).toContainText('Combo Compartilhar')
  await expect(productCard).toContainText('Dois hambúrgueres e uma porção de batatas.')
  await expect(productCard.locator('.menu-price')).toContainText('49,90')
  await expect(page.locator('.menu-product')).toHaveCount(1)

  await page.goto(`/admin/produtos/${product.id}/editar`)
  await page.getByLabel('Categoria', { exact: true }).selectOption('1')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/produtos$/)
  await openStore(page)
  await openCategory(page, `category-${category.id}`, category.slug)
  await expect(page.locator('.menu-product')).toHaveCount(0)
  await expect(page.getByText('Nenhum produto cadastrado nesta categoria.', { exact: true })).toBeVisible()
  await page.goto('/cardapio/hamburgueres')
  await expect(productCard).toContainText('Combo Compartilhar')
  await expect(page.locator('.menu-product')).toHaveCount(12)
})

test('category editing keeps its route and publishes the saved name and description', async ({ page }) => {
  const api = await mockLiveCatalog(page)
  await signInAsCatalogAdmin(page, '/admin/categorias/2/editar')
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Bebidas')
  await page.getByLabel('Nome', { exact: true }).fill('Bebidas geladas')
  await page.getByLabel('Descrição', { exact: true }).fill('Sucos e refrigerantes para acompanhar.')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/categorias$/)
  const saved = api.writes.find(write => write.path === '/categories/2')
  expect(saved.data).toEqual({ name: 'Bebidas geladas', description: 'Sucos e refrigerantes para acompanhar.' })
  await openStore(page)
  await expect(page.locator('[data-category="drinks"]')).toContainText('Bebidas geladas')
  await expect(page.locator('[data-category="drinks"]')).toContainText('Sucos e refrigerantes para acompanhar.')
  await openCategory(page, 'drinks', 'bebidas')
  await expect(page.locator('.menu-heading')).toHaveText('CARDÁPIO - BEBIDAS GELADAS')
  await expect(page.locator('.menu-product')).toHaveCount(9)
})

test('more than four API categories remain reachable by keyboard on a narrow screen', async ({ page }) => {
  const catalog = seedCatalog()
  for (const id of [5, 6, 7]) catalog.categories.push({ id, name: `Categoria ${id}`, description: `Descrição ${id}`, slug: `nova-${id}`, path: 'category-starters.png' })
  catalog.products.forEach(product => { product.offer = false })
  await mockCatalog(page, { catalog })
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/')
  await expect(page.locator('[data-category]')).toHaveCount(7)
  await page.locator('[data-category="burgers"]').focus()
  for (let index = 0; index < 6; index += 1) await page.keyboard.press('ArrowRight')
  const last = page.locator('[data-category="category-7"]')
  await expect(last).toBeFocused()
  await expect(last).toBeInViewport()
  await expect(page.locator('#categories-next')).toBeDisabled()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/cardapio\/nova-7$/)
  await expect(page.locator('.menu-heading')).toHaveText('CARDÁPIO - CATEGORIA 7')
  await expect(page.getByText('Nenhum produto cadastrado nesta categoria.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('guests read home and category menus through the public API without a JWT', async ({ page }) => {
  const api = await mockCatalog(page)
  await page.goto('/')
  await expect(page.locator('.product')).toHaveCount(4)
  await expect(page.locator('#session-button')).toHaveText('Entrar')
  await openCategory(page, 'drinks', 'bebidas')
  await expect(page.locator('.menu-product')).toHaveCount(9)
  await page.reload()
  await expect(page.locator('.menu-product')).toHaveCount(9)
  expect(api.requests.length).toBeGreaterThanOrEqual(3)
  expect(api.requests.every(request => request.method === 'GET' && request.authorization === undefined)).toBe(true)
  expect(await page.evaluate(() => sessionStorage.getItem('devburger_token'))).toBeNull()
})

for (const path of ['/', '/cardapio/bebidas']) {
  test(`an API error at ${path} shows retry without inventing a static catalog`, async ({ page }) => {
    const api = await mockCatalog(page, { status: 503 })
    await page.goto(path)
    await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o cardápio')
    await expect(page).toHaveURL(new RegExp(path === '/' ? '/$' : '/cardapio/bebidas$'))
    await expect(page.locator('.product, .menu-product, [data-category]')).toHaveCount(0)
    await expect(page.getByText('X-Tudo especial da casa', { exact: true })).toHaveCount(0)
    const requestsBeforeRetry = api.requests.length
    api.status = 200
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.locator(path === '/' ? '.product' : '.menu-product')).toHaveCount(path === '/' ? 4 : 9)
    expect(api.requests.length).toBeGreaterThan(requestsBeforeRetry)
  })
}

test('an empty API snapshot shows empty states and no seeded fallback', async ({ page }) => {
  await mockCatalog(page, { catalog: { categories: [], products: [] } })
  await page.goto('/')
  await expect(page.getByText('Nenhuma categoria disponível no momento.', { exact: true })).toBeVisible()
  await expect(page.getByText('Nenhum produto em oferta no momento.', { exact: true })).toBeVisible()
  await expect(page.locator('.product, [data-category]')).toHaveCount(0)
  await expect(page.locator('#categories-previous')).toBeDisabled()
  await expect(page.locator('#categories-next')).toBeDisabled()
})

test('renamed hamburger category uses the saved name and keeps its existing URL', async ({ page }) => {
  const catalog = seedCatalog()
  catalog.categories[0].name = 'Lanches da casa'
  await mockCatalog(page, { catalog })
  await page.goto('/cardapio/hamburgueres')
  await expect(page.locator('.menu-heading')).toHaveText('LANCHES DA CASA - CARDÁPIO')
  await expect(page.locator('.menu-product')).toHaveCount(11)
})

test('an open storefront refreshes when a catalog change arrives from another tab', async ({ page, context }) => {
  const api = await mockCatalog(page)
  await page.goto('/')
  await expect(page.locator('.product')).toHaveCount(4)
  const other = await context.newPage()
  await other.goto('/login')
  await page.bringToFront()
  api.catalog.products.forEach(product => { product.offer = product.sourceKey === 'drink-cola' })
  await other.evaluate(() => localStorage.setItem('devburger-catalog-revision', String(Date.now())))
  await expect(page.locator('.product')).toHaveCount(1)
  await expect(page.locator('.product[data-id="drink-cola"]')).toContainText('5,90')
  await other.close()
})

test('pending and failed catalog reads preserve saved cart and favorites until successful hydration', async ({ page }) => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  const api = await mockCatalog(page, { waitForResponse: pending, status: 503 })
  await page.goto('/login')
  const savedCart = { burger: 2, 'drink-cola': 1 }
  const savedFavorites = ['drink-cola']
  await page.evaluate(({ cartKey, favoritesKey, savedCart, savedFavorites }) => {
    localStorage.setItem(cartKey, JSON.stringify(savedCart))
    localStorage.setItem(favoritesKey, JSON.stringify(savedFavorites))
  }, { cartKey, favoritesKey, savedCart, savedFavorites })
  const savedState = () => page.evaluate(({ cartKey, favoritesKey }) => ({
    cart: JSON.parse(localStorage.getItem(cartKey)), favorites: JSON.parse(localStorage.getItem(favoritesKey)),
  }), { cartKey, favoritesKey })
  await page.goto('/cardapio/bebidas')
  await expect(page.getByRole('status')).toContainText('Carregando cardápio')
  await expect(page).toHaveURL(/\/cardapio\/bebidas$/)
  expect(await savedState()).toEqual({ cart: savedCart, favorites: savedFavorites })
  release()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await savedState()).toEqual({ cart: savedCart, favorites: savedFavorites })
  api.waitForResponse = null
  api.status = 200
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.locator('.menu-product[data-id="drink-cola"] .menu-favorite')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-items .cart-item')).toHaveCount(2)
  await expect(page.locator('#cart-total')).toContainText('77,70')
  await expect.poll(savedState).toEqual({ cart: savedCart, favorites: savedFavorites })
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator('.menu-product[data-id="drink-cola"] .menu-favorite')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('77,70')
})
