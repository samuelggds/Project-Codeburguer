"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Keep legacy numbers unchanged: 29 remains R$29.00; new values can include cents.
    await queryInterface.changeColumn("products", "price", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS count FROM "products" WHERE "price" <> TRUNC("price")'
    );
    if (Number(rows[0].count) > 0) {
      throw new Error("Não é possível reverter price para INTEGER enquanto houver preços com centavos.");
    }
    await queryInterface.changeColumn("products", "price", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
