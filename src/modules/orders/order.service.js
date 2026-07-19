const path = require('path');
const sequelize = require('../../config/database');
const { Ad } = require('../../models/ad.model');
const { CartItem } = require('../../models/cartItem.model');
const { Notification } = require('../../models/notification.model');
const orderRepo = require('./order.repository');
const paymobService = require('../payment/paymob.service');
const { sendEmail } = require('../../utils/mailer');
const { buildEmail } = require('../../utils/emailTemplate');
const { calculateCommission } = require('../../utils/commission');
const { Order, User } = require('../../models/index');

const processSuccessfulPayment = async (orderGroupId) => {
  const t = await sequelize.transaction();
  try {
    const orders = await Order.findAll({ where: { orderGroupId, paymentStatus: 'pending' }, transaction: t });
    
    if (!orders || orders.length === 0) {
      await t.rollback();
      return;
    }

    await Order.update({ paymentStatus: 'paid' }, { where: { orderGroupId }, transaction: t });

    for (const order of orders) {
      const commission = parseFloat(order.commissionAmount || 0);
      const total = parseFloat(order.totalPrice);
      const sellerEarning = total - commission;

      await User.increment({
        totalEarnings: sellerEarning,
        pendingBalance: sellerEarning,
        totalOrders: 1
      }, { where: { id: order.sellerId }, transaction: t });

      const admin = await User.findOne({ where: { role: 'admin' }, transaction: t });
      if (admin) {
        await admin.increment({
          totalCommissionEarned: commission,
          totalPlatformRevenue: total,
          totalOrdersProcessed: 1
        }, { transaction: t });
      }
    }

    await t.commit();

    const sellerIds = [...new Set(orders.map(o => o.sellerId))];
    for (const sid of sellerIds) {
      const seller = await User.findByPk(sid);
      if (seller) {
        sendEmail(seller.email, 'New Order Received - ProSupply',
          buildEmail({
            heading: 'New Orders Received! 🛒',
            greeting: `Hi <strong style="color:#FFFFFF;">${seller.fullName}</strong>,`,
            body: `<p style="margin:0 0 16px;">You have received new paid orders on ProSupply.</p>
                   <p style="margin:0;">Head over to your seller dashboard to view the details and manage your sales.</p>`,
          })
        ).catch(err => console.error('Email send failed:', err.message));
      }
    }
  } catch (err) {
    await t.rollback();
    console.error('Failed to process successful payment:', err.message);
  }
};

