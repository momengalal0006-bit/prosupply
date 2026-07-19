const path = require('path');
const { AdReview, SellerReview, Ad, Order } = require(path.resolve(__dirname, '../../models/index'));
const { User } = require('../../models/user.model');
const sequelize = require('../../config/database');
const adRepo = require('../ads/ad.repository');

const createAdReview = async (adId, buyerId, { rating, reviewText }) => {
  
  const ad = await Ad.findByPk(adId);
  if (!ad || ad.status === 'deleted') {
    throw Object.assign(new Error('Ad not found.'), { statusCode: 404 });
  }

  
  if (ad.sellerId === buyerId) {
    throw Object.assign(new Error('You cannot review your own product.'), { statusCode: 403 });
  }

  
  const delivered = await Order.findOne({ where: { buyerId, adId } });
  if (!delivered) {
    throw Object.assign(new Error('You can review this product only after purchasing.'), { statusCode: 403, code: 'PURCHASE_REQUIRED' });
  }

  
  const existing = await AdReview.findOne({ where: { buyerId, adId } });
  if (existing) {
    throw Object.assign(new Error('You have already reviewed this product.'), { statusCode: 409, code: 'ALREADY_REVIEWED' });
  }

  const review = await AdReview.create({ buyerId, adId, rating, reviewText });

  
  const result = await AdReview.findOne({
    where: { adId },
    attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg']],
    raw: true,
  });
  await ad.update({ avgRating: parseFloat(result.avg || 0).toFixed(2) });

  return review;
};

const createSellerReview = async (sellerId, buyerId, { rating, comment }) => {
  
  const seller = await User.findByPk(sellerId);
  if (!seller) {
    throw Object.assign(new Error('Seller not found.'), { statusCode: 404 });
  }

  
  if (sellerId === buyerId) {
    throw Object.assign(new Error('You cannot review yourself.'), { statusCode: 403 });
  }

  
  const delivered = await Order.findOne({ where: { buyerId, sellerId } });
  if (!delivered) {
    throw Object.assign(new Error('You can review this seller only after purchasing from them.'), { statusCode: 403, code: 'PURCHASE_REQUIRED' });
  }

  
  const existing = await SellerReview.findOne({ where: { buyerId, sellerId } });
  if (existing) {
    throw Object.assign(new Error('You have already reviewed this seller.'), { statusCode: 409, code: 'ALREADY_REVIEWED' });
  }

  const review = await SellerReview.create({ buyerId, sellerId, rating, comment });

  
  const result = await SellerReview.findOne({
    where: { sellerId },
    attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg']],
    raw: true,
  });
  await seller.update({ avgSellerRating: parseFloat(result.avg || 0).toFixed(2) });

  return review;
};

const getSellerProfile = async (sellerId, query) => {
  const seller = await User.findByPk(sellerId, {
    attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore', 'sellerStatus', 'createdAt'],
  });
  if (!seller || seller.sellerStatus !== 'approved') {
    throw Object.assign(new Error('Seller not found.'), { statusCode: 404 });
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 12;
  const offset = (page - 1) * limit;

  const adsResult = await adRepo.findAll({ sellerId }, { limit, offset });

  const reviews = await SellerReview.findAll({
    where: { sellerId },
    include: [{ model: User, as: 'buyer', attributes: ['id', 'fullName'] }],
    order: [['createdAt', 'DESC']],
  });

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });
  const total = reviews.length;
  const average = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : '0.0';

  return {
    seller: { id: seller.id, fullName: seller.fullName, avgSellerRating: seller.avgSellerRating, trustScore: seller.trustScore, createdAt: seller.createdAt },
    ads: {
      items: adsResult.rows,
      pagination: { page, limit, totalItems: adsResult.count, totalPages: Math.ceil(adsResult.count / limit) },
    },
    reviews,
    reviewStats: { average: parseFloat(average), total, distribution },
  };
};

module.exports = { createAdReview, createSellerReview, getSellerProfile };
