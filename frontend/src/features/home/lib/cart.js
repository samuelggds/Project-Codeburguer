export const CART_STORAGE_KEY = 'dev-burguer-cesta';
export const MAX_QUANTITY = 99;
export const PRODUCT_IDS = Object.freeze(['burger', 'waffles', 'pancakes', 'toast']);

/** Discard unknown products, invalid quantities, and malformed saved values. */
export function sanitizeCart(value, productIds = PRODUCT_IDS) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    productIds.flatMap((id) => {
      const quantity = Object.hasOwn(value, id) ? value[id] : undefined;
      return Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY
        ? [[id, quantity]]
        : [];
    }),
  );
}

export function cartReducer(state, action, productIds = PRODUCT_IDS) {
  if (action.type === 'replace') return sanitizeCart(action.cart, productIds);
  if (!productIds.includes(action.productId)) return state;

  const current = state[action.productId] || 0;
  if (action.type === 'add') {
    if (current >= MAX_QUANTITY) return state;
    return { ...state, [action.productId]: current + 1 };
  }

  if (action.type === 'remove') {
    if (!current) return state;
    const next = { ...state };
    if (current === 1) delete next[action.productId];
    else next[action.productId] = current - 1;
    return next;
  }

  return state;
}

/** Prices and totals stay in integer centavos, including repeated additions. */
export function calculateCartTotals(quantities, products) {
  const validated = sanitizeCart(quantities, products.map((product) => product.id));
  return products.reduce(
    (totals, product) => {
      const quantity = validated[product.id] || 0;
      return {
        count: totals.count + quantity,
        totalCents: totals.totalCents + product.priceCents * quantity,
      };
    },
    { count: 0, totalCents: 0 },
  );
}
