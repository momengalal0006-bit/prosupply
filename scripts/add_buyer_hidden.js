require('dotenv').config({path: 'Graduation project auth/prosupply-auth/.env'});
const path = require('path');
const dbConfigPath = path.resolve('Graduation project auth/prosupply-auth/src/config/database');
const sequelize = require(dbConfigPath);

async function alterTable() {
  await sequelize.query('ALTER TABLE orders ADD COLUMN "buyerHidden" BOOLEAN DEFAULT false;');
  console.log('Column added');
  process.exit(0);
}
alterTable().catch(e => { console.error(e); process.exit(1); });
