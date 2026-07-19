const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/database');


require('../src/models/index');
const { User } = require('../src/models/user.model');

const SALT_ROUNDS = 12;

const seedAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    await sequelize.sync({ alter: true });
    console.log('✅ Database synced.');

    const adminEmail = 'youssefmostafakhaled2005@gmail.com';
    const existing = await User.findOne({ where: { email: adminEmail } });

    if (existing) {
      console.log('ℹ️  Admin user already exists. Updating role and password...');
      const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
      await existing.update({ role: 'admin', sellerStatus: 'none', isBanned: false, password: hashedPassword });
      console.log('✅ Admin user updated. Password reset to: admin123');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
      await User.create({
        fullName: 'Admin',
        email: adminEmail,
        phone: '+201000000000',
        password: hashedPassword,
        role: 'admin',
        sellerStatus: 'none',
        isBanned: false,
      });
      console.log('✅ Admin user created.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
