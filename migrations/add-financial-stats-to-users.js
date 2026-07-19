'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    await queryInterface.addColumn('users', 'totalEarnings', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00,
    });
    await queryInterface.addColumn('users', 'pendingBalance', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00,
    });
    await queryInterface.addColumn('users', 'totalOrders', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn('users', 'totalCommissionEarned', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00,
    });
    await queryInterface.addColumn('users', 'totalPlatformRevenue', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00,
    });
    await queryInterface.addColumn('users', 'totalOrdersProcessed', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'totalEarnings');
    await queryInterface.removeColumn('users', 'pendingBalance');
    await queryInterface.removeColumn('users', 'totalOrders');
    await queryInterface.removeColumn('users', 'totalCommissionEarned');
    await queryInterface.removeColumn('users', 'totalPlatformRevenue');
    await queryInterface.removeColumn('users', 'totalOrdersProcessed');
  }
};
