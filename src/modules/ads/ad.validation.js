const { body } = require('express-validator');

const validateCreateAd = [
  body('title').notEmpty().withMessage('Title is required.').trim(),
  body('price').notEmpty().withMessage('Price is required.').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('quantity').notEmpty().withMessage('Quantity is required.').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer.'),
  body('brand').notEmpty().withMessage('Brand is required.').trim(),
  body('category').notEmpty().withMessage('Category is required.').trim(),
  body('countryOfOrigin').notEmpty().withMessage('Origin is required.').trim(),
  body('warrantyMonths').notEmpty().withMessage('Warranty is required.').isInt({ min: 0 }).withMessage('Warranty must be a non-negative integer.'),
  body('description').notEmpty().withMessage('Description is required.').trim(),
];

const validateUpdateAd = [
  body('title').optional().notEmpty().withMessage('Title is required.').trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer.'),
  body('brand').optional().notEmpty().withMessage('Brand is required.').trim(),
  body('category').optional().notEmpty().withMessage('Category is required.').trim(),
  body('countryOfOrigin').optional().notEmpty().withMessage('Origin is required.').trim(),
  body('warrantyMonths').optional().isInt({ min: 0 }).withMessage('Warranty must be a non-negative integer.'),
  body('description').optional().notEmpty().withMessage('Description is required.').trim(),
];

module.exports = { validateCreateAd, validateUpdateAd };
