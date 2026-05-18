const path = require('path');
const { SellerApplication, Notification, Ad, Order } = require(path.resolve(__dirname, '../../models/index'));
const { User } = require('../../models/user.model');
const sequelize = require('../../config/database');

const findApplicationByUserId = async (userId) => {
  return SellerApplication.findOne({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
};

const createApplication = async (data, transaction) => {
  return SellerApplication.create(data, { transaction });
};

const findApplicationById = async (id) => {
  return SellerApplication.findByPk(id, {
    include: [{ model: User, attributes: ['id', 'fullName', 'email', 'phone', 'sellerStatus'] }],
  });
};

const findAllApplications = async (statusFilter) => {
  const where = {};
  if (statusFilter) where.status = statusFilter;
  return SellerApplication.findAll({
    where,
    include: [{ model: User, attributes: ['id', 'fullName', 'email', 'phone', 'sellerStatus'] }],
    order: [['createdAt', 'DESC']],
  });
};

const updateApplicationStatus = async (id, status, transaction) => {
  const app = await SellerApplication.findByPk(id, { transaction });
  if (!app) return null;
  return app.update({ status }, { transaction });
};

module.exports = {
  findApplicationByUserId, createApplication, findApplicationById,
  findAllApplications, updateApplicationStatus,
};
