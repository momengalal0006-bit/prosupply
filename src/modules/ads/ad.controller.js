const path = require('path');
const adService = require('./ad.service');
const { uploadToSupabase } = require('../../utils/supabaseUpload');
const { success } = require('../../utils/response');
const { paginate, paginatedResult } = require('../../utils/pagination');

const getAll = async (req, res, next) => {
  try {
    const pg = paginate(req.query);
    const { rows, count } = await adService.getAllAds(req.query, { limit: pg.limit, offset: pg.offset });
    success(res, paginatedResult(rows, count, pg));
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const ad = await adService.getAdById(parseInt(req.params.id));
    success(res, ad);
  } catch (err) { next(err); }
};

const compare = async (req, res, next) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',').map(Number) : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided.', code: 'VALIDATION_ERROR' });
    }
    const ads = await adService.compareAds(ids);
    success(res, ads);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    let images = [];
    if (req.files && req.files.length > 0) {
      images = await Promise.all(
        req.files.map((f) => uploadToSupabase(f, 'uploads', 'images'))
      );
    }
    let specs = req.body.specs;
    if (typeof specs === 'string') {
      try { specs = JSON.parse(specs); } catch (e) { specs = {}; }
    }
    const data = {
      title: req.body.title,
      brand: req.body.brand,
      category: req.body.category,
      price: req.body.price,
      quantity: parseInt(req.body.quantity) || 0,
      specs,
      images,
      description: req.body.description,
      countryOfOrigin: req.body.countryOfOrigin,
      warrantyMonths: parseInt(req.body.warrantyMonths) || 0,
    };
    const ad = await adService.createAd(data, req.user.id);
    success(res, ad, 201);
  } catch (err) { next(err); }
};

const getForEdit = async (req, res, next) => {
  try {
    const ad = await adService.getAdForEdit(parseInt(req.params.id), req.user.id);
    success(res, ad);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    let images = undefined;
    if (req.files && req.files.length > 0) {
      images = await Promise.all(
        req.files.map((f) => uploadToSupabase(f, 'uploads', 'images'))
      );
    }
    let specs = req.body.specs;
    if (typeof specs === 'string') {
      try { specs = JSON.parse(specs); } catch (e) { specs = undefined; }
    }
    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.brand !== undefined) data.brand = req.body.brand;
    if (req.body.category !== undefined) data.category = req.body.category;
    if (req.body.price !== undefined) data.price = req.body.price;
    if (req.body.quantity !== undefined) data.quantity = parseInt(req.body.quantity);
    if (specs !== undefined) data.specs = specs;
    if (images) data.images = images;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.countryOfOrigin !== undefined) data.countryOfOrigin = req.body.countryOfOrigin;
    if (req.body.warrantyMonths !== undefined) data.warrantyMonths = parseInt(req.body.warrantyMonths);

    const ad = await adService.updateAd(parseInt(req.params.id), data, req.user.id);
    success(res, ad);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await adService.deleteAd(parseInt(req.params.id), req.user.id);
    success(res, { message: 'Ad deleted successfully.' });
  } catch (err) { next(err); }
};

const hardRemove = async (req, res, next) => {
  try {
    await adService.hardDeleteAd(parseInt(req.params.id), req.user.id);
    success(res, { message: 'Ad permanently removed.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, compare, create, getForEdit, update, remove, hardRemove };
