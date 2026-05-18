const { body, validationResult } = require('express-validator');

const validateRegister = [
  body('fullName').notEmpty().withMessage('Full name is required.').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters.'),
  body('email').notEmpty().withMessage('Email is required.').isEmail().withMessage('Invalid email address.').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required.').trim().matches(/^\+?[0-9\s\-()]{7,20}$/).withMessage('Invalid phone number format.'),
  body('password').notEmpty().withMessage('Password is required.').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('confirmPassword').notEmpty().withMessage('Confirm password is required.').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match.');
    return true;
  }),
];

const validateLogin = [
  body('email').notEmpty().withMessage('Email is required.').isEmail().withMessage('Invalid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const validateForgotPassword = [
  body('email').notEmpty().withMessage('Email is required.').isEmail().withMessage('Invalid email address.'),
];

const validateResetPassword = [
  body('email').notEmpty().withMessage('Email is required.').isEmail().withMessage('Invalid email address.'),
  body('otp').notEmpty().withMessage('OTP is required.').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.').isNumeric().withMessage('OTP must be numeric.'),
  body('newPassword').notEmpty().withMessage('New password is required.').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('confirmNewPassword').notEmpty().withMessage('Confirm new password is required.').custom((value, { req }) => {
    if (value !== req.body.newPassword) throw new Error('Passwords do not match.');
    return true;
  }),
];

const validateUpdateRole = [
  body('role').notEmpty().withMessage('Role is required.').isIn(['user', 'admin']).withMessage('Invalid role. Must be one of: user, admin.'),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = { validateRegister, validateLogin, validateForgotPassword, validateResetPassword, validateUpdateRole, handleValidation };
