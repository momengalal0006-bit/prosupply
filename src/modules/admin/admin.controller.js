const adminService = require('./admin.service');
const { success } = require('../../utils/response');
const { paginate, paginatedResult } = require('../../utils/pagination');

const dashboard = async (req, res, next) => {
  try {
    const data = await adminService.getDashboard();
    success(res, data);
  } catch (err) { next(err); }
};

const getApplications = async (req, res, next) => {
  try {
    const data = await adminService.getApplications(req.query.status);
    success(res, data);
  } catch (err) { next(err); }
};

const getApplicationById = async (req, res, next) => {
  try {
    const data = await adminService.getApplicationById(parseInt(req.params.id));
    success(res, data);
  } catch (err) { next(err); }
};

const approveApplication = async (req, res, next) => {
  try {
    const data = await adminService.approveApplication(parseInt(req.params.id));
    success(res, { message: 'Application approved.', data });
  } catch (err) { next(err); }
};

const rejectApplication = async (req, res, next) => {
  try {
    const data = await adminService.rejectApplication(parseInt(req.params.id));
    success(res, { message: 'Application rejected.', data });
  } catch (err) { next(err); }
};

const getUsers = async (req, res, next) => {
  try {
    const pg = paginate(req.query);
    const { rows, count } = await adminService.getUsers(req.query.search, { limit: pg.limit, offset: pg.offset });
    success(res, paginatedResult(rows, count, pg));
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const data = await adminService.getUserById(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

const banUser = async (req, res, next) => {
  try {
    const data = await adminService.banUser(req.params.id);
    success(res, { message: 'User banned.', data });
  } catch (err) { next(err); }
};

const unbanUser = async (req, res, next) => {
  try {
    const data = await adminService.unbanUser(req.params.id);
    success(res, { message: 'User unbanned.', data });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.id);
    success(res, { message: 'User deleted.' });
  } catch (err) { next(err); }
};

const getAds = async (req, res, next) => {
  try {
    const pg = paginate(req.query);
    const { rows, count } = await adminService.getAds(req.query.search, { limit: pg.limit, offset: pg.offset });
    success(res, paginatedResult(rows, count, pg));
  } catch (err) { next(err); }
};

const deleteAd = async (req, res, next) => {
  try {
    await adminService.deleteAd(parseInt(req.params.id));
    success(res, { message: 'Ad deleted.' });
  } catch (err) { next(err); }
};

const getCommissions = async (req, res, next) => {
  try {
    const pg = paginate(req.query);
    const { rows, count, totalCommissions } = await adminService.getCommissions({ limit: pg.limit, offset: pg.offset });
    const result = paginatedResult(rows, count, pg);
    result.totalCommissions = totalCommissions;
    success(res, result);
  } catch (err) { next(err); }
};

module.exports = {
  dashboard, getApplications, getApplicationById,
  approveApplication, rejectApplication,
  getUsers, getUserById, banUser, unbanUser, deleteUser,
  getAds, deleteAd,
  getCommissions,
};
