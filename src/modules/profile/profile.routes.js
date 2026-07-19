const express = require('express');
const router = express.Router();
const profileController = require('./profile.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { validateUpdateProfile, validatePasswordChangeConfirm } = require('./profile.validation');

router.get('/', authenticate, profileController.getProfile);
router.put('/', authenticate, validateUpdateProfile, validate, profileController.updateProfile);
router.post('/change-password/request', authenticate, profileController.requestChangePassword);
router.post('/change-password/confirm', authenticate, validatePasswordChangeConfirm, validate, profileController.confirmChangePassword);


router.get('/address', authenticate, profileController.getDeliveryAddress);
router.put('/address', authenticate, profileController.saveDeliveryAddress);

module.exports = router;
