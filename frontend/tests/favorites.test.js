import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeFavorites, toggleFavoriteId } from '../src/features/storefront/favorites.js'

const productIds = ['burger', 'chicken-double', 'pancakes']

test('stored favorites discard malformed, duplicate and removed product IDs', () => {
  for (const value of [null, {}, 'burger', 2]) {
    assert.deepEqual(sanitizeFavorites(value, productIds), [])
  }
  assert.deepEqual(
    sanitizeFavorites(['burger', 'burger', 'chicken-double', 'removed', 2, '__proto__'], productIds),
    ['burger', 'chicken-double'],
  )
})

test('favorite toggles persist through serialization and reject unknown products', () => {
  let favorites = toggleFavoriteId([], 'chicken-double', productIds)
  favorites = sanitizeFavorites(JSON.parse(JSON.stringify(favorites)), productIds)
  assert.deepEqual(favorites, ['chicken-double'])
  assert.equal(toggleFavoriteId(favorites, 'removed', productIds), favorites)
  assert.deepEqual(toggleFavoriteId(favorites, 'chicken-double', productIds), [])
})
