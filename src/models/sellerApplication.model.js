const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SellerApplication = sequelize.define('SellerApplication', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  documents: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  status: {
    type: DataTypes.ENUM('pending_review', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending_review',
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'seller_applications',
  timestamps: true,
  underscored: false,
});

module.exports = { SellerApplication };
