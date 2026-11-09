import Category from "../models/Category";
import Products from "../models/Products";
import CatalogSeedEntry from "../models/CatalogSeedEntry";

function imageUrl(kind, path) {
  return path ? `/${kind}-file/${encodeURIComponent(path)}` : null;
}

class CatalogController {
  async index(request, response) {
    response.set("Cache-Control", "no-store");
    try {
      const [categories, products, entries] = await Promise.all([
        Category.findAll({ attributes: ["id", "slug", "name", "description", "path"], order: [["id", "ASC"]] }),
        Products.findAll({ attributes: ["id", "name", "description", "price", "path", "offer", "category_id"], order: [["id", "ASC"]] }),
        CatalogSeedEntry.findAll({ attributes: ["key", "record_id"], order: [["key", "ASC"]] }),
      ]);
      const sourceKeys = new Map(entries.map(({ key, record_id }) => [
        `${key.split(":")[0]}:${record_id}`, key.slice(key.indexOf(":") + 1),
      ]));
      // Explicit public projections keep account/order fields out of this guest endpoint.
      return response.json({
        categories: categories.map(({ id, slug, name, description, path }) => ({
          id, slug, name, description: description || "", path, url: imageUrl("category", path),
          ...(sourceKeys.has(`category:${id}`) ? { sourceKey: sourceKeys.get(`category:${id}`) } : {}),
        })),
        products: products.map(({ id, name, description, price, path, offer, category_id }) => ({
          id, name, description: description || "", price: String(price), path,
          url: imageUrl("product", path), offer, category_id,
          ...(sourceKeys.has(`product:${id}`) ? { sourceKey: sourceKeys.get(`product:${id}`) } : {}),
        })),
      });
    } catch (error) {
      console.error("Erro ao consultar catálogo", error);
      return response.status(500).json({ error: "Não foi possível carregar o catálogo" });
    }
  }
}

export default new CatalogController();
