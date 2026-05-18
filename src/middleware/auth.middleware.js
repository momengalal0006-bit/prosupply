const path = require('path');
const { verifyAccessToken } = require('../utils/jwt.utils');
const { User } = require('../models/user.model');

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated.', code: 'ACCOUNT_DEACTIVATED' });
    }
    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'Account banned.', code: 'ACCOUNT_BANNED' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
