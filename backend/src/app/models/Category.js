import Sequelize, { Model } from "sequelize";

class Category extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        slug: Sequelize.STRING,
        description: Sequelize.TEXT,
        path: Sequelize.STRING,
        url: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.path ? `/category-file/${encodeURIComponent(this.path)}` : null;
          },
        },
      },
      {
        sequelize,
      }
    );
    return this;
  }
}

export default Category;
