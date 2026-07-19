const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSeller } = require('../../middleware/isSeller.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { validateCheckout } = require('./order.validation');

router.post('/checkout', authenticate, validateCheckout, validate, orderController.checkout);
router.post('/checkout-cart', authenticate, orderController.checkoutCart);
router.get('/history', authenticate, orderController.getHistory);
router.delete('/history/clear', authenticate, orderController.clearHistory);
router.get('/:id', authenticate, orderController.getById);

router.get('/sales', authenticate, isSeller, orderController.getSales);
router.put('/:id/status', authenticate, isSeller, orderController.updateStatus);

module.exports = router;
