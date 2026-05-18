const { body } = require('express-validator');

const validateAdReview = [
  body('rating').notEmpty().withMessage('Rating is required.').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('reviewText').optional().trim(),
];

const validateSellerReview = [
  body('rating').notEmpty().withMessage('Rating is required.').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('comment').optional().trim(),
];

module.exports = { validateAdReview, validateSellerReview };
