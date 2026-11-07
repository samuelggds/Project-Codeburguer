import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  CART_STORAGE_KEY,
  MAX_QUANTITY,
  calculateCartTotals,
  cartReducer,
  sanitizeCart,
} from '../lib/cart.js';

function loadCart(productIds) {
  try {
    return sanitizeCart(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '{}'), productIds);
  } catch {
    // Private browsing, unavailable storage, or invalid JSON must not break the page.
    return {};
  }
}

export function useCart(products) {
  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const reduceCart = useCallback(
    (state, action) => cartReducer(state, action, productIds),
    [productIds],
  );
  const [quantities, dispatch] = useReducer(reduceCart, productIds, loadCart);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(quantities));
    } catch {
      // Cart interactions remain available in memory when persistence is blocked.
    }
  }, [quantities]);

  const addItem = useCallback((productId) => dispatch({ type: 'add', productId }), []);
  const removeItem = useCallback((productId) => dispatch({ type: 'remove', productId }), []);
  const totals = useMemo(() => calculateCartTotals(quantities, products), [quantities, products]);
  const items = useMemo(
    () => products.flatMap((product) => {
      const quantity = quantities[product.id] || 0;
      return quantity ? [{ ...product, quantity, subtotalCents: product.priceCents * quantity }] : [];
    }),
    [products, quantities],
  );

  return { quantities, items, ...totals, addItem, removeItem, maxQuantity: MAX_QUANTITY };
}
