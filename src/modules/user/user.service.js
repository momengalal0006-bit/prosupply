const { User } = require('../../models/user.model');

const getUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

const getAllUsers = async () => {
  return User.findAll({ order: [['createdAt', 'DESC']] });
};

const updateUserRole = async (id, role) => {
  const user = await getUserById(id);
  user.role = role;
  await user.save();
  return user;
};

const deactivateUser = async (id) => {
  const user = await getUserById(id);
  user.isActive = false;
  user.refreshToken = null;
  await user.save();
  return user;
};

const reactivateUser = async (id) => {
  const user = await getUserById(id);
  user.isActive = true;
  await user.save();
  return user;
};

const deleteUser = async (id) => {
  const user = await getUserById(id);
  await user.destroy();
};

module.exports = { getUserById, getAllUsers, updateUserRole, deactivateUser, reactivateUser, deleteUser };
