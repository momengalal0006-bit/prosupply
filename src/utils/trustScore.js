const { Op } = require('sequelize');
const sequelize = require('../config/database');

const calculateTrustScore = async (sellerId) => {
  const { User } = require('../models/user.model');
  const { Ad } = require('../models/ad.model');
  const { Order } = require('../models/order.model');
  const { AdReview } = require('../models/adReview.model');
  const { SellerReview } = require('../models/sellerReview.model');
  const { SellerApplication } = require('../models/sellerApplication.model');

  const seller = await User.findByPk(sellerId);
  if (!seller) return { score: 0, flags: ['User not found'], breakdown: {} };

  let score = 50;
  const flags = [];
  const breakdown = {};

  const accountAgeDays = Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const ageScore = Math.min(accountAgeDays / 30, 1) * 10;
  score += ageScore;
  breakdown.accountAge = { days: accountAgeDays, points: Math.round(ageScore * 10) / 10 };

  if (accountAgeDays < 7) {
    flags.push('New account (less than 7 days old)');
  }

  const application = await SellerApplication.findOne({
    where: { userId: sellerId, status: 'approved' },
  });
  if (application) {
    score += 10;
    breakdown.verified = { status: true, points: 10 };
  } else {
    breakdown.verified = { status: false, points: 0 };
    flags.push('Seller application not verified');
  }

  const totalOrders = await Order.count({ where: { sellerId } });
  const deliveredOrders = await Order.count({ where: { sellerId, orderStatus: 'delivered' } });
  const cancelledOrders = await Order.count({ where: { sellerId, orderStatus: 'cancelled' } });

  if (totalOrders > 0) {
    const fulfillmentRate = deliveredOrders / totalOrders;
    const fulfillmentScore = fulfillmentRate * 15;
    score += fulfillmentScore;
    breakdown.fulfillment = {
      total: totalOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
      rate: Math.round(fulfillmentRate * 100),
      points: Math.round(fulfillmentScore * 10) / 10,
    };

    if (fulfillmentRate < 0.5 && totalOrders >= 3) {
      flags.push(`Low fulfillment rate (${Math.round(fulfillmentRate * 100)}%)`);
      score -= 5;
    }
  } else {
    breakdown.fulfillment = { total: 0, delivered: 0, cancelled: 0, rate: 0, points: 0 };
  }

  const avgRating = parseFloat(seller.avgSellerRating) || 0;
  const ratingScore = (avgRating / 5) * 10;
  score += ratingScore;
  breakdown.rating = { average: avgRating, points: Math.round(ratingScore * 10) / 10 };

  const sellerAds = await Ad.findAll({
    where: { sellerId },
    attributes: ['id'],
    raw: true,
  });
  const adIds = sellerAds.map(a => a.id);

  if (adIds.length > 0) {
    const reviews = await AdReview.findAll({
      where: { adId: { [Op.in]: adIds } },
      attributes: ['rating', 'buyerId', 'createdAt'],
      raw: true,
    });

    if (reviews.length >= 5) {
      const allFiveStar = reviews.every(r => r.rating === 5);
      const uniqueReviewers = new Set(reviews.map(r => r.buyerId)).size;
      const reviewerRatio = uniqueReviewers / reviews.length;

      if (allFiveStar && reviews.length >= 5) {
        flags.push('Suspicious: All reviews are 5-star');
        score -= 8;
        breakdown.reviewPattern = { suspicious: true, reason: 'All 5-star', points: -8 };
      } else if (reviewerRatio < 0.3 && reviews.length >= 5) {
        flags.push('Suspicious: Repeated reviewers detected');
        score -= 5;
        breakdown.reviewPattern = { suspicious: true, reason: 'Repeated reviewers', points: -5 };
      } else {
        score += 5;
        breakdown.reviewPattern = { suspicious: false, points: 5 };
      }
    } else {
      breakdown.reviewPattern = { suspicious: false, points: 0, note: 'Too few reviews to analyze' };
    }
  }

  if (adIds.length > 0) {
    let pricingFlags = 0;
    for (const adId of adIds.slice(0, 20)) {
      const ad = await Ad.findByPk(adId, { attributes: ['price', 'category'], raw: true });
      if (!ad || !ad.category) continue;

      const avgResult = await Ad.findOne({
        where: { category: ad.category, status: 'active', id: { [Op.ne]: adId } },
        attributes: [[sequelize.fn('AVG', sequelize.col('price')), 'avgPrice']],
        raw: true,
      });
      const categoryAvg = parseFloat(avgResult?.avgPrice) || 0;
      if (categoryAvg > 0) {
        const adPrice = parseFloat(ad.price);
        if (adPrice < categoryAvg * 0.3) {
          pricingFlags++;
        }
      }
    }

    if (pricingFlags >= 3) {
      flags.push(`Pricing anomaly: ${pricingFlags} products priced 70%+ below category average`);
      score -= 10;
      breakdown.pricing = { anomalies: pricingFlags, points: -10 };
    } else if (pricingFlags > 0) {
      flags.push(`Minor pricing concern: ${pricingFlags} product(s) significantly below average`);
      score -= 3;
      breakdown.pricing = { anomalies: pricingFlags, points: -3 };
    } else {
      breakdown.pricing = { anomalies: 0, points: 0 };
    }
  }

  if (accountAgeDays <= 7) {
    const recentAdCount = await Ad.count({ where: { sellerId } });
    if (recentAdCount > 20) {
      flags.push(`High volume: ${recentAdCount} ads posted in first week`);
      score -= 5;
      breakdown.adVolume = { count: recentAdCount, points: -5 };
    } else {
      breakdown.adVolume = { count: recentAdCount, points: 0 };
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, flags, breakdown };
};

const updateSellerTrustScore = async (sellerId) => {
  const { User } = require('../models/user.model');
  const { score } = await calculateTrustScore(sellerId);
  await User.update({ trustScore: score }, { where: { id: sellerId } });
  return score;
};

const recalculateAllTrustScores = async () => {
  const { User } = require('../models/user.model');
  const sellers = await User.findAll({
    where: { sellerStatus: 'approved' },
    attributes: ['id'],
    raw: true,
  });

  const results = [];
  for (const seller of sellers) {
    const score = await updateSellerTrustScore(seller.id);
    results.push({ sellerId: seller.id, score });
  }
  return results;
};

const getFlaggedSellers = async () => {
  const { User } = require('../models/user.model');
  const sellers = await User.findAll({
    where: {
      sellerStatus: 'approved',
      [Op.or]: [
        { trustScore: { [Op.lt]: 40 } },
        { trustScore: null },
      ],
    },
    attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'refreshToken'] },
    order: [['trustScore', 'ASC']],
  });

  const detailed = [];
  for (const seller of sellers) {
    const analysis = await calculateTrustScore(seller.id);
    detailed.push({
      ...seller.toJSON(),
      trustAnalysis: analysis,
    });
  }

  return detailed;
};

const getTrustLabel = (score) => {
  if (score === null || score === undefined) return { label: 'Unscored', level: 'unscored' };
  if (score >= 80) return { label: 'Highly Trusted', level: 'high' };
  if (score >= 60) return { label: 'Trusted', level: 'good' };
  if (score >= 40) return { label: 'Moderate', level: 'moderate' };
  if (score >= 20) return { label: 'Low Trust', level: 'low' };
  return { label: 'Flagged', level: 'flagged' };
};

module.exports = {
  calculateTrustScore,
  updateSellerTrustScore,
  recalculateAllTrustScores,
  getFlaggedSellers,
  getTrustLabel,
};
