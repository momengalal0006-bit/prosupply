/**
 * Trust Score & Fraud Detection Engine
 * 
 * Computes a 0-100 trust score for sellers based on:
 * - Account age
 * - Verification status (seller application approved)
 * - Order fulfillment rate
 * - Average ratings
 * - Review patterns (suspicious all-5-star detection)
 * - Pricing anomalies (products far below category average)
 * - Activity patterns (too many ads too quickly)
 * 
 * Also exposes fraud flag detection for the admin panel.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Calculate trust score for a single seller.
 * @param {string} sellerId — UUID
 * @returns {Object} { score, flags, breakdown }
 */
const calculateTrustScore = async (sellerId) => {
  const { User } = require('../models/user.model');
  const { Ad } = require('../models/ad.model');
  const { Order } = require('../models/order.model');
  const { AdReview } = require('../models/adReview.model');
  const { SellerReview } = require('../models/sellerReview.model');
  const { SellerApplication } = require('../models/sellerApplication.model');

  const seller = await User.findByPk(sellerId);
  if (!seller) return { score: 0, flags: ['User not found'], breakdown: {} };

  let score = 50; // Base score
  const flags = [];
  const breakdown = {};

  // 1. Account Age (0-10 points)
  const accountAgeDays = Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const ageScore = Math.min(accountAgeDays / 30, 1) * 10; // Max at 30 days
  score += ageScore;
  breakdown.accountAge = { days: accountAgeDays, points: Math.round(ageScore * 10) / 10 };

  if (accountAgeDays < 7) {
    flags.push('New account (less than 7 days old)');
  }

  // 2. Verification Status (0-10 points)
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

  // 3. Order Fulfillment Rate (0-15 points)
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

  // 4. Average Seller Rating (0-10 points)
  const avgRating = parseFloat(seller.avgSellerRating) || 0;
  const ratingScore = (avgRating / 5) * 10;
  score += ratingScore;
  breakdown.rating = { average: avgRating, points: Math.round(ratingScore * 10) / 10 };

  // 5. Review Pattern Analysis (-10 to +5 points)
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

  // 6. Pricing Anomaly Detection (-10 to 0 points)
  if (adIds.length > 0) {
    let pricingFlags = 0;
    for (const adId of adIds.slice(0, 20)) { // Check up to 20 ads
      const ad = await Ad.findByPk(adId, { attributes: ['price', 'category'], raw: true });
      if (!ad || !ad.category) continue;

      // Get category average price
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

  // 7. Ad Volume Check (-5 to 0 points)
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

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, flags, breakdown };
};

/**
 * Recalculate and persist trust score for a seller.
 */
const updateSellerTrustScore = async (sellerId) => {
  const { User } = require('../models/user.model');
  const { score } = await calculateTrustScore(sellerId);
  await User.update({ trustScore: score }, { where: { id: sellerId } });
  return score;
};

/**
 * Recalculate trust scores for all sellers.
 */
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

/**
 * Get all flagged sellers (trust score < 40 or has active flags).
 */
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

  // Calculate detailed flags for each
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

/**
 * Get trust label and color class based on score.
 */
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
