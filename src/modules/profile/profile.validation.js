const { body } = require('express-validator');

const validateUpdateProfile = [
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters.'),
  body('email').optional().isEmail().withMessage('Invalid email address.').normalizeEmail(),
  body('phone').optional().trim(),
];

const validatePasswordChangeConfirm = [
  body('otp').notEmpty().withMessage('OTP is required.').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
  body('newPassword').notEmpty().withMessage('New password is required.').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
];

module.exports = { validateUpdateProfile, validatePasswordChangeConfirm };
