const express = require('express');
const router = express.Router();
const cartController = require('./cart.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { validateAddToCart, validateUpdateCart } = require('./cart.validation');

router.get('/', authenticate, cartController.getCart);
router.get('/summary', authenticate, cartController.getSummary);
router.post('/', authenticate, validateAddToCart, validate, cartController.addItem);
router.put('/:adId', authenticate, validateUpdateCart, validate, cartController.updateItem);
router.delete('/:adId', authenticate, cartController.removeItem);

module.exports = router;
