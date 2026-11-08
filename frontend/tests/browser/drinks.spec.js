import { test, expect } from '@playwright/test'

const expectedDrinks = [
  { id: 'drink-cola', name: 'Coca-Cola', price: '5,90' },
  { id: 'drink-sparkling-water', name: 'Água com Gás', price: '4,90' },
  { id: 'drink-juice', name: 'Suco Natural', price: '10,00' },
  { id: 'drink-coffee', name: 'Café Espresso', price: '7,00' },
  { id: 'drink-tea', name: 'Chás', price: '5,00' },
  { id: 'drink-milk', name: 'Bebidas lácteas', price: '12,00' },
  { id: 'drink-cocktails', name: 'Coquetéis', price: '15,00' },
  { id: 'drink-alcoholic', name: 'Bebidas alcoólicas', price: '50,00' },
  { id: 'drink-energy', name: 'Energético', price: '9,00' },
]

async function openHomeCategory(page, id, slug) {
  const category = page.locator(`[data-category="${id}"]`)
  await category.focus()
  await category.click()
  await expect(page).toHaveURL(new RegExp('/cardapio/' + slug + '$'))
}

async function returnHome(page) {
  await page.locator('.navigation').getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('Bebidas opens from home with the nine reference names and prices', async ({ page }) => {
  await page.goto('/')
  await openHomeCategory(page, 'drinks', 'bebidas')
  await expect(page.locator('.menu-heading')).toHaveText('CARDÁPIO - BEBIDAS')
  await expect(page.locator('.menu-product h3')).toHaveText(expectedDrinks.map(drink => drink.name))
  for (const drink of expectedDrinks) {
    const card = page.locator(`.menu-product[data-id="${drink.id}"]`)
    await expect(card.locator('.menu-price')).toContainText(drink.price)
    await expect(card.locator('.menu-add')).toBeEnabled()
    await expect(card.locator('.menu-photo-box img').first()).toBeVisible()
  }
  await expect(page.locator('.menu-hero')).toBeVisible()
  await expect(page.locator('[data-id="drink-cocktails"] .menu-photo-box img')).toHaveCount(2)
  await expect(page.locator('.menu-photo-placeholder')).toHaveCount(0)
  await expect(page.getByText('Em breve', { exact: true })).toHaveCount(0)
})

test('drink, home offer and hamburger menu keep one cart through category changes and reload', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-add="burger"]').click()
  await openHomeCategory(page, 'drinks', 'bebidas')
  await page.locator('.menu-add[data-add="drink-cola"]').click()
  await returnHome(page)
  await openHomeCategory(page, 'burgers', 'hamburgueres')
  await page.locator('.menu-add[data-add="chicken-burger"]').click()
  await page.reload()
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('77,70')
  await expect(page.locator('#cart-items .cart-item')).toHaveCount(3)
  await expect(page.locator('#cart-items').getByRole('heading', { name: 'Coca-Cola', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await returnHome(page)
  await openHomeCategory(page, 'drinks', 'bebidas')
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('77,70')
  await page.getByRole('button', { name: 'Remover uma unidade de Coca-Cola', exact: true }).click()
  await expect(page.locator('#cart-total')).toContainText('71,80')
})

test('drink favorites are retained after navigating away and reloading', async ({ page }) => {
  await page.goto('/cardapio/bebidas')
  const favorite = page.locator('.menu-product[data-id="drink-cola"] .menu-favorite')
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await returnHome(page)
  await openHomeCategory(page, 'drinks', 'bebidas')
  await page.reload()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
})

for (const width of [375, 768, 1440, 1920]) {
  test(`drink photos fit their containers at ${width}px without upscaling or page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/cardapio/bebidas')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.menu-product')).toHaveCount(9)
    await expect.poll(() => page.locator('.menu-photo-box img').evaluateAll(images =>
      images.every(image => image.complete && image.naturalWidth > 0),
    )).toBe(true)
    const layout = await page.evaluate(() => {
      const desktop = document.querySelector('.desktop').getBoundingClientRect()
      const banner = document.querySelector('.menu-hero').getBoundingClientRect()
      const images = [...document.querySelectorAll('.menu-photo-box img')]
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        desktopX: desktop.x,
        desktopWidth: desktop.width,
        bannerWidth: banner.width,
        nonLocal: images.filter(image => new URL(image.src).origin !== location.origin).map(image => image.alt),
        enlarged: images.filter(image => {
          const bounds = image.getBoundingClientRect()
          return Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight) > 1.005
        }).map(image => image.alt),
        outsidePhotoBox: images.filter(image => {
          const imageBounds = image.getBoundingClientRect()
          const box = image.closest('.menu-photo-box').getBoundingClientRect()
          return imageBounds.left < box.left - 1 || imageBounds.right > box.right + 1 ||
            imageBounds.top < box.top - 1 || imageBounds.bottom > box.bottom + 1
        }).map(image => image.alt),
      }
    })
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport)
    expect(layout.desktopX).toBe(0)
    expect(layout.desktopWidth).toBe(layout.viewport)
    expect(layout.bannerWidth).toBe(layout.viewport)
    expect(layout.nonLocal).toEqual([])
    expect(layout.enlarged).toEqual([])
    expect(layout.outsidePhotoBox).toEqual([])
  })
}
