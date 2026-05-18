const { DataTypes } = require('sequelize');
const path = require('path');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  adId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  adTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  commissionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  commissionRate: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '6%',
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'online',
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  orderStatus: {
    type: DataTypes.ENUM('placed', 'confirmed', 'shipped', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'placed',
  },
  buyerHidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  orderGroupId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: false,
});

module.exports = { Order };
