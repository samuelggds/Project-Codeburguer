export const FAVORITES_STORAGE_KEY = 'dev-burguer-favoritos';

/** Only known catalog IDs can be restored from saved preferences. */
export function sanitizeFavorites(value, productIds) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(productIds);
  return [...new Set(value.filter((id) => typeof id === 'string' && allowed.has(id)))];
}

export function toggleFavoriteId(favorites, productId, productIds) {
  if (!productIds.includes(productId)) return favorites;
  return favorites.includes(productId)
    ? favorites.filter((id) => id !== productId)
    : [...favorites, productId];
}
