import { test, expect } from '@playwright/test'

const CART_STORAGE_KEY = 'dev-burguer-cesta'
const demoNotice = 'Demonstração: nenhum pedido será enviado e nenhuma cobrança será realizada.'
const completionHeading = /Checkout\s*[–-]\s*Pedido concluído/

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
})

async function seedCart(page, path = '/carrinho', cart = { burger: 2, waffles: 1 }) {
  await page.goto('/')
  await page.evaluate(({ key, cart }) => localStorage.setItem(key, JSON.stringify(cart)), {
    key: CART_STORAGE_KEY,
    cart,
  })
  await page.goto(path)
}

async function fillAddressForm(page) {
  await page.getByLabel('Rua', { exact: true }).fill('Rua das Flores')
  await page.getByLabel('Número', { exact: true }).fill('123')
  await page.getByLabel('Complemento (opcional)', { exact: true }).fill('Apto 42')
  await page.getByLabel('Bairro', { exact: true }).fill('Centro')
  await page.getByLabel('CEP', { exact: true }).fill('01001000')
  await page.getByLabel('Cidade', { exact: true }).fill('São Paulo')
  await page.getByLabel('Estado', { exact: true }).selectOption('SP')
}

async function saveAddress(page) {
  await page.getByRole('button', { name: 'Informar endereço de entrega', exact: true }).click()
  await fillAddressForm(page)
  await page.getByRole('button', { name: 'Salvar endereço', exact: true }).click()
  await expect(page.getByText(/Rua das Flores/).first()).toBeVisible()
}

async function expectTotals(page, subtotal, total) {
  await expect(page.locator('.checkout-subtotal')).toContainText(subtotal)
  await expect(page.locator('.checkout-delivery')).toContainText('5,00')
  await expect(page.locator('.checkout-total')).toContainText(total)
}

async function expectNoHorizontalOverflow(page) {
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
}

test('cart dialog opens checkout cart and quantity changes update prices in centavos', async ({ page }) => {
  await seedCart(page, '/')
  await page.locator('#orders-button').click()
  await page.getByRole('link', { name: 'Ver carrinho e continuar', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.locator('.checkout-table [data-id]')).toHaveCount(2)
  const burger = page.locator('.checkout-table [data-id="burger"]')
  const waffles = page.locator('.checkout-table [data-id="waffles"]')
  await expect(burger).toContainText('X-Tudo especial da casa')
  await expect(waffles).toContainText('Waffles')
  await expectTotals(page, '92,70', '97,70')
  await burger.getByRole('button', { name: 'Adicionar uma unidade de X-Tudo especial da casa', exact: true }).click()
  await expectTotals(page, '128,60', '133,60')
  await burger.getByRole('button', { name: 'Remover uma unidade de X-Tudo especial da casa', exact: true }).click()
  await expectTotals(page, '92,70', '97,70')
  await waffles.getByRole('button', { name: 'Remover uma unidade de Waffles', exact: true }).click()
  await expect(waffles).toHaveCount(0)
  await expectTotals(page, '71,80', '76,80')
  await page.reload()
  await expectTotals(page, '71,80', '76,80')
  await expect(page.getByText(demoNotice, { exact: true })).toBeVisible()
})

test('demo checkout saves delivery details, changes payment options and persists completion without API writes', async ({ page }) => {
  const writes = []
  await page.route('**/*', async route => {
    const request = route.request()
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
      writes.push(`${request.method()} ${request.url()}`)
      await route.abort()
      return
    }
    await route.fallback()
  })
  await seedCart(page)
  await page.getByRole('link', { name: 'Continuar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expectTotals(page, '92,70', '97,70')
  await expect(page.getByText(demoNotice, { exact: true })).toBeVisible()
  await saveAddress(page)
  const paymentNames = ['Dinheiro', 'Cartão Crédito/Débito', 'PIX']
  for (const name of paymentNames) {
    const payment = page.getByRole('radio', { name, exact: true })
    await payment.check()
    await expect(payment).toBeChecked()
    for (const other of paymentNames.filter(value => value !== name)) {
      await expect(page.getByRole('radio', { name: other, exact: true })).not.toBeChecked()
    }
    await expectTotals(page, '92,70', '97,70')
  }
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page).toHaveURL(/\/pedido-concluido$/)
  await expect(page.getByRole('heading', { name: completionHeading })).toBeVisible()
  await expect(page.getByText('Seu pedido de demonstração foi concluído. Nenhum pedido foi enviado e nenhuma cobrança foi realizada.', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), CART_STORAGE_KEY)).toEqual({})
  await page.reload()
  await expect(page.getByRole('heading', { name: completionHeading })).toBeVisible()
  await page.locator('#orders-button').click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible()
  expect(writes).toEqual([])
})

test('empty checkout and missing completion redirect to the empty cart', async ({ page }) => {
  for (const path of ['/checkout', '/pedido-concluido']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Continuar', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Finalizar pedido', exact: true })).toHaveCount(0)
  }
})

