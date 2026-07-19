const { Op } = require('sequelize');
const sequelize = require('../config/database');

const getSimilarProducts = async (adId, limit = 8) => {
  const { Ad } = require('../models/ad.model');
  const { User } = require('../models/user.model');

  const sourceAd = await Ad.findByPk(adId);
  if (!sourceAd) return [];

  const price = parseFloat(sourceAd.price);
  const priceLow = price * 0.5;
  const priceHigh = price * 2.0;

  const whereClause = {
    id: { [Op.ne]: adId },
    status: 'active',
  };
  if (sourceAd.category) whereClause.category = sourceAd.category;
  if (sourceAd.brand) whereClause.brand = sourceAd.brand;

  const candidates = await Ad.findAll({
    where: whereClause,
    include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
    limit: 50,
  });

  const scored = candidates.map(ad => {
    let score = 0;
    if (sourceAd.category && ad.category === sourceAd.category) score += 3;
    if (sourceAd.brand && ad.brand === sourceAd.brand) score += 2;
    const adPrice = parseFloat(ad.price);
    if (adPrice >= priceLow && adPrice <= priceHigh) score += 1;
    if (sourceAd.countryOfOrigin && ad.countryOfOrigin === sourceAd.countryOfOrigin) score += 1;
    if (ad.avgRating && parseFloat(ad.avgRating) >= 3) score += 0.5;
    const sellerTrust = ad.seller?.trustScore ? parseFloat(ad.seller.trustScore) : 50;
    score += (sellerTrust / 100) * 0.5;
    return { ad, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.ad);
};

const getAlternatives = async (adId, limit = 6) => {
  const { Ad } = require('../models/ad.model');
  const { User } = require('../models/user.model');

  const sourceAd = await Ad.findByPk(adId);
  if (!sourceAd || !sourceAd.category) return [];

  const price = parseFloat(sourceAd.price);
  const priceLow = price * 0.3;
  const priceHigh = price * 3.0;

  const alternatives = await Ad.findAll({
    where: {
      id: { [Op.ne]: adId },
      status: 'active',
      category: sourceAd.category,
      sellerId: { [Op.ne]: sourceAd.sellerId },
      price: { [Op.between]: [priceLow, priceHigh] },
    },
    include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
    order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
    limit,
  });

  return alternatives;
};

const getPersonalRecommendations = async (userId, limit = 10) => {
  const { Ad } = require('../models/ad.model');
  const { Order } = require('../models/order.model');
  const { User } = require('../models/user.model');

  const orders = await Order.findAll({
    where: { buyerId: userId, paymentStatus: 'paid' },
    attributes: ['adId'],
    raw: true,
  });

  const purchasedAdIds = orders.map(o => o.adId).filter(Boolean);
  if (purchasedAdIds.length === 0) {
    return Ad.findAll({
      where: { status: 'active' },
      include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
      order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
      limit,
    });
  }

  const purchasedAds = await Ad.findAll({
    where: { id: { [Op.in]: purchasedAdIds } },
    attributes: ['category', 'brand'],
    raw: true,
  });

  const categories = [...new Set(purchasedAds.map(a => a.category).filter(Boolean))];
  const brands = [...new Set(purchasedAds.map(a => a.brand).filter(Boolean))];

  let recommendations = await Ad.findAll({
    where: {
      id: { [Op.notIn]: purchasedAdIds },
      status: 'active',
      [Op.or]: [
        ...(categories.length > 0 ? [{ category: { [Op.in]: categories } }] : []),
        ...(brands.length > 0 ? [{ brand: { [Op.in]: brands } }] : []),
      ],
    },
    include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
    order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
    limit,
  });

  if (recommendations.length === 0) {
    recommendations = await Ad.findAll({
      where: { status: 'active', id: { [Op.notIn]: purchasedAdIds } },
      include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
      order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
      limit,
    });
  }

  if (recommendations.length === 0) {
    recommendations = await Ad.findAll({
      where: { status: 'active' },
      include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
      order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
      limit,
    });
  }

  return recommendations;
};

const getMatchedSellers = async (userId, limit = 5) => {
  const { Order } = require('../models/order.model');
  const { Ad } = require('../models/ad.model');
  const { User } = require('../models/user.model');

  const orders = await Order.findAll({
    where: { buyerId: userId, paymentStatus: 'paid' },
    attributes: ['adId'],
    raw: true,
  });

  const purchasedAdIds = orders.map(o => o.adId).filter(Boolean);
  let preferredCategories = [];

  if (purchasedAdIds.length > 0) {
    const ads = await Ad.findAll({
      where: { id: { [Op.in]: purchasedAdIds } },
      attributes: ['category'],
      raw: true,
    });
    preferredCategories = [...new Set(ads.map(a => a.category).filter(Boolean))];
  }

  const sellers = await User.findAll({
    where: { sellerStatus: 'approved', isBanned: false, id: { [Op.ne]: userId } },
    attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore', 'sellerStatus'],
  });

  const scoredSellers = [];
  for (const seller of sellers) {
    let score = 0;

    const trust = parseFloat(seller.trustScore) || 50;
    score += (trust / 100) * 30;

    const rating = parseFloat(seller.avgSellerRating) || 0;
    score += (rating / 5) * 25;

    if (preferredCategories.length > 0) {
      const sellerAds = await Ad.findAll({
        where: { sellerId: seller.id, status: 'active' },
        attributes: ['category'],
        raw: true,
      });
      const sellerCategories = [...new Set(sellerAds.map(a => a.category).filter(Boolean))];
      const overlap = sellerCategories.filter(c => preferredCategories.includes(c)).length;
      score += Math.min(overlap / preferredCategories.length, 1) * 25;
    }

    const totalOrders = await Order.count({ where: { sellerId: seller.id } });
    const deliveredOrders = await Order.count({ where: { sellerId: seller.id, orderStatus: 'delivered' } });
    const fulfillmentRate = totalOrders > 0 ? deliveredOrders / totalOrders : 0.5;
    score += fulfillmentRate * 20;

    scoredSellers.push({
      id: seller.id,
      fullName: seller.fullName,
      avgSellerRating: seller.avgSellerRating,
      trustScore: seller.trustScore,
      matchScore: Math.round(score),
      fulfillmentRate: Math.round(fulfillmentRate * 100),
    });
  }

  scoredSellers.sort((a, b) => b.matchScore - a.matchScore);
  return scoredSellers.slice(0, limit);
};

module.exports = {
  getSimilarProducts,
  getAlternatives,
  getPersonalRecommendations,
  getMatchedSellers,
};
