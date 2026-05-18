const path = require('path');
const { CartItem, Ad } = require(path.resolve(__dirname, '../../models/index'));

const findByUser = async (userId) => {
  return CartItem.findAll({
    where: { userId },
    include: [{ model: Ad }],
    order: [['addedAt', 'DESC']],
  });
};

const findItem = async (userId, adId) => {
  return CartItem.findOne({ where: { userId, adId } });
};

const create = async (data) => {
  return CartItem.create(data);
};

const updateQuantity = async (userId, adId, quantity) => {
  const item = await CartItem.findOne({ where: { userId, adId } });
  if (!item) return null;
  return item.update({ quantity });
};

const remove = async (userId, adId) => {
  const item = await CartItem.findOne({ where: { userId, adId } });
  if (!item) return null;
  await item.destroy();
  return true;
};

module.exports = { findByUser, findItem, create, updateQuantity, remove };
