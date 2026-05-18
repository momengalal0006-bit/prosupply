const { body } = require('express-validator');

const validateApply = [
  body('businessName').notEmpty().withMessage('Business name is required.').trim(),
];

module.exports = { validateApply };
