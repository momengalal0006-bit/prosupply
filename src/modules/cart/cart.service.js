const cartRepo = require('./cart.repository');
const { Ad } = require('../../models/ad.model');

const getCart = async (userId) => {
  const items = await cartRepo.findByUser(userId);
  const validItems = [];

  for (const item of items) {
    if (!item.Ad || item.Ad.status === 'deleted') {
      // Silently remove deleted ads from cart
      await item.destroy();
      continue;
    }
    validItems.push(item);
  }

  return validItems;
};

const getCartSummary = async (userId) => {
  const items = await getCart(userId);

  const mappedItems = items.map(item => ({
    adId: item.adId,
    title: item.Ad.title,
    unitPrice: parseFloat(item.Ad.price),
    quantity: item.quantity,
    lineTotal: parseFloat(item.Ad.price) * item.quantity,
    countryOfOrigin: item.Ad.countryOfOrigin,
    warrantyMonths: item.Ad.warrantyMonths,
  }));

  const itemCount = mappedItems.length;
  const subtotal = mappedItems.reduce((sum, i) => sum + i.lineTotal, 0);

  return { items: mappedItems, summary: { itemCount, subtotal } };
};

const addToCart = async (userId, { adId, quantity }) => {
  // Check duplicate
  const existing = await cartRepo.findItem(userId, adId);
  if (existing) {
    throw Object.assign(new Error('Item already in cart.'), { statusCode: 409, code: 'ALREADY_IN_CART' });
  }

  // Validate ad
  const ad = await Ad.findByPk(adId);
  if (!ad || ad.status !== 'active') {
    throw Object.assign(new Error('Ad not found or not available.'), { statusCode: 404 });
  }
  if (ad.sellerId === userId) {
    throw Object.assign(new Error('You cannot add your own ad to cart.'), { statusCode: 403, code: 'OWN_AD_NOT_ALLOWED' });
  }
  if (quantity > ad.quantity) {
    throw Object.assign(new Error('Insufficient stock.'), { statusCode: 400, code: 'INSUFFICIENT_STOCK' });
  }

  return cartRepo.create({ userId, adId, quantity: quantity || 1 });
};

const updateCartItem = async (userId, adId, quantity) => {
  // Validate quantity
  const ad = await Ad.findByPk(adId);
  if (ad && quantity > ad.quantity) {
    throw Object.assign(new Error('Insufficient stock.'), { statusCode: 400, code: 'INSUFFICIENT_STOCK' });
  }

  const result = await cartRepo.updateQuantity(userId, parseInt(adId), quantity);
  if (!result) {
    throw Object.assign(new Error('Item not found in cart.'), { statusCode: 404, code: 'NOT_IN_CART' });
  }
  return result;
};

const removeFromCart = async (userId, adId) => {
  const result = await cartRepo.remove(userId, parseInt(adId));
  if (!result) {
    throw Object.assign(new Error('Item not found in cart.'), { statusCode: 404, code: 'NOT_IN_CART' });
  }
};

module.exports = { getCart, getCartSummary, addToCart, updateCartItem, removeFromCart };
