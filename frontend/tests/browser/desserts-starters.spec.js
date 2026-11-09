import { test, expect } from '@playwright/test'
import { mockCatalog, categoryProducts } from './fixtures/catalog.js'

test.beforeEach(async ({ page }) => {
  await mockCatalog(page)
})

const categories = [
  {
    slug: 'sobremesas',
    id: 'desserts',
    title: 'CARDÁPIO - SOBREMESAS',
    products: [
      { id: 'dessert-cakes', name: 'Bolos', price: '15,00' },
      { id: 'dessert-ice-cream', name: 'Sorvetes', price: '15,90' },
      { id: 'dessert-pudding', name: 'Pudins', price: '9,00' },
      { id: 'dessert-mousse', name: 'Mousses', price: '14,90' },
      { id: 'dessert-gelatin', name: 'Gelatinas', price: '5,00' },
      { id: 'dessert-pies', name: 'Tortas', price: '23,90' },
      { id: 'dessert-traditional', name: 'Doces Tradicionais', price: '4,90' },
      { id: 'dessert-pave', name: 'Pavês', price: '15,90' },
      { id: 'dessert-cheesecake', name: 'Cheesecake', price: '25,90' },
    ],
  },
  {
    slug: 'entradas',
    id: 'starters',
    title: 'CARDÁPIO - ENTRADAS',
    products: [
      { id: 'starter-salad', name: 'Saladas', price: '9,00' },
      { id: 'starter-bruschetta', name: 'Bruschettas', price: '35,00' },
      { id: 'starter-carpaccio', name: 'Carpaccios', price: '39,90' },
      { id: 'starter-ceviche', name: 'Ceviches', price: '45,00' },
      { id: 'starter-cheese-board', name: 'Tábua de Queijos e Frios', price: '69,90' },
      { id: 'starter-croquettes', name: 'Croquetes', price: '23,90' },
      { id: 'starter-pastries', name: 'Pastéis', price: '35,90' },
      { id: 'starter-tartines', name: 'Tartines', price: '25,90' },
      { id: 'starter-cod-fritters', name: 'Bolinhos de Bacalhau', price: '45,00' },
    ],
  },
]

async function home(page) {
  await page.locator('.navigation').getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function openCategory(page, id, slug) {
  const button = page.locator(`[data-category="${id}"]`)
  await button.focus()
  await button.click()
  await expect(page).toHaveURL(new RegExp('/cardapio/' + slug + '$'))
}

for (const category of categories) {
  test(`${category.slug} renders all API names and prices, including offers`, async ({ page }) => {
    await page.goto('/cardapio/' + category.slug)
    await expect(page.locator('.menu-heading')).toHaveText(category.title)
    await expect(page.locator('.menu-product h3')).toHaveText(categoryProducts(category.id).map(product => product.name))
    for (const product of category.products) {
      const card = page.locator(`.menu-product[data-id="${product.id}"]`)
      await expect(card.locator('.menu-price')).toContainText(product.price)
      await expect(card.locator('.menu-add')).toBeEnabled()
      await expect(card.locator('.menu-photo-box img').first()).toBeVisible()
    }
    await expect(page.locator('.menu-hero')).toBeVisible()
    await expect(page.getByText('Em breve', { exact: true })).toHaveCount(0)
  })

  for (const width of [375, 1440, 1920]) {
    test(`${category.slug} keeps photos inside their containers at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto('/cardapio/' + category.slug)
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('.menu-product')).toHaveCount(categoryProducts(category.id).length)
      await expect.poll(() => page.locator('.menu-photo-box img').evaluateAll(images =>
        images.every(image => image.complete && image.naturalWidth > 0),
      )).toBe(true)
      const layout = await page.evaluate(() => {
        const desktop = document.querySelector('.desktop').getBoundingClientRect()
        const photos = [...document.querySelectorAll('.menu-photo-box img')]
        return {
          viewport: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          x: desktop.x,
          width: desktop.width,
          nonLocal: photos.filter(image => new URL(image.src).origin !== location.origin).map(image => image.alt),
          enlarged: photos.filter(image => {
            const rect = image.getBoundingClientRect()
            return Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight) > 1.005
          }).map(image => image.alt),
          outside: photos.filter(image => {
            const rect = image.getBoundingClientRect()
            const box = image.closest('.menu-photo-box').getBoundingClientRect()
            return rect.left < box.left - 1 || rect.right > box.right + 1 ||
              rect.top < box.top - 1 || rect.bottom > box.bottom + 1
          }).map(image => image.alt),
        }
      })
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport)
      expect(layout.x).toBe(0)
      expect(layout.width).toBe(layout.viewport)
      expect(layout.nonLocal).toEqual([])
      expect(layout.enlarged).toEqual([])
      expect(layout.outside).toEqual([])
    })
  }
}

test('three new categories share cart totals and favorite preferences after reload', async ({ page }) => {
  await page.goto('/cardapio/bebidas')
  await page.locator('.menu-add[data-add="drink-cola"]').click()
  await home(page)
  await openCategory(page, 'desserts', 'sobremesas')
  await page.locator('.menu-add[data-add="dessert-cakes"]').click()
  await page.locator('.menu-product[data-id="dessert-cakes"] .menu-favorite').click()
  await home(page)
  await openCategory(page, 'starters', 'entradas')
  await page.locator('.menu-add[data-add="starter-salad"]').click()
  await page.locator('.menu-product[data-id="starter-salad"] .menu-favorite').click()
  await page.reload()
  await expect(page.locator('.menu-product[data-id="starter-salad"] .menu-favorite')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-items .cart-item')).toHaveCount(3)
  await expect(page.locator('#cart-total')).toContainText('29,90')
  await page.keyboard.press('Escape')
  await home(page)
  await openCategory(page, 'desserts', 'sobremesas')
  await expect(page.locator('.menu-product[data-id="dessert-cakes"] .menu-favorite')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('29,90')
})

test('category background fills the bottom of a tall window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3000 })
  await page.goto('/cardapio/sobremesas')
  await expect(page.locator('.menu-product')).toHaveCount(11)
  const bounds = await page.evaluate(() => ({
    viewport: innerHeight,
    pageHeight: document.querySelector('.menu-page').getBoundingClientRect().height,
    catalogBottom: document.querySelector('.menu-catalog').getBoundingClientRect().bottom,
  }))
  expect(bounds.pageHeight).toBeGreaterThanOrEqual(bounds.viewport)
  expect(bounds.catalogBottom).toBeGreaterThanOrEqual(bounds.viewport)
})
