const router = require('express').Router();
const ctrl = require('./auth.controller');
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword, handleValidation } = require('./auth.validator');
const { authenticate } = require('../../middleware/auth.middleware');

router.post('/register', validateRegister, handleValidation, ctrl.registerCtrl);
router.post('/login', validateLogin, handleValidation, ctrl.loginCtrl);
router.post('/logout', authenticate, ctrl.logoutCtrl);
router.post('/refresh-token', ctrl.refreshTokenCtrl);
router.post('/forgot-password', validateForgotPassword, handleValidation, ctrl.forgotPasswordCtrl);
router.post('/reset-password', validateResetPassword, handleValidation, ctrl.resetPasswordCtrl);

module.exports = router;
