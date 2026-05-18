const isSeller = (req, res, next) => {
  if (req.user?.sellerStatus !== 'approved') {
    return res.status(403).json({ success: false, message: 'Seller access required.', code: 'FORBIDDEN' });
  }
  next();
};

module.exports = { isSeller };