test('demo checkout remains usable across SPA navigation when localStorage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage disabled for test', 'SecurityError') },
    })
  })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.locator('[data-add="burger"]').click()
  await page.locator('[data-add="waffles"]').click()
  await page.locator('#orders-button').click()
  await page.getByRole('link', { name: 'Ver carrinho e continuar', exact: true }).click()
  await expectTotals(page, '56,80', '61,80')
  await page.getByRole('link', { name: 'Continuar', exact: true }).click()
  await saveAddress(page)
  await page.getByRole('radio', { name: 'Dinheiro', exact: true }).check()
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: completionHeading })).toBeVisible()
  await page.locator('#orders-button').click()
  await expect(page.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('cart, address form, checkout and completion fit a 375px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await seedCart(page)
  await expect(page.locator('.checkout-table [data-id]')).toHaveCount(2)
  await expectNoHorizontalOverflow(page)
  await page.getByRole('link', { name: 'Continuar', exact: true }).click()
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', { name: 'Informar endereço de entrega', exact: true }).click()
  await expect(page.getByLabel('Rua', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.getByLabel('Rua', { exact: true }).fill('Rua das Flores')
  await page.getByLabel('Número', { exact: true }).fill('123')
  await page.getByLabel('Bairro', { exact: true }).fill('Centro')
  await page.getByLabel('CEP', { exact: true }).fill('01001000')
  await page.getByLabel('Cidade', { exact: true }).fill('São Paulo')
  await page.getByLabel('Estado', { exact: true }).selectOption('SP')
  await page.getByRole('button', { name: 'Salvar endereço', exact: true }).click()
  await page.getByRole('radio', { name: 'Cartão Crédito/Débito', exact: true }).check()
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: completionHeading })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('missing address, blank fields and an invalid CEP cannot complete or save checkout', async ({ page }) => {
  await seedCart(page, '/checkout')
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('alert')).toContainText('Salve o endereço de entrega')
  const street = page.getByLabel('Rua', { exact: true })
  const save = page.getByRole('button', { name: 'Salvar endereço', exact: true })
  await expect(street).toBeFocused()
  await save.click()
  expect(await street.evaluate(input => input.validity.valueMissing)).toBe(true)
  await expect(save).toBeVisible()
  await fillAddressForm(page)
  await street.fill('   ')
  await save.click()
  expect(await street.evaluate(input => input.validity.patternMismatch)).toBe(true)
  await street.fill('Rua das Flores')
  const postalCode = page.getByLabel('CEP', { exact: true })
  await postalCode.fill('123')
  await save.click()
  expect(await postalCode.evaluate(input => input.validity.patternMismatch)).toBe(true)
  await expect(save).toBeVisible()
  await expect(page.getByRole('button', { name: 'Trocar endereço de entrega', exact: true })).toHaveCount(0)
  await expectTotals(page, '92,70', '97,70')
  await postalCode.fill('01001-000')
  await save.click()
  await expect(page.getByRole('button', { name: 'Trocar endereço de entrega', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page).toHaveURL(/\/checkout$/)
})

test('canceling address edits retains the saved address and returns keyboard focus', async ({ page }) => {
  await seedCart(page, '/checkout')
  await saveAddress(page)
  const edit = page.getByRole('button', { name: 'Trocar endereço de entrega', exact: true })
  await expect(edit).toBeFocused()
  await edit.click()
  await expect(page.getByLabel('Rua', { exact: true })).toHaveValue('Rua das Flores')
  await page.getByLabel('Rua', { exact: true }).fill('Rua que não será salva')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(edit).toBeFocused()
  await expect(page.getByText(/Rua das Flores/).first()).toBeVisible()
  await expect(page.getByText(/Rua que não será salva/)).toHaveCount(0)
  await edit.click()
  await expect(page.getByLabel('Rua', { exact: true })).toHaveValue('Rua das Flores')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('radio', { name: 'Dinheiro', exact: true }).check()
  await page.getByRole('link', { name: 'Rever meu pedido', exact: true }).click()
  await page.getByRole('link', { name: 'Continuar', exact: true }).click()
  await expect(page.getByText(/Rua das Flores/).first()).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Dinheiro', exact: true })).toBeChecked()
  const persisted = await page.evaluate(() => [localStorage, sessionStorage].flatMap(storage =>
    Object.keys(storage).map(key => storage.getItem(key)),
  ).join('\n'))
  expect(persisted).not.toContain('Rua das Flores')
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: completionHeading })).toBeVisible()
})

test('cart enforces the 99-unit limit and recalculates correctly after decreasing quantity', async ({ page }) => {
  await seedCart(page, '/carrinho', { burger: 99 })
  const row = page.locator('.checkout-table [data-id="burger"]')
  const add = row.getByRole('button', { name: 'Adicionar uma unidade de X-Tudo especial da casa', exact: true })
  const quantity = row.getByLabel('Quantidade de X-Tudo especial da casa', { exact: true })
  await expect(quantity).toHaveText('99')
  await expect(add).toBeDisabled()
  await expectTotals(page, '3.554,10', '3.559,10')
  await row.getByRole('button', { name: 'Remover uma unidade de X-Tudo especial da casa', exact: true }).click()
  await expect(quantity).toHaveText('98')
  await expect(add).toBeEnabled()
  await expectTotals(page, '3.518,20', '3.523,20')
  await add.click()
  await page.reload()
  await expect(quantity).toHaveText('99')
  await expect(add).toBeDisabled()
  await expectTotals(page, '3.554,10', '3.559,10')
})
