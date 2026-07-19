const path = require('path');
const { User } = require('./user.model');
const { Ad } = require('./ad.model');
const { Order } = require('./order.model');
const { AdReview } = require('./adReview.model');
const { SellerReview } = require('./sellerReview.model');
const { SellerApplication } = require('./sellerApplication.model');
const { CartItem } = require('./cartItem.model');
const { Notification } = require('./notification.model');

Ad.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });
User.hasMany(Ad, { foreignKey: 'sellerId' });

Order.belongsTo(User, { as: 'buyer', foreignKey: 'buyerId', onDelete: 'SET NULL' });
Order.belongsTo(User, { as: 'seller', foreignKey: 'sellerId', onDelete: 'SET NULL' });
Order.belongsTo(Ad, { foreignKey: 'adId', onDelete: 'SET NULL' });

AdReview.belongsTo(User, { as: 'buyer', foreignKey: 'buyerId' });
AdReview.belongsTo(Ad, { foreignKey: 'adId', onDelete: 'CASCADE' });
Ad.hasMany(AdReview, { foreignKey: 'adId', onDelete: 'CASCADE' });

SellerReview.belongsTo(User, { as: 'buyer', foreignKey: 'buyerId' });
SellerReview.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });

SellerApplication.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(SellerApplication, { foreignKey: 'userId' });

CartItem.belongsTo(User, { foreignKey: 'userId' });
CartItem.belongsTo(Ad, { foreignKey: 'adId', onDelete: 'CASCADE' });
User.hasMany(CartItem, { foreignKey: 'userId' });

Notification.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Notification, { foreignKey: 'userId' });

module.exports = {
  User,
  Ad,
  Order,
  AdReview,
  SellerReview,
  SellerApplication,
  CartItem,
  Notification,
};
