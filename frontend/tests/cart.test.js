import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeCart, cartReducer, calculateCartTotals, MAX_QUANTITY } from '../src/features/home/lib/cart.js'
import { formatMoney } from '../src/features/home/lib/money.js'

const products = [
  { id: 'burger', priceCents: 3590 }, { id: 'waffles', priceCents: 2090 },
  { id: 'pancakes', priceCents: 1590 }, { id: 'toast', priceCents: 1290 },
]

test('invalid or injected saved entries cannot enter the cart', () => {
  for (const value of [null, [], 'burger', 1]) assert.deepEqual(sanitizeCart(value), {})
  assert.deepEqual(sanitizeCart({ burger: 2, waffles: '3', pancakes: -1, toast: 100, unknown: 7 }), { burger: 2 })
  assert.deepEqual(sanitizeCart(Object.create({ burger: 99 })), {})
})

test('quantities cannot exceed the limit or become negative', () => {
  const full = { burger: MAX_QUANTITY }
  assert.equal(cartReducer(full, { type: 'add', productId: 'burger' }), full)
  assert.deepEqual(cartReducer({ burger: 1 }, { type: 'remove', productId: 'burger' }), {})
  assert.deepEqual(cartReducer({}, { type: 'remove', productId: 'burger' }), {})
  assert.deepEqual(cartReducer({}, { type: 'add', productId: '__proto__' }), {})
})

test('money stays in integer cents across repeated additions and removals', () => {
  let cart = {}
  for (const { id } of products) cart = cartReducer(cart, { type: 'add', productId: id })
  assert.deepEqual(calculateCartTotals(cart, products), { count: 4, totalCents: 8560 })
  cart = cartReducer(cart, { type: 'remove', productId: 'burger' })
  cart = cartReducer(cart, { type: 'add', productId: 'waffles' })
  assert.deepEqual(calculateCartTotals(cart, products), { count: 4, totalCents: 7060 })
  assert.equal(formatMoney(7060, { compact: true }), 'R$70,60')
})

test('menu products and existing home offers share validated saved quantities and totals', () => {
  const catalog = [...products, { id: 'chicken-double', priceCents: 3590 }]
  const productIds = catalog.map(product => product.id)
  let cart = sanitizeCart(
    JSON.parse('{"burger":1,"chicken-double":2,"unknown":5,"__proto__":99}'),
    productIds,
  )
  assert.deepEqual(cart, { burger: 1, 'chicken-double': 2 })
  assert.deepEqual(calculateCartTotals(cart, catalog), { count: 3, totalCents: 10770 })
  cart = cartReducer(cart, { type: 'add', productId: 'chicken-double' }, productIds)
  cart = cartReducer(cart, { type: 'remove', productId: 'burger' }, productIds)
  assert.deepEqual(cart, { 'chicken-double': 3 })
  assert.deepEqual(calculateCartTotals(cart, catalog), { count: 3, totalCents: 10770 })
  assert.equal(cartReducer(cart, { type: 'add', productId: 'unknown' }, productIds), cart)
  assert.deepEqual(
    cartReducer(cart, { type: 'replace', cart: { 'chicken-double': 100, waffles: 2 } }, productIds),
    { waffles: 2 },
  )
})
