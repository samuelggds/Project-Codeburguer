import Sequelize from "sequelize";
import dataConfig from "../config/database";

import User from "../app/models/User";
import Products from "../app/models/Products";
import Category from "../app/models/Category";
import Order from "../app/models/Order";
import CatalogSeedEntry from "../app/models/CatalogSeedEntry";

const models = [User, Products, Category, Order, CatalogSeedEntry];

class Database {
  constructor() {
    this.init();
  }

  init() {
    this.connection = new Sequelize(dataConfig);
    models
      .map((model) => model.init(this.connection))
      .map((model) => model.associate && model.associate(this.connection.models));
  }
}

export default new Database();
