export function priceToCents(value) {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error('Preço inválido no catálogo.');
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Preço inválido no catálogo.');
  return cents;
}
function imageUrl(base, kind, item) {
  return item.path ? base.replace(/\/$/, '') + '/' + kind + '-file/' + encodeURIComponent(item.path) : '';
}
export function normalizeCatalog(data, base = '/api') {
  if (!Array.isArray(data?.categories) || !Array.isArray(data?.products)) throw new Error('O catálogo recebido é inválido.');
  const categories = data.categories.map((category) => {
    if (!category.id || !category.slug || !category.name) throw new Error('Categoria inválida no catálogo.');
    return {
      id: category.sourceKey || 'category-' + category.id, databaseId: String(category.id),
      slug: category.slug, name: category.name, menuName: category.name,
      description: category.description || '', captionLines: category.description ? [category.description] : [],
      accessibleLabel: category.name + (category.description ? ': ' + category.description : ''),
      image: imageUrl(base, 'category', category),
    };
  });
  const categoryIds = new Set(categories.map((category) => category.databaseId));
  const products = data.products.filter((product) => categoryIds.has(String(product.category_id))).map((product) => {
    if (!product.id || !product.name) throw new Error('Produto inválido no catálogo.');
    return {
      id: product.sourceKey || 'product-' + product.id, databaseId: String(product.id),
      categoryId: String(product.category_id), name: product.name, description: product.description || '',
      priceCents: priceToCents(product.price), offer: product.offer === true,
      image: imageUrl(base, 'product', product), imageAlt: product.name,
    };
  });
  return { categories, products };
}
