require('dotenv').config({path: 'Graduation project auth/prosupply-auth/.env'});
const path = require('path');
const dbConfigPath = path.resolve('Graduation project auth/prosupply-auth/src/config/database');
const sequelize = require(dbConfigPath);

async function updateDB() {
  await sequelize.query('ALTER TABLE orders ALTER COLUMN "adId" DROP NOT NULL;');
  
  await sequelize.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_adId_fkey;');
  await sequelize.query('ALTER TABLE orders ADD CONSTRAINT orders_adId_fkey FOREIGN KEY ("adId") REFERENCES ads(id) ON DELETE SET NULL;');
  
  await sequelize.query('ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_adId_fkey;');
  await sequelize.query('ALTER TABLE cart_items ADD CONSTRAINT cart_items_adId_fkey FOREIGN KEY ("adId") REFERENCES ads(id) ON DELETE CASCADE;');
  
  await sequelize.query('ALTER TABLE ad_reviews DROP CONSTRAINT IF EXISTS ad_reviews_adId_fkey;');
  await sequelize.query('ALTER TABLE ad_reviews ADD CONSTRAINT ad_reviews_adId_fkey FOREIGN KEY ("adId") REFERENCES ads(id) ON DELETE CASCADE;');
  
  console.log('Database constraints updated successfully!');
  process.exit(0);
}
updateDB().catch(err => { console.error(err); process.exit(1); });
