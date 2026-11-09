import Sequelize, { Model } from "sequelize";

class CatalogSeedEntry extends Model {
  static init(sequelize) {
    super.init({
      key: { type: Sequelize.STRING, primaryKey: true },
      record_id: Sequelize.INTEGER,
    }, { sequelize, tableName: "catalog_seed_entries", timestamps: false });
    return this;
  }
}

export default CatalogSeedEntry;
