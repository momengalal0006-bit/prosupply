const adRepo = require('./ad.repository');

const getAllAds = async (filters, paginationOpts) => {
  return adRepo.findAll(filters, paginationOpts);
};

const getAdById = async (id) => {
  const ad = await adRepo.findById(id);
  if (!ad || ad.status === 'deleted') {
    const err = new Error('Ad not found.');
    err.statusCode = 404;
    throw err;
  }
  return ad;
};

const compareAds = async (ids) => {
  const ads = await adRepo.findByIds(ids);
  const foundIds = ads.map(a => a.id);
  const missingIds = ids.filter(id => !foundIds.includes(id));
  if (missingIds.length > 0) {
    const err = new Error(`Ads not found: ${missingIds.join(', ')}`);
    err.statusCode = 404;
    throw err;
  }
  return ads;
};

const createAd = async (data, userId) => {
  return adRepo.create({ ...data, sellerId: userId, status: 'active' });
};

const getAdForEdit = async (id, userId) => {
  const ad = await adRepo.findById(id);
  if (!ad) {
    const err = new Error('Ad not found.');
    err.statusCode = 404;
    throw err;
  }
  if (ad.sellerId !== userId) {
    const err = new Error('You are not the owner of this ad.');
    err.statusCode = 403;
    throw err;
  }
  return ad;
};

const updateAd = async (id, data, userId) => {
  const ad = await adRepo.findById(id);
  if (!ad) {
    const err = new Error('Ad not found.');
    err.statusCode = 404;
    throw err;
  }
  if (ad.sellerId !== userId) {
    const err = new Error('You are not the owner of this ad.');
    err.statusCode = 403;
    throw err;
  }
  return adRepo.update(id, data);
};

const deleteAd = async (id, userId) => {
  const ad = await adRepo.findById(id);
  if (!ad) {
    const err = new Error('Ad not found.');
    err.statusCode = 404;
    throw err;
  }
  if (ad.sellerId !== userId) {
    const err = new Error('You are not the owner of this ad.');
    err.statusCode = 403;
    throw err;
  }
  return adRepo.softDelete(id);
};

const hardDeleteAd = async (id, userId) => {
  const ad = await adRepo.findById(id);
  if (!ad) {
    const err = new Error('Ad not found.');
    err.statusCode = 404;
    throw err;
  }
  if (ad.sellerId !== userId) {
    const err = new Error('You are not the owner of this ad.');
    err.statusCode = 403;
    throw err;
  }
  return adRepo.hardDelete(id);
};

module.exports = { getAllAds, getAdById, compareAds, createAd, getAdForEdit, updateAd, deleteAd, hardDeleteAd };
