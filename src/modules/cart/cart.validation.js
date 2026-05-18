const { body } = require('express-validator');

const validateAddToCart = [
  body('adId').notEmpty().withMessage('Ad ID is required.').isInt().withMessage('Ad ID must be an integer.'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
];

const validateUpdateCart = [
  body('quantity').notEmpty().withMessage('Quantity is required.').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
];

module.exports = { validateAddToCart, validateUpdateCart };
