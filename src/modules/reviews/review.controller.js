const reviewService = require('./review.service');
const { success } = require('../../utils/response');

const rateAd = async (req, res, next) => {
  try {
    const review = await reviewService.createAdReview(
      parseInt(req.params.id), req.user.id, req.body
    );
    success(res, review, 201);
  } catch (err) { next(err); }
};

const rateSeller = async (req, res, next) => {
  try {
    const review = await reviewService.createSellerReview(
      req.params.id, req.user.id, req.body
    );
    success(res, review, 201);
  } catch (err) { next(err); }
};

const getSellerProfile = async (req, res, next) => {
  try {
    const data = await reviewService.getSellerProfile(req.params.id, req.query);
    success(res, data);
  } catch (err) { next(err); }
};

module.exports = { rateAd, rateSeller, getSellerProfile };
