const path = require('path');
const sellerRepo = require('./seller.repository');
const orderRepo = require('../orders/order.repository');
const { User, Ad, Notification } = require(path.resolve(__dirname, '../../models/index'));
const sequelize = require('../../config/database');
const { sendEmail } = require('../../utils/mailer');
const { buildEmail } = require('../../utils/emailTemplate');

const applyAsSeller = async (userId, { businessName, documents }) => {
  // Check existing application
  const existing = await sellerRepo.findApplicationByUserId(userId);
  if (existing) {
    if (existing.status === 'pending_review' || existing.status === 'approved') {
      throw Object.assign(new Error('You already have a pending or approved application.'), { statusCode: 409, code: 'ALREADY_APPLIED' });
    }
    // If rejected, allow reapply — fall through
  }

  const t = await sequelize.transaction();
  try {
    const application = await sellerRepo.createApplication({
      userId,
      businessName,
      documents: documents || [],
      status: 'pending_review',
    }, t);

    const user = await User.findByPk(userId, { transaction: t });
    await user.update({ sellerStatus: 'pending_review' }, { transaction: t });

    await t.commit();
    return application;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const getDashboard = async (userId) => {
  const ads = await Ad.findAll({ where: { sellerId: userId }, order: [['createdAt', 'DESC']] });
  const user = await User.findByPk(userId);
  const totalSales = user.totalOrders || 0;
  const netRevenue = parseFloat(user.totalEarnings || 0).toFixed(2);
  const grossRevenue = await orderRepo.sumRevenueBySeller(userId);
  const totalCommission = await orderRepo.sumCommissionBySeller(userId);
  const recentSales = await orderRepo.findRecentBySeller(userId, 10);
  const unreadNotificationsCount = await Notification.count({ where: { userId, isRead: false } });
  const { SellerReview } = require('../../models/index');
  const reviews = await SellerReview.findAll({
    where: { sellerId: userId },
    include: [{ model: User, as: 'buyer', attributes: ['id', 'fullName'] }],
    order: [['createdAt', 'DESC']]
  });

  return {
    ads,
    stats: { totalSales, grossRevenue, totalCommission, netRevenue },
    recentSales,
    unreadNotificationsCount,
    reviews
  };
};

const getNotifications = async (userId) => {
  return Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
};

const markAllNotificationsRead = async (userId) => {
  await Notification.update({ isRead: true }, { where: { userId } });
};

const clearNotifications = async (userId) => {
  await Notification.destroy({ where: { userId } });
};

// Admin operations (called by admin module)
const approveApplication = async (applicationId) => {
  const t = await sequelize.transaction();
  try {
    const app = await sellerRepo.findApplicationById(applicationId);
    if (!app) throw Object.assign(new Error('Application not found.'), { statusCode: 404 });

    await sellerRepo.updateApplicationStatus(applicationId, 'approved', t);
    const user = await User.findByPk(app.userId, { transaction: t });
    await user.update({ sellerStatus: 'approved' }, { transaction: t });

    await t.commit();

    // Email
    try {
      await sendEmail(user.email, 'Seller Application Approved - ProSupply',
        buildEmail({
          heading: 'Application Approved! 🎉',
          greeting: `Hi <strong style="color:#FFFFFF;">${user.fullName}</strong>,`,
          body: `<p style="margin:0 0 16px;">Congratulations! Your seller application has been <strong style="color:#4ade80;">approved</strong>.</p>
                 <p style="margin:0;">You can now post ads and start selling on ProSupply.</p>`,
        })
      );
    } catch (e) { console.error('Email error:', e.message); }

    return app;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const rejectApplication = async (applicationId) => {
  const t = await sequelize.transaction();
  try {
    const app = await sellerRepo.findApplicationById(applicationId);
    if (!app) throw Object.assign(new Error('Application not found.'), { statusCode: 404 });

    await sellerRepo.updateApplicationStatus(applicationId, 'rejected', t);
    const user = await User.findByPk(app.userId, { transaction: t });
    await user.update({ sellerStatus: 'rejected' }, { transaction: t });

    await t.commit();

    try {
      await sendEmail(user.email, 'Seller Application Update - ProSupply',
        buildEmail({
          heading: 'Application Update',
          greeting: `Hi <strong style="color:#FFFFFF;">${user.fullName}</strong>,`,
          body: `<p style="margin:0 0 16px;">Unfortunately, your seller application has been <strong style="color:#f87171;">rejected</strong>.</p>
                 <p style="margin:0;">You may reapply with updated documents at any time.</p>`,
        })
      );
    } catch (e) { console.error('Email error:', e.message); }

    return app;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = {
  applyAsSeller, getDashboard, getNotifications, markAllNotificationsRead, clearNotifications,
  approveApplication, rejectApplication,
  // Expose repo methods for admin
  getAllApplications: sellerRepo.findAllApplications,
  getApplicationById: sellerRepo.findApplicationById,
};
