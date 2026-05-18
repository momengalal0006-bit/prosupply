const path = require('path');
const { Order } = require(path.resolve(__dirname, '../../models/index'));
const { User } = require('../../models/user.model');
const { Ad } = require('../../models/ad.model');

const create = async (data, transaction) => {
  return Order.create(data, { transaction });
};

const findByBuyer = async (buyerId, { limit, offset } = {}) => {
  const queryOpts = {
    where: { buyerId, buyerHidden: false },
    order: [['createdAt', 'DESC']],
  };
  if (limit !== undefined) {
    queryOpts.limit = limit;
    queryOpts.offset = offset || 0;
  }
  const { count, rows } = await Order.findAndCountAll(queryOpts);
  return { rows, count };
};

const findById = async (id) => {
  return Order.findByPk(id, {
    include: [
      { model: User, as: 'seller', attributes: ['id', 'fullName', 'email'] },
      { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
    ],
  });
};

const findBySeller = async (sellerId) => {
  return Order.findAll({
    where: { sellerId },
    include: [
      { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
  });
};

const findDeliveredOrder = async (buyerId, adId) => {
  return Order.findOne({
    where: { buyerId, adId, orderStatus: 'delivered' },
  });
};

const findDeliveredOrderBySeller = async (buyerId, sellerId) => {
  return Order.findOne({
    where: { buyerId, sellerId, orderStatus: 'delivered' },
  });
};

const countAll = async () => {
  return Order.count();
};

const countBySeller = async (sellerId) => {
  return Order.count({ where: { sellerId } });
};

const sumRevenueBySeller = async (sellerId) => {
  const result = await Order.sum('totalPrice', { where: { sellerId, paymentStatus: 'paid' } });
  return result || 0;
};

const sumCommissionBySeller = async (sellerId) => {
  const result = await Order.sum('commissionAmount', { where: { sellerId, paymentStatus: 'paid' } });
  return result || 0;
};

const findRecentBySeller = async (sellerId, limit = 10) => {
  return Order.findAll({
    where: { sellerId },
    include: [
      { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
    limit,
  });
};

const updateStatus = async (id, data) => {
  const order = await Order.findByPk(id);
  if (!order) return null;
  return order.update(data);
};

const clearBuyerHistory = async (buyerId) => {
  return Order.update({ buyerHidden: true }, { where: { buyerId } });
};

module.exports = {
  create, findByBuyer, findById, findBySeller,
  findDeliveredOrder, findDeliveredOrderBySeller,
  countAll, countBySeller, sumRevenueBySeller, sumCommissionBySeller, findRecentBySeller,
  updateStatus, clearBuyerHistory,
};
