const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const PERMISSIONS = {
  admin:    ['read', 'write', 'delete', 'manage_users', 'manage_roles'],
  supplier: ['read', 'write', 'manage_products'],
  buyer:    ['read', 'place_orders'],
  guest:    ['read'],
};

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    },
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    allowNull: false,
    defaultValue: 'user',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sellerStatus: {
    type: DataTypes.ENUM('none', 'pending_review', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'none',
  },
  avgSellerRating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  deliveryStreet: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  deliveryBuilding: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  deliveryArea: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  deliveryCity: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  deliveryDistrict: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  deliveryNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  trustScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 50,
  },
  totalEarnings: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  pendingBalance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  totalOrders: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  totalCommissionEarned: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  totalPlatformRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  totalOrdersProcessed: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  tableName: 'users',
  timestamps: true,
});

User.prototype.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

User.prototype.hasPermission = function (permission) {
  const rolePerms = PERMISSIONS[this.role];
  return rolePerms ? rolePerms.includes(permission) : false;
};

User.prototype.toSafeObject = function () {
  const values = this.toJSON();
  delete values.password;
  delete values.passwordResetToken;
  delete values.passwordResetExpires;
  delete values.refreshToken;
  return values;
};

module.exports = { User, PERMISSIONS };
