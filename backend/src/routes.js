import { Router } from "express";
import UserController from "./app/controllers/UserController";
import LoginController from "./app/controllers/LoginController";
import ProductsController from "./app/controllers/ProductsController";
import authMiddleware from "./app/middlewares/auth";
import CategoryController from "./app/controllers/CategoryController";
import OrderController from "./app/controllers/OrderController";
import adminMiddleware from "./app/middlewares/admin";
import productUpload from "./app/middlewares/productUpload";
import CatalogController from "./app/controllers/CatalogController";

const routes = new Router();

routes.post("/users", UserController.store);

routes.post("/login", LoginController.store);

routes.get("/catalog", CatalogController.index);

routes.use(authMiddleware);

routes.get("/admin/session", adminMiddleware, (request, response) => {
  const { id, name, email } = request.adminUser;
  return response.json({ id, name, email, admin: true });
});

routes.post("/products", adminMiddleware, productUpload, ProductsController.store);
routes.get("/products", ProductsController.index);
routes.get("/products/:id", adminMiddleware, ProductsController.show);
routes.put("/products/:id", adminMiddleware, productUpload, ProductsController.update);
routes.delete("/products/:id", adminMiddleware, ProductsController.destroy);

routes.post("/categories", adminMiddleware, productUpload, CategoryController.store);
routes.get("/categories", CategoryController.index);
routes.get("/categories/:id", adminMiddleware, CategoryController.show);
routes.put("/categories/:id", adminMiddleware, productUpload, CategoryController.update);

routes.post("/orders", OrderController.store);
routes.put("/orders/:id", adminMiddleware, OrderController.update);
routes.get("/orders", OrderController.index);

export default routes;
