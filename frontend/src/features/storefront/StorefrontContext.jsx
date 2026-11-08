import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { allProducts } from '../home/data/catalog.js';
import { useCart } from '../home/hooks/useCart.js';
import { useDemoCheckout } from '../checkout/useDemoCheckout.js';
import { FAVORITES_STORAGE_KEY, sanitizeFavorites, toggleFavoriteId } from './favorites.js';

const StorefrontContext = createContext(null);
const productIds = allProducts.map((product) => product.id);

function loadFavorites() {
  try {
    return sanitizeFavorites(
      JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]'),
      productIds,
    );
  } catch {
    return [];
  }
}

export function StorefrontProvider({ children }) {
  const cart = useCart(allProducts);
  const checkout = useDemoCheckout();
  const [favorites, setFavorites] = useState(loadFavorites);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // The provider preserves selections across navigation even without storage.
    }
  }, [favorites]);

  const isFavorite = useCallback((productId) => favorites.includes(productId), [favorites]);
  const toggleFavorite = useCallback((productId) => {
    setFavorites((current) => toggleFavoriteId(current, productId, productIds));
  }, []);

  const value = useMemo(
    () => ({ cart, checkout, isFavorite, toggleFavorite }),
    [cart, checkout, isFavorite, toggleFavorite],
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const storefront = useContext(StorefrontContext);
  if (!storefront) throw new Error('useStorefront must be used within StorefrontProvider.');
  return storefront;
}
