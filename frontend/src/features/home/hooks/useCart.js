import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { CART_STORAGE_KEY, MAX_QUANTITY, calculateCartTotals, cartReducer, sanitizeCart } from '../lib/cart.js';
function loadCart() {
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '{}');
    // Wait for the async catalog before discarding saved product identities.
    return sanitizeCart(value, value && typeof value === 'object' ? Object.keys(value) : []);
  } catch { return {}; }
}
export function useCart(products, { ready = true } = {}) {
  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const reduceCart = useCallback((state, action) =>
    action.type === 'reconcile' ? sanitizeCart(state, productIds) : cartReducer(state, action, productIds), [productIds]);
  const [savedQuantities, dispatch] = useReducer(reduceCart, undefined, loadCart);
  const quantities = useMemo(() => sanitizeCart(savedQuantities, productIds), [savedQuantities, productIds]);
  useEffect(() => { if (ready) dispatch({ type: 'reconcile' }); }, [ready, productIds]);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(quantities)); }
    catch { /* The in-memory cart remains usable. */ }
  }, [quantities, ready]);
  const addItem = useCallback((productId) => dispatch({ type: 'add', productId }), []);
  const removeItem = useCallback((productId) => dispatch({ type: 'remove', productId }), []);
  const clear = useCallback(() => dispatch({ type: 'replace', cart: {} }), []);
  const totals = useMemo(() => calculateCartTotals(quantities, products), [quantities, products]);
  const items = useMemo(() => products.flatMap((product) => {
    const quantity = quantities[product.id] || 0;
    return quantity ? [{ ...product, quantity, subtotalCents: product.priceCents * quantity }] : [];
  }), [products, quantities]);
  return { quantities, items, ...totals, addItem, removeItem, clear, maxQuantity: MAX_QUANTITY };
}
