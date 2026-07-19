const isUser = (req, res, next) => {
  if (req.user?.role !== 'user') {
    return res.status(403).json({ success: false, message: 'User access required.', code: 'FORBIDDEN' });
  }
  next();
};

module.exports = { isUser };
