const path = require('path');
const { Ad, AdReview } = require(path.resolve(__dirname, '../../models/index'));
const { User } = require('../../models/user.model');
const { Op } = require('sequelize');

const findAll = async (filters = {}, { limit, offset } = {}) => {
  const where = { status: 'active' };

  if (filters.search) {
    where.title = { [Op.iLike]: `%${filters.search}%` };
  }
  if (filters.brand) where.brand = { [Op.iLike]: filters.brand };
  if (filters.category) where.category = filters.category;
  if (filters.sellerId) where.sellerId = filters.sellerId;
  if (filters.countryOfOrigin) where.countryOfOrigin = { [Op.iLike]: filters.countryOfOrigin };
  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) where.price[Op.gte] = parseFloat(filters.minPrice);
    if (filters.maxPrice) where.price[Op.lte] = parseFloat(filters.maxPrice);
  }
  if (filters.warrantyMonthsMin) {
    where.warrantyMonths = { [Op.gte]: parseInt(filters.warrantyMonthsMin) };
  }
  if (filters.minRating) {
    where.avgRating = { [Op.gte]: parseFloat(filters.minRating) };
  }

  const includeSeller = { model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] };
  if (filters.minSellerRating) {
    includeSeller.where = { avgSellerRating: { [Op.gte]: parseFloat(filters.minSellerRating) } };
    includeSeller.required = true;
  }

  const queryOpts = {
    where,
    include: [includeSeller],
    order: [['createdAt', 'DESC']],
  };

  if (limit !== undefined) {
    queryOpts.limit = limit;
    queryOpts.offset = offset || 0;
  }

  const { count, rows } = await Ad.findAndCountAll(queryOpts);
  return { rows, count };
};

const findById = async (id) => {
  return Ad.findByPk(id, {
    include: [
      { model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] },
      {
        model: AdReview,
        include: [{ model: User, as: 'buyer', attributes: ['id', 'fullName'] }],
      },
    ],
  });
};

const findByIds = async (ids) => {
  return Ad.findAll({
    where: { id: { [Op.in]: ids }, status: 'active' },
    include: [{ model: User, as: 'seller', attributes: ['id', 'fullName', 'avgSellerRating', 'trustScore'] }],
  });
};

const create = async (data) => {
  return Ad.create(data);
};

const update = async (id, data) => {
  const ad = await Ad.findByPk(id);
  if (!ad) return null;
  return ad.update(data);
};

const softDelete = async (id) => {
  const ad = await Ad.findByPk(id);
  if (!ad) return null;
  return ad.update({ status: 'deleted' });
};

// Admin: find all ads regardless of status with pagination
const findAllAdmin = async (filters = {}, { limit, offset } = {}) => {
  const where = {};
  const include = [{ model: User, as: 'seller', attributes: ['id', 'fullName'] }];

  if (filters.search) {
    // Search by title OR seller name using subQuery: false approach
    where[Op.or] = [
      { title: { [Op.iLike]: `%${filters.search}%` } },
      { '$seller.fullName$': { [Op.iLike]: `%${filters.search}%` } },
    ];
    include[0].required = false;
  }

  const queryOpts = {
    where,
    include,
    order: [['createdAt', 'DESC']],
    subQuery: false,
  };

  if (limit !== undefined) {
    queryOpts.limit = limit;
    queryOpts.offset = offset || 0;
  }

  const { count, rows } = await Ad.findAndCountAll(queryOpts);
  return { rows, count };
};

const hardDelete = async (id) => {
  const ad = await Ad.findByPk(id);
  if (!ad) return null;
  return ad.destroy();
};

module.exports = { findAll, findById, findByIds, create, update, softDelete, findAllAdmin, hardDelete };
