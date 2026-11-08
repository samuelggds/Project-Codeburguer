import { api } from '../../services/api';

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
    return data;
  },
  async updateProduct(id, payload) {
    const { data } = await api.put('/products/' + encodeURIComponent(id), payload);
    return data;
  },
  async deleteProduct(id) {
    await api.delete('/products/' + encodeURIComponent(id));
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
