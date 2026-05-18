const orderService = require('./order.service');
const { success } = require('../../utils/response');
const { paginate, paginatedResult } = require('../../utils/pagination');

const checkout = async (req, res, next) => {
  try {
    const { adId, quantity, paymentMethod } = req.body;
    const order = await orderService.checkout({ adId, quantity: parseInt(quantity), paymentMethod }, req.user.id);
    success(res, order, 201);
  } catch (err) { next(err); }
};

const checkoutCart = async (req, res, next) => {
  try {
    const orders = await orderService.checkoutCart(req.user.id);
    success(res, orders, 201);
  } catch (err) { next(err); }
};

const getHistory = async (req, res, next) => {
  try {
    const pg = paginate(req.query);
    const { rows, count } = await orderService.getOrderHistory(req.user.id, { limit: pg.limit, offset: pg.offset });
    success(res, paginatedResult(rows, count, pg));
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(parseInt(req.params.id), req.user.id);
    success(res, order);
  } catch (err) { next(err); }
};

const getSales = async (req, res, next) => {
  try {
    const sales = await orderService.getSellerSales(req.user.id);
    success(res, sales);
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(
      parseInt(req.params.id), req.body.status, req.user.id
    );
    success(res, order);
  } catch (err) { next(err); }
};

const clearHistory = async (req, res, next) => {
  try {
    await orderService.clearOrderHistory(req.user.id);
    success(res, { message: 'Order history cleared.' });
  } catch (err) { next(err); }
};

module.exports = { checkout, checkoutCart, getHistory, getById, getSales, updateStatus, clearHistory };
