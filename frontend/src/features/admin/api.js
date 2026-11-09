import { api } from '../../services/api';
import { notifyCatalogChanged } from '../storefront/catalogEvents.js';

async function list(path, options) {
  const { data } = await api.get(path, options);
  if (!Array.isArray(data)) throw new Error('A API retornou uma lista inválida.');
  return data;
}

export const adminApi = {
  async verifyAccess(options) {
    const { data } = await api.get('/admin/session', options);
    if (data?.admin !== true) throw new Error('Acesso restrito a administradores.');
    return data;
  },
  listProducts: (options) => list('/products', options),
  listCategories: (options) => list('/categories', options),
  listOrders: (options) => list('/orders', options),
  async getProduct(id, options) {
    const { data } = await api.get('/products/' + encodeURIComponent(id), options);
    if (!data?.id) throw new Error('Produto não encontrado.');
    return data;
  },
  async createProduct(payload) {
    const { data } = await api.post('/products', payload);
    notifyCatalogChanged();
    return data;
  },
  async updateProduct(id, payload) {
    const { data } = await api.put('/products/' + encodeURIComponent(id), payload);
    notifyCatalogChanged();
    return data;
  },
  async deleteProduct(id) {
    await api.delete('/products/' + encodeURIComponent(id));
    notifyCatalogChanged();
  },
  async getCategory(id, options) {
    const { data } = await api.get('/categories/' + encodeURIComponent(id), options);
    if (!data?.id) throw new Error('Categoria não encontrada.');
    return data;
  },
  async createCategory(payload) {
    const { data } = await api.post('/categories', payload);
    notifyCatalogChanged();
    return data;
  },
  async updateCategory(id, payload) {
    const { data } = await api.put('/categories/' + encodeURIComponent(id), payload);
    notifyCatalogChanged();
    return data;
  },
  async updateOrderStatus(id, status) {
    const { data } = await api.put('/orders/' + encodeURIComponent(id), { status });
    return data;
  },
};

export function productImageUrl(product) {
  const base = (api.defaults.baseURL || '/api').replace(/\/$/, '');
  if (product.path) return base + '/product-file/' + encodeURIComponent(product.path);
  if (product.url?.startsWith('/product-file/')) return base + product.url;
  return /^(https?:\/\/|\/)/i.test(product.url || '') ? product.url : '';
}

export function categoryImageUrl(category) {
  const base = (api.defaults.baseURL || '/api').replace(/\/$/, '');
  if (category.path) return base + '/category-file/' + encodeURIComponent(category.path);
  if (category.url?.startsWith('/category-file/')) return base + category.url;
  return /^(https?:\/\/|\/)/i.test(category.url || '') ? category.url : '';
}
