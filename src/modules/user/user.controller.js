const userService = require('./user.service');

const getMe = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (err) { next(err); }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    return res.status(200).json({ success: true, users: users.map((u) => u.toSafeObject()) });
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (err) { next(err); }
};

const updateUserRole = async (req, res, next) => {
  try {
    const user = await userService.updateUserRole(req.params.id, req.body.role);
    return res.status(200).json({ success: true, message: 'Role updated.', user: user.toSafeObject() });
  } catch (err) { next(err); }
};

const deactivateUser = async (req, res, next) => {
  try {
    await userService.deactivateUser(req.params.id);
    return res.status(200).json({ success: true, message: 'User deactivated.' });
  } catch (err) { next(err); }
};

const reactivateUser = async (req, res, next) => {
  try {
    await userService.reactivateUser(req.params.id);
    return res.status(200).json({ success: true, message: 'User reactivated.' });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    return res.status(200).json({ success: true, message: 'User deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getMe, getAllUsers, getUserById, updateUserRole, deactivateUser, reactivateUser, deleteUser };
