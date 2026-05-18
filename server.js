const path = require('path');
require('dotenv').config();

const app = require('./src/app');
const sequelize = require('./src/config/database');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected.');

    await sequelize.sync({ alter: true });
    console.log('✅ Database synced.');

    app.listen(PORT, () => {
      console.log(`🚀 ProSupply API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
})();
