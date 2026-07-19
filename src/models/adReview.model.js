const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdReview = sequelize.define('AdReview', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  adId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  reviewText: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'ad_reviews',
  timestamps: true,
  underscored: false,
  indexes: [
    { unique: true, fields: ['buyerId', 'adId'] },
  ],
});

module.exports = { AdReview };
