import * as Yup from "yup";
import Products from "../models/Products";
import Category from "../models/Category";
import { isSupportedImage, saveProductImage, discardNewProductImage } from "../lib/productImages";

const fields = {
  name: Yup.string().trim().min(2).max(120),
  description: Yup.string().trim().max(1000),
  // API values are Brazilian reais; DECIMAL preserves cents without scaling legacy values.
  price: Yup.number().typeError("Preço inválido").positive().max(99999999.99)
    .test("currency", "O preço deve ter no máximo duas casas decimais", (value) =>
      value === undefined || /^\d+(\.\d{1,2})?$/.test(String(value))),
  category_id: Yup.number().integer().positive(),
  offer: Yup.boolean(),
};
const createSchema = Yup.object({
  name: fields.name.required(),
  description: fields.description.default(""),
  price: fields.price.required(),
  category_id: fields.category_id.required(),
  offer: fields.offer.default(false),
});
const updateSchema = Yup.object(fields).test("nonempty", "Informe pelo menos um campo para atualizar", function (value) {
  return this.options.context?.hasImage || Object.keys(value).length > 0;
});
const includeCategory = [{ model: Category, as: "category", attributes: ["id", "name"] }];

function validId(value) {
  return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
}

async function validatePayload(request, response, schema) {
  try {
    const data = await schema.validate(request.body, {
      abortEarly: false, stripUnknown: true, context: { hasImage: Boolean(request.file) },
    });
    if (data.category_id !== undefined && !await Category.findByPk(data.category_id)) {
      response.status(400).json({ error: "Categoria não encontrada" });
      return null;
    }
    return data;
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      response.status(400).json({ error: error.errors });
      return null;
    }
    throw error;
  }
}

class ProductsController {
  async store(request, response) {
    let path;
    try {
      const data = await validatePayload(request, response, createSchema);
      if (!data) return;
      if (!request.file) return response.status(400).json({ error: "Selecione uma imagem para o produto" });
      if (!isSupportedImage(request.file)) return response.status(400).json({ error: "O arquivo não contém uma imagem PNG, JPEG ou WebP válida" });
      path = await saveProductImage(request.file);
      const product = await Products.create({ ...data, path });
      return response.status(201).json(product);
    } catch (error) {
      await discardNewProductImage(path);
      console.error("Erro ao cadastrar produto", error);
      return response.status(500).json({ error: "Não foi possível cadastrar o produto" });
    }
  }

  async index(request, response) {
    try {
      const categoryId = request.query.category_id;
      if (categoryId !== undefined && !validId(categoryId)) return response.status(400).json({ error: "ID de categoria inválido" });
      const products = await Products.findAll({
        include: includeCategory, order: [["id", "ASC"]],
        ...(categoryId !== undefined ? { where: { category_id: Number(categoryId) } } : {}),
      });
      return response.json(products);
    } catch (error) {
      console.error("Erro ao listar produtos", error);
      return response.status(500).json({ error: "Não foi possível listar os produtos" });
    }
  }

  async show(request, response) {
    try {
      if (!validId(request.params.id)) return response.status(400).json({ error: "ID de produto inválido" });
      const product = await Products.findByPk(request.params.id, { include: includeCategory });
      if (!product) return response.status(404).json({ error: "Produto não encontrado" });
      return response.json(product);
    } catch (error) {
      console.error("Erro ao consultar produto", error);
      return response.status(500).json({ error: "Não foi possível consultar o produto" });
    }
  }

  async update(request, response) {
    let path;
    try {
      if (!validId(request.params.id)) return response.status(400).json({ error: "ID de produto inválido" });
      const product = await Products.findByPk(request.params.id);
      if (!product) return response.status(404).json({ error: "Produto não encontrado" });
      const data = await validatePayload(request, response, updateSchema);
      if (!data) return;
      if (request.file) {
        if (!isSupportedImage(request.file)) return response.status(400).json({ error: "O arquivo não contém uma imagem PNG, JPEG ou WebP válida" });
        path = await saveProductImage(request.file);
        data.path = path;
      }
      await product.update(data);
      // Keep old images: existing orders store their historical image URL.
      return response.json(product);
    } catch (error) {
      await discardNewProductImage(path);
      console.error("Erro ao atualizar produto", error);
      return response.status(500).json({ error: "Não foi possível atualizar o produto" });
    }
  }

  async destroy(request, response) {
    try {
      if (!validId(request.params.id)) return response.status(400).json({ error: "ID de produto inválido" });
      const product = await Products.findByPk(request.params.id);
      if (!product) return response.status(404).json({ error: "Produto não encontrado" });
      await product.destroy();
      // Orders use JSONB snapshots; deleting a catalog entry never rewrites history.
      return response.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir produto", error);
      return response.status(500).json({ error: "Não foi possível excluir o produto" });
    }
  }
}

export default new ProductsController();
