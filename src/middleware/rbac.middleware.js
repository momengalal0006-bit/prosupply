const { PERMISSIONS } = require('../models/user.model');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to perform this action.',
      });
    }
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Authentication required.',
      });
    }

    const rolePerms = PERMISSIONS[req.user.role];
    if (!rolePerms || !rolePerms.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Missing permission: ${permission}.`,
      });
    }
    next();
  };
};

module.exports = { authorize, requirePermission };
