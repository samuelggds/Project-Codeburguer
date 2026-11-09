import * as Yup from "yup";
import Category from "../models/Category";
import { createCategorySlug } from "../lib/categorySlug.cjs";
import { isSupportedImage, saveProductImage, discardNewProductImage } from "../lib/productImages";

const fields = {
  name: Yup.string().trim().min(2).max(120),
  description: Yup.string().trim().max(500),
};
const createSchema = Yup.object({ name: fields.name.required(), description: fields.description.required() });
const updateSchema = Yup.object(fields).test("nonempty", "Informe pelo menos um campo para atualizar", function (value) {
  return this.options.context?.hasImage || Object.keys(value).length > 0;
});

function validId(value) {
  return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
}

async function validatePayload(request, response, schema) {
  try {
    return await schema.validate(request.body, { abortEarly: false, stripUnknown: true, context: { hasImage: Boolean(request.file) } });
  } catch (error) {
    if (!(error instanceof Yup.ValidationError)) throw error;
    response.status(400).json({ error: error.errors });
    return null;
  }
}

function writeError(error, response, operation) {
  if (error.name === "SequelizeUniqueConstraintError") return response.status(409).json({ error: "Categoria já existente" });
  console.error(`Erro ao ${operation} categoria`, error);
  return response.status(500).json({ error: `Não foi possível ${operation} a categoria` });
}

class CategoryController {
  async store(request, response) {
    let path;
    try {
      const data = await validatePayload(request, response, createSchema);
      if (!data) return;
      if (!request.file) return response.status(400).json({ error: "Selecione uma imagem para a categoria" });
      if (!isSupportedImage(request.file)) return response.status(400).json({ error: "O arquivo não contém uma imagem PNG, JPEG ou WebP válida" });
      path = await saveProductImage(request.file);
      const category = await Category.create({ ...data, path, slug: createCategorySlug(data.name) });
      return response.status(201).json(category);
    } catch (error) {
      await discardNewProductImage(path);
      return writeError(error, response, "cadastrar");
    }
  }

  async index(request, response) {
    try {
      return response.json(await Category.findAll({ order: [["id", "ASC"]] }));
    } catch (error) {
      console.error("Erro ao listar categorias", error);
      return response.status(500).json({ error: "Não foi possível listar as categorias" });
    }
  }

  async show(request, response) {
    try {
      if (!validId(request.params.id)) return response.status(400).json({ error: "ID de categoria inválido" });
      const category = await Category.findByPk(request.params.id);
      if (!category) return response.status(404).json({ error: "Categoria não encontrada" });
      return response.json(category);
    } catch (error) {
      console.error("Erro ao consultar categoria", error);
      return response.status(500).json({ error: "Não foi possível consultar a categoria" });
    }
  }

  async update(request, response) {
    let path;
    try {
      if (!validId(request.params.id)) return response.status(400).json({ error: "ID de categoria inválido" });
      const category = await Category.findByPk(request.params.id);
      if (!category) return response.status(404).json({ error: "Categoria não encontrada" });
      const data = await validatePayload(request, response, updateSchema);
      if (!data) return;
      if (request.file) {
        if (!isSupportedImage(request.file)) return response.status(400).json({ error: "O arquivo não contém uma imagem PNG, JPEG ou WebP válida" });
        path = await saveProductImage(request.file);
        data.path = path;
      }
      // The slug remains unchanged after renaming, so shared menu links stay valid.
      await category.update(data);
      return response.json(category);
    } catch (error) {
      await discardNewProductImage(path);
      return writeError(error, response, "atualizar");
    }
  }
}

export default new CategoryController();
