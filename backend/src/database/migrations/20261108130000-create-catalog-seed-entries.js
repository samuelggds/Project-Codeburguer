"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("catalog_seed_entries", {
      key: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      // No foreign key: deleting a product/category must preserve its import tombstone.
      record_id: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("catalog_seed_entries");
  },
};
