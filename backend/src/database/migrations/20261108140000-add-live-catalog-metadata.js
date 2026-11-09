"use strict";

const manifest = require("../../../catalog/catalog.json");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.addColumn("categories", "slug", { type: Sequelize.STRING, allowNull: true }, options);
      await queryInterface.addColumn("categories", "description", { type: Sequelize.TEXT, allowNull: true }, options);
      await queryInterface.addColumn("products", "description", { type: Sequelize.TEXT, allowNull: true }, options);

      // Seed identities come from the ledger, never from names the admin may have edited.
      // Only new NULL metadata is filled; existing content is never overwritten.
      for (const category of manifest.categories) {
        await queryInterface.sequelize.query(
          'UPDATE categories c SET slug = COALESCE(c.slug, :slug), description = COALESCE(c.description, :description) FROM catalog_seed_entries e WHERE e.key = :key AND e.record_id = c.id',
          { ...options, replacements: { slug: category.slug, description: category.description || "", key: `category:${category.key}` } }
        );
      }
      for (const product of manifest.products) {
        await queryInterface.sequelize.query(
          'UPDATE products p SET description = :description FROM catalog_seed_entries e WHERE e.key = :key AND e.record_id = p.id AND p.description IS NULL',
          { ...options, replacements: { description: product.description || "", key: `product:${product.key}` } }
        );
      }
      await queryInterface.sequelize.query("UPDATE categories SET slug = 'category-' || id WHERE slug IS NULL", options);
      await queryInterface.sequelize.query("UPDATE categories SET description = '' WHERE description IS NULL", options);
      await queryInterface.sequelize.query("UPDATE products SET description = '' WHERE description IS NULL", options);
      await queryInterface.changeColumn("categories", "slug", { type: Sequelize.STRING, allowNull: false }, options);
      await queryInterface.changeColumn("categories", "description", { type: Sequelize.TEXT, allowNull: false, defaultValue: "" }, options);
      await queryInterface.changeColumn("products", "description", { type: Sequelize.TEXT, allowNull: false, defaultValue: "" }, options);
      await queryInterface.addIndex("categories", ["slug"], { ...options, name: "categories_slug_unique", unique: true });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("categories", "categories_slug_unique", { transaction });
      await queryInterface.removeColumn("products", "description", { transaction });
      await queryInterface.removeColumn("categories", "description", { transaction });
      await queryInterface.removeColumn("categories", "slug", { transaction });
    });
  },
};