const checkout = async ({ adId, quantity, paymentMethod }, buyerId) => {
  const adCheck = await Ad.findByPk(adId);
  if (!adCheck || adCheck.status === 'deleted') {
    const err = new Error('Ad not found.');
    err.statusCode = 404;
    throw err;
  }
  if (adCheck.sellerId === buyerId) {
    const err = new Error('You cannot buy your own ad.');
    err.statusCode = 403;
    err.code = 'OWN_AD_NOT_ALLOWED';
    throw err;
  }
  if (adCheck.quantity < quantity) {
    const err = new Error('Insufficient stock.');
    err.statusCode = 400;
    err.code = 'INSUFFICIENT_STOCK';
    throw err;
  }

  const { User } = require('../../models/index');
  const buyer = await User.findByPk(buyerId);
  if (!buyer || !buyer.deliveryStreet || !buyer.deliveryCity || !buyer.deliveryBuilding || !buyer.deliveryArea || !buyer.deliveryDistrict) {
    const err = new Error('Please complete your full delivery address before checkout.');
    err.statusCode = 400;
    err.code = 'NO_DELIVERY_ADDRESS';
    throw err;
  }
  const deliverySnapshot = JSON.stringify({
    street: buyer.deliveryStreet,
    building: buyer.deliveryBuilding,
    area: buyer.deliveryArea,
    city: buyer.deliveryCity,
    district: buyer.deliveryDistrict,
    notes: buyer.deliveryNotes,
  });

  const totalPrice = parseFloat(adCheck.price) * quantity;
  const orderGroupId = `GRP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const delivery = JSON.parse(deliverySnapshot);

  const paymentKey = await paymobService.createPaymentKey({
    amount: Math.round(totalPrice * 100),
    currency: 'EGP',
    items: [{
      name: adCheck.title,
      amount: Math.round(parseFloat(adCheck.price) * 100),
      description: adCheck.title,
      quantity,
    }],
    billingData: {
      first_name: buyer.fullName ? buyer.fullName.split(' ')[0] : 'N/A',
      last_name: buyer.fullName ? buyer.fullName.split(' ').slice(1).join(' ') : 'N/A',
      email: buyer.email || 'N/A',
      phone_number: buyer.phoneNumber || buyer.phone || 'N/A',
      street: delivery.street,
      building: delivery.building,
      city: delivery.city,
    },
    orderGroupId,
  });

  const t = await sequelize.transaction();
  try {
    const lockedAd = await Ad.findByPk(adId, { lock: t.LOCK.UPDATE, transaction: t });
    if (!lockedAd || lockedAd.status === 'deleted') {
      throw Object.assign(new Error('Ad not found.'), { statusCode: 404 });
    }
    if (lockedAd.quantity < quantity) {
      throw Object.assign(new Error('Insufficient stock.'), { statusCode: 400, code: 'INSUFFICIENT_STOCK' });
    }

    const { commission, rateLabel } = calculateCommission(totalPrice);

    const newQty = lockedAd.quantity - quantity;
    await lockedAd.update({
      quantity: newQty,
      status: newQty === 0 ? 'deleted' : 'active',
    }, { transaction: t });

    const order = await orderRepo.create({
      buyerId,
      adId: lockedAd.id,
      sellerId: lockedAd.sellerId,
      adTitle: lockedAd.title,
      unitPrice: lockedAd.price,
      quantity,
      totalPrice,
      commissionAmount: commission,
      commissionRate: rateLabel,
      paymentMethod: paymentMethod || 'online',
      paymentStatus: 'pending',
      orderStatus: 'placed',
      deliveryAddress: deliverySnapshot,
      orderGroupId,
    }, t);

    await Notification.create({
      userId: lockedAd.sellerId,
      type: 'new_order',
      message: `New order received for "${lockedAd.title}" (Qty: ${quantity}).`,
    }, { transaction: t });

    await t.commit();
    return { order, paymentKey };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const checkoutCart = async (buyerId) => {
  const cartItems = await CartItem.findAll({
    where: { userId: buyerId },
    include: [{ model: Ad }],
  });

  if (cartItems.length === 0) {
    const err = new Error('Cart is empty.');
    err.statusCode = 400;
    throw err;
  }

  const { User } = require('../../models/index');
  const buyer = await User.findByPk(buyerId);
  if (!buyer || !buyer.deliveryStreet || !buyer.deliveryCity || !buyer.deliveryBuilding || !buyer.deliveryArea || !buyer.deliveryDistrict) {
    const err = new Error('Please complete your full delivery address before checkout.');
    err.statusCode = 400;
    err.code = 'NO_DELIVERY_ADDRESS';
    throw err;
  }
  const deliverySnapshot = JSON.stringify({
    street: buyer.deliveryStreet,
    building: buyer.deliveryBuilding,
    area: buyer.deliveryArea,
    city: buyer.deliveryCity,
    district: buyer.deliveryDistrict,
    notes: buyer.deliveryNotes,
  });

  for (const item of cartItems) {
    if (!item.Ad || item.Ad.status === 'deleted') {
      const err = new Error(`Ad "${item.Ad?.title || item.adId}" is no longer available.`);
      err.statusCode = 400;
      throw err;
    }
    if (item.Ad.sellerId === buyerId) {
      const err = new Error(`You cannot buy your own ad "${item.Ad.title}".`);
      err.statusCode = 403;
      err.code = 'OWN_AD_NOT_ALLOWED';
      throw err;
    }
    if (item.Ad.quantity < item.quantity) {
      const err = new Error(`Insufficient stock for "${item.Ad.title}".`);
      err.statusCode = 400;
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }
  }

  let combinedTotal = 0;
  cartItems.forEach(item => {
    combinedTotal += parseFloat(item.Ad.price) * item.quantity;
  });

  const orderGroupId = `GRP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const delivery = JSON.parse(deliverySnapshot);
  const paymentKey = await paymobService.createPaymentKey({
    amount: Math.round(combinedTotal * 100),
    currency: 'EGP',
    items: cartItems.map(item => ({
      name: item.Ad.title,
      amount: Math.round(parseFloat(item.Ad.price) * 100),
      description: item.Ad.title,
      quantity: item.quantity,
    })),
    billingData: {
      first_name: buyer.fullName ? buyer.fullName.split(' ')[0] : 'N/A',
      last_name: buyer.fullName ? buyer.fullName.split(' ').slice(1).join(' ') : 'N/A',
      email: buyer.email || 'N/A',
      phone_number: buyer.phoneNumber || buyer.phone || 'N/A',
      street: delivery.street,
      building: delivery.building,
      city: delivery.city,
    },
    orderGroupId,
  });

  const t = await sequelize.transaction();
  try {
    for (const item of cartItems) {
      const ad = await Ad.findByPk(item.adId, { lock: t.LOCK.UPDATE, transaction: t });
      if (!ad || ad.status === 'deleted') {
        throw Object.assign(new Error(`Ad "${item.Ad.title}" is no longer available.`), { statusCode: 400 });
      }
      if (ad.quantity < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for "${ad.title}".`), { statusCode: 400, code: 'INSUFFICIENT_STOCK' });
      }
    }

    const orders = [];
    const sellerIds = new Set();

    for (const item of cartItems) {
      const ad = await Ad.findByPk(item.adId, { transaction: t });
      const newQty = ad.quantity - item.quantity;
      await ad.update({
        quantity: newQty,
        status: newQty === 0 ? 'deleted' : 'active',
      }, { transaction: t });

      const totalPrice = parseFloat(ad.price) * item.quantity;
      const { commission, rateLabel } = calculateCommission(totalPrice);

      const order = await orderRepo.create({
        buyerId,
        adId: ad.id,
        sellerId: ad.sellerId,
        adTitle: ad.title,
        unitPrice: ad.price,
        quantity: item.quantity,
        totalPrice,
        commissionAmount: commission,
        commissionRate: rateLabel,
        paymentMethod: 'online',
        paymentStatus: 'pending',
        orderStatus: 'placed',
        deliveryAddress: deliverySnapshot,
        orderGroupId,
      }, t);

      orders.push(order);
      sellerIds.add(ad.sellerId);

      await Notification.create({
        userId: ad.sellerId,
        type: 'new_order',
        message: `New order received for "${ad.title}" (Qty: ${item.quantity}).`,
      }, { transaction: t });
    }

    await CartItem.destroy({ where: { userId: buyerId }, transaction: t });

    await t.commit();
    return { orders, paymentKey };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const getOrderHistory = async (buyerId, paginationOpts) => {
  return orderRepo.findByBuyer(buyerId, paginationOpts);
};

const getOrderById = async (orderId, userId) => {
  const order = await orderRepo.findById(orderId);
  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }
  if (order.buyerId !== userId && order.sellerId !== userId) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }
  return order;
};

const getSellerSales = async (sellerId) => {
  return orderRepo.findBySeller(sellerId);
};

const VALID_TRANSITIONS = {
  placed: ['confirmed', 'delivered'],
  confirmed: ['shipped', 'delivered'],
  shipped: ['delivered'],
};

const updateOrderStatus = async (orderId, newStatus, sellerId) => {
  const order = await orderRepo.findById(orderId);
  if (!order) {
    throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
  }
  if (order.sellerId !== sellerId) {
    throw Object.assign(new Error('Not your order.'), { statusCode: 403 });
  }
  const allowedNext = VALID_TRANSITIONS[order.orderStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    throw Object.assign(
      new Error(`Cannot transition from "${order.orderStatus}" to "${newStatus}". Allowed: "${allowedNext.join(', ') || 'none'}".`),
      { statusCode: 400, code: 'INVALID_TRANSITION' }
    );
  }
  const updated = await orderRepo.updateStatus(orderId, { orderStatus: newStatus });

  if (newStatus === 'delivered') {
    try {
      const { updateSellerTrustScore } = require('../../utils/trustScore');
      await updateSellerTrustScore(sellerId);
    } catch (e) { console.error('Trust score update failed:', e.message); }
  }

  return updated;
};

const clearOrderHistory = async (buyerId) => {
  return orderRepo.clearBuyerHistory(buyerId);
};

module.exports = { checkout, checkoutCart, getOrderHistory, getOrderById, getSellerSales, updateOrderStatus, clearOrderHistory, processSuccessfulPayment };
