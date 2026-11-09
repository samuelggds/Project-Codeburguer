import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../home/hooks/useCart.js';
import { useDemoCheckout } from '../checkout/useDemoCheckout.js';
import { FAVORITES_STORAGE_KEY, sanitizeFavorites, toggleFavoriteId } from './favorites.js';
import { fetchCatalog } from './catalogApi.js';
import { CATALOG_CHANGED_EVENT, CATALOG_CHANGED_KEY } from './catalogEvents.js';
const StorefrontContext = createContext(null);
const isStorefrontPath = (pathname) => !pathname.startsWith('/admin') && !['/login', '/register'].includes(pathname);
function loadFavorites() {
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  } catch { return []; }
}
export function StorefrontProvider({ children }) {
  const { pathname } = useLocation();
  const [catalog, setCatalog] = useState({ products: [], categories: [] });
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef(null);
  const refreshCatalog = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    setCatalogError('');
    try {
      const data = await fetchCatalog(controller.signal);
      if (controller.signal.aborted) return;
      setCatalog(data);
      setCatalogLoaded(true);
    } catch (error) {
      if (!controller.signal.aborted) setCatalogError(error.message || 'Catálogo indisponível.');
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);
  useEffect(() => { if (isStorefrontPath(pathname)) refreshCatalog(); }, [pathname, refreshCatalog]);
  useEffect(() => {
    const update = () => {
      if (isStorefrontPath(window.location.pathname) && document.visibilityState !== 'hidden') refreshCatalog();
    };
    const onStorage = (event) => { if (event.key === CATALOG_CHANGED_KEY) update(); };
    window.addEventListener(CATALOG_CHANGED_EVENT, update);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 30000);
    return () => {
      request.current?.abort(); clearInterval(timer);
      window.removeEventListener(CATALOG_CHANGED_EVENT, update);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [refreshCatalog]);
  const productIds = useMemo(() => catalog.products.map((product) => product.id), [catalog.products]);
  const cart = useCart(catalog.products, { ready: catalogLoaded });
  const checkout = useDemoCheckout();
  const [favorites, setFavorites] = useState(loadFavorites);
  useEffect(() => {
    if (catalogLoaded) setFavorites((current) => sanitizeFavorites(current, productIds));
  }, [catalogLoaded, productIds]);
  useEffect(() => {
    if (!catalogLoaded) return;
    try { window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(sanitizeFavorites(favorites, productIds))); }
    catch { /* Keep selections in memory when storage is unavailable. */ }
  }, [favorites, productIds, catalogLoaded]);
  const isFavorite = useCallback((productId) => favorites.includes(productId), [favorites]);
  const toggleFavorite = useCallback((productId) => {
    setFavorites((current) => toggleFavoriteId(current, productId, productIds));
  }, [productIds]);
  const productsById = useMemo(() => Object.fromEntries(catalog.products.map((product) => [product.id, product])), [catalog.products]);
  const offers = useMemo(() => catalog.products.filter((product) => product.offer), [catalog.products]);
  const value = useMemo(() => ({
    ...catalog, offers, productsById, cart, checkout, isFavorite, toggleFavorite,
    catalogLoading: !catalogLoaded, catalogError, refreshing, refreshCatalog,
  }), [catalog, offers, productsById, cart, checkout, isFavorite, toggleFavorite, catalogLoaded, catalogError, refreshing, refreshCatalog]);
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}
export function useStorefront() {
  const storefront = useContext(StorefrontContext);
  if (!storefront) throw new Error('useStorefront must be used within StorefrontProvider.');
  return storefront;
}
