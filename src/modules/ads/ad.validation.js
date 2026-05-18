const { body } = require('express-validator');

const validateCreateAd = [
  body('title').notEmpty().withMessage('Title is required.').trim(),
  body('price').notEmpty().withMessage('Price is required.').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('quantity').notEmpty().withMessage('Quantity is required.').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer.'),
];

const validateUpdateAd = [
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer.'),
];

module.exports = { validateCreateAd, validateUpdateAd };
