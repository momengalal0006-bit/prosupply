const profileService = require('./profile.service');
const { success } = require('../../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.user.id);
    success(res, profile);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await profileService.updateProfile(req.user.id, req.body);
    success(res, profile);
  } catch (err) { next(err); }
};

const requestChangePassword = async (req, res, next) => {
  try {
    await profileService.requestPasswordChange(req.user.id);
    success(res, { message: 'OTP sent to your email.' });
  } catch (err) { next(err); }
};

const confirmChangePassword = async (req, res, next) => {
  try {
    await profileService.confirmPasswordChange(req.user.id, req.body);
    success(res, { message: 'Password changed successfully.' });
  } catch (err) { next(err); }
};

const getDeliveryAddress = async (req, res, next) => {
  try {
    const address = await profileService.getDeliveryAddress(req.user.id);
    success(res, address);
  } catch (err) { next(err); }
};

const saveDeliveryAddress = async (req, res, next) => {
  try {
    const address = await profileService.saveDeliveryAddress(req.user.id, req.body);
    success(res, address);
  } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, requestChangePassword, confirmChangePassword, getDeliveryAddress, saveDeliveryAddress };
