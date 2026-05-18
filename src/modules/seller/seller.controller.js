const path = require('path');
const sellerService = require('./seller.service');
const { uploadToSupabase } = require('../../utils/supabaseUpload');
const { success } = require('../../utils/response');

const apply = async (req, res, next) => {
  try {
    let documents = [];
    if (req.files && req.files.length > 0) {
      documents = await Promise.all(
        req.files.map((f) => uploadToSupabase(f, 'uploads', 'documents'))
      );
    }
    const application = await sellerService.applyAsSeller(req.user.id, {
      businessName: req.body.businessName,
      documents,
    });
    success(res, application, 201);
  } catch (err) { next(err); }
};

const dashboard = async (req, res, next) => {
  try {
    const data = await sellerService.getDashboard(req.user.id);
    success(res, data);
  } catch (err) { next(err); }
};

const notifications = async (req, res, next) => {
  try {
    const data = await sellerService.getNotifications(req.user.id);
    success(res, data);
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await sellerService.markAllNotificationsRead(req.user.id);
    success(res, { message: 'All notifications marked as read.' });
  } catch (err) { next(err); }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    await sellerService.clearNotifications(req.user.id);
    success(res, { message: 'All notifications cleared.' });
  } catch (err) { next(err); }
};

module.exports = { apply, dashboard, notifications, markAllRead, clearAllNotifications };
