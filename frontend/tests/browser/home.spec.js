import { test, expect } from '@playwright/test'

test('local imagery, exact products, cart totals and persistence', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route(/https:\/\/(?:fonts\.googleapis|fonts\.gstatic|images\.unsplash)\.com\//, route => route.abort())
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'OFERTAS DO DIA' })).toBeVisible()
  await expect(page.locator('.product')).toHaveCount(4)
  await expect(page.getByText('HOME_CARROSSEL')).toHaveCount(0)
  expect(await page.locator('.dev-burguer-app img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0 && new URL(image.src).origin === location.origin))).toBe(true)
  for (const id of ['burger', 'waffles', 'pancakes', 'toast']) await page.locator(`[data-add="${id}"]`).click()
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('85,60')
  await page.getByRole('button', { name: 'Remover uma unidade de X-Tudo especial da casa' }).click()
  await expect(page.locator('#cart-total')).toContainText('49,70')
  await page.keyboard.press('Escape')
  await expect(page.locator('#cart-dialog')).not.toBeVisible()
  await expect(page.locator('#orders-button')).toBeFocused()
  await page.reload()
  await page.locator('#orders-button').click()
  await expect(page.locator('#cart-total')).toContainText('49,70')
  expect(errors).toEqual([])
})

test('existing login, registration and logout remain connected', async ({ page }) => {
  await page.goto('/')
  await page.locator('#session-button').click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()
  await page.evaluate(() => {
    sessionStorage.setItem('devburger_token', 'test-only-token')
    sessionStorage.setItem('devburger_user', JSON.stringify({ id: 1, name: 'Rodolfo Silva' }))
  })
  await page.goto('/')
  await expect(page.locator('#account-greeting')).toHaveText('Olá, Rodolfo')
  await page.locator('#session-button').click()
  await expect(page.locator('#session-button')).toHaveText('Entrar')
  expect(await page.evaluate(() => sessionStorage.getItem('devburger_token'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('devburger_user'))).toBeNull()
})

test('category carousel reveals focused cards and opens the matching menu', async ({ page }) => {
  await page.goto('/')
  await page.locator('#categories-previous').click()
  await expect(page.locator('#categories-previous')).toBeDisabled()
  await page.locator('#categories-next').click()
  await expect(page.locator('#categories-next')).toBeDisabled()
  await page.locator('[data-category="burgers"]').focus()
  await expect(page.locator('#categories-previous')).toBeDisabled()
  await page.locator('[data-category="desserts"]').click()
  await expect(page).toHaveURL(/\/cardapio\/sobremesas$/)
  await expect(page.locator('.menu-heading')).toContainText('SOBREMESAS')
  await expect(page.locator('.menu-product')).toHaveCount(9)
  await page.locator('.navigation').getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.locator('#offers-next').click()
  await expect(page.locator('.product').first()).toHaveAttribute('data-id', 'waffles')
})

for (const width of [1440, 1920, 2560, 3840, 375, 320]) {
  test(`layout at ${width}px never enlarges photos or overflows`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const enlarged = await page.locator('.dev-burguer-app img').evaluateAll(images => images.flatMap(image => {
      const rect = image.getBoundingClientRect()
      const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight)
      return scale > 1.005 ? [image.alt] : []
    }))
    expect(enlarged).toEqual([])
    const bounds = await page.locator('.desktop').boundingBox()
    expect(bounds.x).toBe(0)
    expect(bounds.width).toBe(await page.evaluate(() => document.documentElement.clientWidth))
  })
}

test('home and catalog fill a tall viewport without a blank bottom strip', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 2200 })
  await page.goto('/')
  const bounds = await page.evaluate(() => ({
    viewport: innerHeight,
    root: document.querySelector('.dev-burguer-app').getBoundingClientRect().height,
    catalogBottom: document.querySelector('.catalog').getBoundingClientRect().bottom,
  }))
  expect(bounds.root).toBeGreaterThanOrEqual(bounds.viewport)
  expect(bounds.catalogBottom).toBeGreaterThanOrEqual(bounds.viewport)
})
