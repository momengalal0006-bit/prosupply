const path = require('path');
const { User, Ad, Order } = require(path.resolve(__dirname, '../../models/index'));
const sellerService = require('../seller/seller.service');
const adRepo = require('../ads/ad.repository');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

const getDashboard = async () => {
  const totalUsers = await User.count();
  const { SellerApplication } = require('../../models/sellerApplication.model');
  const pendingApplications = await SellerApplication.count({ where: { status: 'pending_review' } });
  const activeAds = await Ad.count({ where: { status: 'active' } });
  
  const admin = await User.findOne({ where: { role: 'admin' } });
  const totalOrders = admin?.totalOrdersProcessed || 0;
  const totalCommissions = admin?.totalCommissionEarned ? parseFloat(admin.totalCommissionEarned) : 0;
  const totalPlatformRevenue = admin?.totalPlatformRevenue ? parseFloat(admin.totalPlatformRevenue) : 0;

  return { totalUsers, pendingApplications, activeAds, totalOrders, totalCommissions, totalPlatformRevenue };
};

// Seller applications — delegate to seller.service
const getApplications = async (status) => {
  return sellerService.getAllApplications(status);
};

const getApplicationById = async (id) => {
  const app = await sellerService.getApplicationById(id);
  if (!app) throw Object.assign(new Error('Application not found.'), { statusCode: 404 });
  return app;
};

const approveApplication = async (id) => {
  return sellerService.approveApplication(id);
};

const rejectApplication = async (id) => {
  return sellerService.rejectApplication(id);
};

// Users
const getUsers = async (search, { limit, offset } = {}) => {
  const where = {};
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }
  const queryOpts = {
    where,
    attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'refreshToken'] },
    order: [['createdAt', 'DESC']],
  };
  if (limit !== undefined) {
    queryOpts.limit = limit;
    queryOpts.offset = offset || 0;
  }
  const { count, rows } = await User.findAndCountAll(queryOpts);
  return { rows, count };
};

const getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'refreshToken'] },
  });
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return user;
};

const banUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  await user.update({ isBanned: true });
  return user.toSafeObject();
};

const unbanUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  await user.update({ isBanned: false });
  return user.toSafeObject();
};

const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });

  if (user.role === 'admin') {
    throw Object.assign(new Error('Cannot delete admin users.'), { statusCode: 403, code: 'CANNOT_DELETE_ADMIN' });
  }

  // Hard delete all user ads
  await Ad.destroy({ where: { sellerId: id } });


  // Clean up associated data
  const { CartItem } = require('../../models/cartItem.model');
  const { Notification } = require('../../models/notification.model');
  const { AdReview } = require('../../models/adReview.model');
  const { SellerReview } = require('../../models/sellerReview.model');
  const { SellerApplication } = require('../../models/sellerApplication.model');

  await CartItem.destroy({ where: { userId: id } });
  await Notification.destroy({ where: { userId: id } });
  await AdReview.destroy({ where: { buyerId: id } });
  await SellerReview.destroy({ where: { [Op.or]: [{ buyerId: id }, { sellerId: id }] } });
  await SellerApplication.destroy({ where: { userId: id } });

  await user.destroy();
};

// Ads
const getAds = async (search, paginationOpts) => {
  return adRepo.findAllAdmin({ search }, paginationOpts);
};

const deleteAd = async (id) => {
  const ad = await Ad.findByPk(id);
  if (!ad) throw Object.assign(new Error('Ad not found.'), { statusCode: 404 });
  return ad.update({ status: 'deleted' });
};

// Commissions
const getCommissions = async ({ limit, offset } = {}) => {
  const where = { paymentStatus: 'paid' };
  const queryOpts = {
    where,
    include: [
      { model: User, as: 'seller', attributes: ['id', 'fullName', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'adTitle', 'totalPrice', 'commissionAmount', 'commissionRate', 'orderStatus', 'createdAt', 'sellerId'],
  };
  if (limit !== undefined) {
    queryOpts.limit = limit;
    queryOpts.offset = offset || 0;
  }
  const { count, rows } = await Order.findAndCountAll(queryOpts);
  const totalCommissions = (await Order.sum('commissionAmount', { where })) || 0;
  return { rows, count, totalCommissions };
};

module.exports = {
  getDashboard, getApplications, getApplicationById,
  approveApplication, rejectApplication,
  getUsers, getUserById, banUser, unbanUser, deleteUser,
  getAds, deleteAd,
  getCommissions,
};
