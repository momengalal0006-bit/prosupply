const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isUser } = require('../../middleware/isUser.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { validateAdReview, validateSellerReview } = require('./review.validation');


router.get('/:id/profile', authenticate, isUser, reviewController.getSellerProfile);




router.post('/:id/rate', authenticate, validateAdReview, validate, (req, res, next) => {
  
  if (req.baseUrl.includes('/sellers')) {
    return reviewController.rateSeller(req, res, next);
  }
  return reviewController.rateAd(req, res, next);
});

module.exports = router;
