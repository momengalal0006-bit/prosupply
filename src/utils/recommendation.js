/**
 * Recommendation Engine — Content-based + Collaborative Filtering
 * 
 * Provides:
 * 1. getSimilarProducts(adId)       — same category/brand, scored by relevance
 * 2. getAlternatives(adId)          — same category, different seller (substitutes)
 * 3. getPersonalRecommendations(userId) — based on purchase history
 */
const { Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Score-based similar product finder.
 * Weights: category=3, brand=2, priceRange=1, sameOrigin=1
 */
const getSimilarProducts = async (adId, limit = 8) => {
  const { Ad } = require('../models/ad.model');
  const { User } = require('../models/user.model');

  const sourceAd = await Ad.findByPk(adId);
  if (!sourceAd) return [];

  const price = parseFloat(sourceAd.price);
  const priceLow = price * 0.5;
  const priceHigh = price * 2.0;

  // Fetch candidates: MUST have the same category AND same brand (if defined), exclude self and deleted
  const whereClause = {
    id: { [Op.ne]: adId },
    status: 'active',
  };
  if (sourceAd.category) whereClause.category = sourceAd.category;
  if (sourceAd.brand) whereClause.brand = sourceAd.brand;

  const candidates = await Ad.findAll({
    where: whereClause,
    include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
    limit: 50, // fetch a pool to score
  });

  // Score each candidate
  const scored = candidates.map(ad => {
    let score = 0;
    if (sourceAd.category && ad.category === sourceAd.category) score += 3;
    if (sourceAd.brand && ad.brand === sourceAd.brand) score += 2;
    const adPrice = parseFloat(ad.price);
    if (adPrice >= priceLow && adPrice <= priceHigh) score += 1;
    if (sourceAd.countryOfOrigin && ad.countryOfOrigin === sourceAd.countryOfOrigin) score += 1;
    if (ad.avgRating && parseFloat(ad.avgRating) >= 3) score += 0.5;
    const sellerTrust = ad.seller?.trustScore ? parseFloat(ad.seller.trustScore) : 50;
    score += (sellerTrust / 100) * 0.5; // up to 0.5 bonus for trusted sellers
    return { ad, score };
  });

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.ad);
};

/**
 * Alternative products — same category, different seller (substitutes).
 */
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
      sellerId: { [Op.ne]: sourceAd.sellerId }, // different seller
      price: { [Op.between]: [priceLow, priceHigh] },
    },
    include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
    order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
    limit,
  });

  return alternatives;
};

/**
 * Personal recommendations — based on user's purchase history.
 * Finds categories & brands the user has bought, then recommends new products.
 */
const getPersonalRecommendations = async (userId, limit = 10) => {
  const { Ad } = require('../models/ad.model');
  const { Order } = require('../models/order.model');
  const { User } = require('../models/user.model');

  // Get user's purchased ad IDs
  const orders = await Order.findAll({
    where: { buyerId: userId, paymentStatus: 'paid' },
    attributes: ['adId'],
    raw: true,
  });

  const purchasedAdIds = orders.map(o => o.adId).filter(Boolean);
  if (purchasedAdIds.length === 0) {
    // Cold start: return top-rated products
    return Ad.findAll({
      where: { status: 'active' },
      include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
      order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
      limit,
    });
  }

  // Get categories and brands from purchased ads
  const purchasedAds = await Ad.findAll({
    where: { id: { [Op.in]: purchasedAdIds } },
    attributes: ['category', 'brand'],
    raw: true,
  });

  const categories = [...new Set(purchasedAds.map(a => a.category).filter(Boolean))];
  const brands = [...new Set(purchasedAds.map(a => a.brand).filter(Boolean))];

  // Find new products in those categories/brands user hasn't bought
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

  // If no personalized matches found, fallback to top-rated unpurchased items
  if (recommendations.length === 0) {
    recommendations = await Ad.findAll({
      where: { status: 'active', id: { [Op.notIn]: purchasedAdIds } },
      include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
      order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
      limit,
    });
  }

  // Absolute fallback: if they bought literally every item in the database, just show top-rated items
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

/**
 * Supplier-Buyer matching — find best sellers for a buyer.
 * Scores sellers based on:
 * - Category overlap with buyer's purchase history
 * - Seller rating
 * - Trust score
 * - Fulfillment rate (delivered vs total orders)
 */
const getMatchedSellers = async (userId, limit = 5) => {
  const { Order } = require('../models/order.model');
  const { Ad } = require('../models/ad.model');
  const { User } = require('../models/user.model');

  // Get buyer's preferred categories
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

  // Get all approved sellers
  const sellers = await User.findAll({
    where: { sellerStatus: 'approved', isBanned: false, id: { [Op.ne]: userId } },
    attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore', 'sellerStatus'],
  });

  // Score each seller
  const scoredSellers = [];
  for (const seller of sellers) {
    let score = 0;

    // Trust score contribution (0-30 points)
    const trust = parseFloat(seller.trustScore) || 50;
    score += (trust / 100) * 30;

    // Seller rating contribution (0-25 points)
    const rating = parseFloat(seller.avgSellerRating) || 0;
    score += (rating / 5) * 25;

    // Category overlap (0-25 points)
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

    // Fulfillment rate (0-20 points)
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
