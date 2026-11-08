export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The API stores reais as DECIMAL(10,2). Convert user input without binary rounding. */
export function parsePriceToReais(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalized)) return '';
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents <= 0 || cents > 9999999999) return '';
  return Number(whole) + '.' + fraction.padEnd(2, '0');
}

export function formatPriceInput(price) {
  return Number.isFinite(Number(price)) ? Number(price).toFixed(2).replace('.', ',') : '';
}

export function formatAdminMoney(price) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(price) || 0);
}

export function searchText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}
