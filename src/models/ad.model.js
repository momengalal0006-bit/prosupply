const { DataTypes } = require('sequelize');
const path = require('path');
const sequelize = require('../config/database');

const Ad = sequelize.define('Ad', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  specs: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  images: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  avgRating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'deleted'),
    allowNull: false,
    defaultValue: 'active',
  },
  countryOfOrigin: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  warrantyMonths: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  tableName: 'ads',
  timestamps: true,
  underscored: false,
});

module.exports = { Ad };
