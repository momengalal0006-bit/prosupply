const { getSimilarProducts, getAlternatives, getPersonalRecommendations, getMatchedSellers } = require('../../utils/recommendation');
const { success } = require('../../utils/response');

const similar = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 8;
    const products = await getSimilarProducts(adId, limit);
    success(res, products);
  } catch (err) { next(err); }
};

const alternatives = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 6;
    const products = await getAlternatives(adId, limit);
    success(res, products);
  } catch (err) { next(err); }
};

const personal = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit) || 10;
    if (!userId) {
      const { Ad } = require('../../models/ad.model');
      const { User } = require('../../models/user.model');
      const products = await Ad.findAll({
        where: { status: 'active' },
        include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
        order: [['avgRating', 'DESC'], ['createdAt', 'DESC']],
        limit,
      });
      return success(res, products);
    }
    const products = await getPersonalRecommendations(userId, limit);
    success(res, products);
  } catch (err) { next(err); }
};

const matchedSellers = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return success(res, []);
    }
    const limit = parseInt(req.query.limit) || 5;
    const sellers = await getMatchedSellers(userId, limit);
    success(res, sellers);
  } catch (err) { next(err); }
};

module.exports = { similar, alternatives, personal, matchedSellers };
