const express = require('express');
const router = express.Router();
const sellerController = require('./seller.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSeller } = require('../../middleware/isSeller.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { validateApply } = require('./seller.validation');
const { uploadDocuments } = require('../../config/multer');

// Register notifications routes BEFORE parameterized routes
router.get('/notifications', authenticate, isSeller, sellerController.notifications);
router.put('/notifications/read-all', authenticate, isSeller, sellerController.markAllRead);
router.delete('/notifications/clear', authenticate, isSeller, sellerController.clearAllNotifications);

router.post('/apply', authenticate, uploadDocuments.array('documents', 5), validateApply, validate, sellerController.apply);
router.get('/dashboard', authenticate, isSeller, sellerController.dashboard);

module.exports = router;
