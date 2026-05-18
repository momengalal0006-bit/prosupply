const cartService = require('./cart.service');
const { success } = require('../../utils/response');

const getCart = async (req, res, next) => {
  try {
    const items = await cartService.getCart(req.user.id);
    success(res, items);
  } catch (err) { next(err); }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await cartService.getCartSummary(req.user.id);
    success(res, summary);
  } catch (err) { next(err); }
};

const addItem = async (req, res, next) => {
  try {
    const item = await cartService.addToCart(req.user.id, req.body);
    success(res, item, 201);
  } catch (err) { next(err); }
};

const updateItem = async (req, res, next) => {
  try {
    const item = await cartService.updateCartItem(req.user.id, req.params.adId, parseInt(req.body.quantity));
    success(res, item);
  } catch (err) { next(err); }
};

const removeItem = async (req, res, next) => {
  try {
    await cartService.removeFromCart(req.user.id, req.params.adId);
    success(res, { message: 'Item removed from cart.' });
  } catch (err) { next(err); }
};

module.exports = { getCart, getSummary, addItem, updateItem, removeItem };
