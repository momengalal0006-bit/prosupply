const { DataTypes } = require('sequelize');
const path = require('path');
const sequelize = require('../config/database');

const SellerReview = sequelize.define('SellerReview', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'seller_reviews',
  timestamps: true,
  underscored: false,
  indexes: [
    { unique: true, fields: ['buyerId', 'sellerId'] },
  ],
});

module.exports = { SellerReview };
