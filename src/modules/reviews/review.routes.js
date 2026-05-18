const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { validateAdReview, validateSellerReview } = require('./review.validation');

// POST /api/ads/:id/rate  — mounted under /api/ads in app.js
// POST /api/sellers/:id/rate — mounted under /api/sellers in app.js
// Both are handled by this single router
router.post('/:id/rate', authenticate, validateAdReview, validate, (req, res, next) => {
  // Determine if this is an ad review or seller review by checking the base URL
  if (req.baseUrl.includes('/sellers')) {
    return reviewController.rateSeller(req, res, next);
  }
  return reviewController.rateAd(req, res, next);
});

module.exports = router;
