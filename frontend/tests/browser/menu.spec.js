import { test, expect } from '@playwright/test'
import { mockCatalog, categoryProducts } from './fixtures/catalog.js'

test.beforeEach(async ({ page }) => {
  await mockCatalog(page)
})

const categories = [
  { id: 'burgers', slug: 'hamburgueres', title: 'HAMBÚRGUERES' },
  { id: 'drinks', slug: 'bebidas', title: 'BEBIDAS' },
  { id: 'desserts', slug: 'sobremesas', title: 'SOBREMESAS' },
  { id: 'starters', slug: 'entradas', title: 'ENTRADAS' },
]

async function openBurgersFromHome(page) {
  const category = page.locator('[data-category="burgers"]')
  await category.focus()
  await category.click()
  await expect(page).toHaveURL(/\/cardapio\/hamburgueres$/)
}

async function returnHome(page) {
  await page.locator('.navigation').getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
}

for (const category of categories) {
  test(`home opens ${category.slug}, which also loads directly and returns home`, async ({ page }) => {
    await page.goto('/')
    const button = page.locator(`[data-category="${category.id}"]`)
    await button.focus()
    await button.click()
    await expect(page).toHaveURL(new RegExp('/cardapio/' + category.slug + '$'))
    await expect(page.locator('.menu-heading')).toContainText(category.title)
    await page.reload()
    await expect(page.locator('.menu-heading')).toContainText(category.title)
    await expect(page.locator('.menu-product')).toHaveCount(categoryProducts(category.id).length)
    await page.locator('.menu-back').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'CATEGORIAS', exact: true })).toBeVisible()
    expect(await page.evaluate(() => scrollY)).toBe(0)
  })
}

test('home and menu products keep a single cart across navigation and reload', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-add="waffles"]').click()
  await openBurgersFromHome(page)
  await page.locator('.menu-add[data-add="chicken-burger"]').click()
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('56,80')
  await expect(page.locator('#cart-items .cart-item')).toHaveCount(2)
  await page.keyboard.press('Escape')
  await returnHome(page)
  await page.reload()
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('56,80')
  await expect(page.locator('#cart-items .cart-item')).toHaveCount(2)
})

test('favorites survive leaving the menu and reloading, and can be removed', async ({ page }) => {
  await page.goto('/cardapio/hamburgueres')
  const favorite = page.locator('.menu-product[data-id="chicken-burger"] .menu-favorite')
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await returnHome(page)
  await openBurgersFromHome(page)
  await page.reload()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await favorite.click()
  await page.reload()
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
})

test('cart and favorites survive SPA navigation when localStorage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage disabled for test', 'SecurityError') },
    })
  })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.locator('[data-add="waffles"]').click()
  await openBurgersFromHome(page)
  await page.locator('.menu-add[data-add="chicken-burger"]').click()
  const favorite = page.locator('.menu-product[data-id="chicken-burger"] .menu-favorite')
  await favorite.click()
  await returnHome(page)
  await openBurgersFromHome(page)
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('56,80')
  expect(errors).toEqual([])
})

test('menu entry point and unknown category redirect to their intended destinations', async ({ page }) => {
  await page.goto('/cardapio')
  await expect(page).toHaveURL(/\/cardapio\/hamburgueres$/)
  await expect(page.locator('.menu-product')).toHaveCount(11)
  await page.goto('/cardapio/categoria-inexistente')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'CATEGORIAS', exact: true })).toBeVisible()
})

test('menu renders the supplied local photos and keeps authentication connected', async ({ page }) => {
  // Existing auth styles import Google Fonts globally. Stub that external CSS
  // so this test can check local menu assets and React errors without internet.
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const checkConsole = message => {
    if (message.type() === 'error') errors.push(message.text())
  }
  page.on('console', checkConsole)
  await page.goto('/cardapio/hamburgueres')
  await expect(page.locator('.menu-price')).toHaveCount(11)
  for (const product of categoryProducts('burgers')) {
    await expect(page.locator(`.menu-product[data-id="${product.sourceKey}"] .menu-price`)).toContainText(Number(product.price).toFixed(2).replace('.', ','))
  }
  expect(await page.locator('.menu-hero img, .menu-photo-box img').evaluateAll(images =>
    images.every(image => image.complete && image.naturalWidth > 0 && new URL(image.src).origin === location.origin),
  )).toBe(true)
  expect(errors).toEqual([])
  await page.locator('#session-button').click()
  await expect(page).toHaveURL(/\/login$/)
  await page.evaluate(() => {
    sessionStorage.setItem('devburger_token', 'test-only-token')
    sessionStorage.setItem('devburger_user', JSON.stringify({ id: 1, name: 'Rodolfo Silva' }))
  })
  await page.goto('/cardapio/hamburgueres')
  await expect(page.locator('#account-greeting')).toHaveText('Olá, Rodolfo')
  await page.locator('#session-button').click()
  await expect(page.locator('#session-button')).toHaveText('Entrar')
  expect(errors).toEqual([])
})

for (const width of [320, 375, 1440, 1920, 3840]) {
  test(`menu banner fills ${width}px without distortion or enlarged product photos`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/cardapio/hamburgueres')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.menu-product')).toHaveCount(11)
    const layout = await page.evaluate(() => {
      const desktop = document.querySelector('.desktop').getBoundingClientRect()
      const images = [...document.querySelectorAll('.dev-burguer-app img')]
      const banner = document.querySelector('.menu-hero-photo').getBoundingClientRect()
      return {
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        x: desktop.x,
        contentWidth: desktop.width,
        bannerX: banner.x,
        bannerWidth: banner.width,
        bannerRatio: banner.width / banner.height,
        broken: images.filter(image => !image.complete || !image.naturalWidth).map(image => image.alt),
        enlarged: images.filter(image => !image.classList.contains('menu-hero-photo')).filter(image => {
          const bounds = image.getBoundingClientRect()
          return Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight) > 1.005
        }).map(image => image.alt),
      }
    })
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width)
    expect(layout.x).toBe(0)
    expect(layout.contentWidth).toBe(layout.width)
    expect(layout.bannerX).toBe(0)
    expect(layout.bannerWidth).toBe(layout.width)
    expect(layout.bannerRatio).toBeCloseTo(1440 / 415, 2)
    expect(layout.broken).toEqual([])
    expect(layout.enlarged).toEqual([])
  })
}
