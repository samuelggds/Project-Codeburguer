export const CATALOG_CHANGED_EVENT = 'devburger:catalog-changed';
export const CATALOG_CHANGED_KEY = 'devburger-catalog-revision';
export function notifyCatalogChanged() {
  window.dispatchEvent(new Event(CATALOG_CHANGED_EVENT));
  try { localStorage.setItem(CATALOG_CHANGED_KEY, Date.now() + ':' + Math.random()); }
  catch { /* Same-tab updates and refresh-on-focus still work. */ }
}
