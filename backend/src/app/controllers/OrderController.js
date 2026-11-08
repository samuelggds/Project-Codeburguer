import * as Yup from "yup";
import Products from "../models/Products";
import Category from "../models/Category";
import Order from "../models/Order";
import User from "../models/User";

const orderSchema = Yup.object().shape({
  products: Yup.array().min(1).required().of(
    Yup.object().shape({
      id: Yup.number().integer().positive().required(),
      quantity: Yup.number().integer().positive().required(),
    })
  ),
});

const ORDER_STATUSES = ["Pedido realizado", "Em preparação", "Pronto", "A caminho", "Entregue"];

function serializeOrder(order) {
  const data = order.toJSON();
  return {
    ...data,
    _id: data.id,
    user: { id: data.user_id, name: data.user_name },
  };
}

class OrderController {
  async store(request, response) {
    let payload;
    try {
      payload = await orderSchema.validate(request.body, { abortEarly: false, stripUnknown: true });
    } catch (error) {
      return response.status(400).json({ error: error.errors });
    }

    try {
      const ids = payload.products.map((product) => product.id);
      if (new Set(ids).size !== ids.length) {
        return response.status(400).json({ error: "Produtos repetidos no pedido" });
      }
      const catalog = await Products.findAll({
        where: { id: ids },
        include: [{ model: Category, as: "category", attributes: ["name"] }],
      });
      if (catalog.length !== ids.length) {
        return response.status(400).json({ error: "Um ou mais produtos não estão disponíveis" });
      }
      const productMap = new Map(catalog.map((product) => [product.id, product]));
      const products = payload.products.map((item) => {
        const product = productMap.get(item.id);
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category?.name || "",
          url: product.url,
          quantity: item.quantity,
        };
      });
      const order = await Order.create({
        user_id: request.userId,
        user_name: request.userName,
        products,
        status: "Pedido realizado",
      });
      return response.status(201).json(serializeOrder(order));
    } catch (error) {
      console.error("Erro ao criar pedido", error);
      return response.status(500).json({ error: "Não foi possível criar o pedido" });
    }
  }

  async index(request, response) {
    try {
      const user = await User.findByPk(request.userId);
      if (!user) return response.status(401).json({ error: "Sessão inválida" });
      const where = user.admin ? {} : { user_id: request.userId };
      const orders = await Order.findAll({ where, order: [["created_at", "DESC"]] });
      return response.json(orders.map((order) => serializeOrder(order)));
    } catch (error) {
      console.error("Erro ao listar pedidos", error);
      return response.status(500).json({ error: "Não foi possível listar os pedidos" });
    }
  }

  async update(request, response) {
    let payload;
    try {
      payload = await Yup.object().shape({ status: Yup.string().trim().oneOf(ORDER_STATUSES).required() })
        .validate(request.body, { abortEarly: false, stripUnknown: true });
    } catch (error) {
      return response.status(400).json({ error: error.errors });
    }
    try {
      const user = await User.findByPk(request.userId);
      if (!user?.admin) return response.status(403).json({ message: "Acesso restrito" });
      if (!Yup.string().uuid().isValidSync(request.params.id)) return response.status(400).json({ error: "ID de pedido inválido" });
      const order = await Order.findByPk(request.params.id);
      if (!order) return response.status(404).json({ message: "Pedido não encontrado" });
      await order.update({ status: payload.status });
      return response.json({ message: "Status atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar pedido", error);
      return response.status(500).json({ error: "Não foi possível atualizar o pedido" });
    }
  }
}

export default new OrderController();
