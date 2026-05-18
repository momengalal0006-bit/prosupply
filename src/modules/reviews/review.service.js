const path = require('path');
const { AdReview, SellerReview, Ad, Order } = require(path.resolve(__dirname, '../../models/index'));
const { User } = require('../../models/user.model');
const sequelize = require('../../config/database');

const createAdReview = async (adId, buyerId, { rating, reviewText }) => {
  // Check ad exists
  const ad = await Ad.findByPk(adId);
  if (!ad || ad.status === 'deleted') {
    throw Object.assign(new Error('Ad not found.'), { statusCode: 404 });
  }

  // Prevent self-review
  if (ad.sellerId === buyerId) {
    throw Object.assign(new Error('You cannot review your own product.'), { statusCode: 403 });
  }

  // Allow review if order exists
  const delivered = await Order.findOne({ where: { buyerId, adId } });
  if (!delivered) {
    throw Object.assign(new Error('You can review this product only after purchasing.'), { statusCode: 403, code: 'PURCHASE_REQUIRED' });
  }

  // Check duplicate
  const existing = await AdReview.findOne({ where: { buyerId, adId } });
  if (existing) {
    throw Object.assign(new Error('You have already reviewed this product.'), { statusCode: 409, code: 'ALREADY_REVIEWED' });
  }

  const review = await AdReview.create({ buyerId, adId, rating, reviewText });

  // Recalculate avg rating
  const result = await AdReview.findOne({
    where: { adId },
    attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg']],
    raw: true,
  });
  await ad.update({ avgRating: parseFloat(result.avg || 0).toFixed(2) });

  return review;
};

const createSellerReview = async (sellerId, buyerId, { rating, comment }) => {
  // Check seller exists
  const seller = await User.findByPk(sellerId);
  if (!seller) {
    throw Object.assign(new Error('Seller not found.'), { statusCode: 404 });
  }

  // Prevent self-review
  if (sellerId === buyerId) {
    throw Object.assign(new Error('You cannot review yourself.'), { statusCode: 403 });
  }

  // Allow seller review if order exists
  const delivered = await Order.findOne({ where: { buyerId, sellerId } });
  if (!delivered) {
    throw Object.assign(new Error('You can review this seller only after purchasing from them.'), { statusCode: 403, code: 'PURCHASE_REQUIRED' });
  }

  // Check duplicate
  const existing = await SellerReview.findOne({ where: { buyerId, sellerId } });
  if (existing) {
    throw Object.assign(new Error('You have already reviewed this seller.'), { statusCode: 409, code: 'ALREADY_REVIEWED' });
  }

  const review = await SellerReview.create({ buyerId, sellerId, rating, comment });

  // Recalculate avg seller rating
  const result = await SellerReview.findOne({
    where: { sellerId },
    attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg']],
    raw: true,
  });
  await seller.update({ avgSellerRating: parseFloat(result.avg || 0).toFixed(2) });

  return review;
};

module.exports = { createAdReview, createSellerReview };
