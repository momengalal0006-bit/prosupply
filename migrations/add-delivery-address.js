/**
 * Migration: Add delivery address fields to users and orders tables.
 *
 * Run once:  node migrations/add-delivery-address.js
 */
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../Graduation project auth/prosupply-auth/.env'),
});

const sequelize = require(path.resolve(
  __dirname,
  '../Graduation project auth/prosupply-auth/src/config/database'
));

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB.');

    const qi = sequelize.getQueryInterface();

    // ── Users table: delivery address fields ────────────────────
    const userCols = await qi.describeTable('users');

    if (!userCols.deliveryStreet) {
      await qi.addColumn('users', 'deliveryStreet', {
        type: sequelize.constructor.DataTypes.STRING(255),
        allowNull: true,
      });
      console.log('  + users.deliveryStreet');
    }

    if (!userCols.deliveryBuilding) {
      await qi.addColumn('users', 'deliveryBuilding', {
        type: sequelize.constructor.DataTypes.STRING(100),
        allowNull: true,
      });
      console.log('  + users.deliveryBuilding');
    }

    if (!userCols.deliveryArea) {
      await qi.addColumn('users', 'deliveryArea', {
        type: sequelize.constructor.DataTypes.STRING(150),
        allowNull: true,
      });
      console.log('  + users.deliveryArea');
    }

    if (!userCols.deliveryCity) {
      await qi.addColumn('users', 'deliveryCity', {
        type: sequelize.constructor.DataTypes.STRING(100),
        allowNull: true,
      });
      console.log('  + users.deliveryCity');
    }

    if (!userCols.deliveryDistrict) {
      await qi.addColumn('users', 'deliveryDistrict', {
        type: sequelize.constructor.DataTypes.STRING(100),
        allowNull: true,
      });
      console.log('  + users.deliveryDistrict');
    }

    if (!userCols.deliveryNotes) {
      await qi.addColumn('users', 'deliveryNotes', {
        type: sequelize.constructor.DataTypes.TEXT,
        allowNull: true,
      });
      console.log('  + users.deliveryNotes');
    }

    // ── Orders table: snapshot the delivery address used ────────
    const orderCols = await qi.describeTable('orders');

    if (!orderCols.deliveryAddress) {
      await qi.addColumn('orders', 'deliveryAddress', {
        type: sequelize.constructor.DataTypes.TEXT,
        allowNull: true,
      });
      console.log('  + orders.deliveryAddress');
    }

    console.log('\n✅ Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();
