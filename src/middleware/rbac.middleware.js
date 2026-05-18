const { PERMISSIONS } = require('../models/user.model');

/**
 * Allow access only if the authenticated user's role is in the provided list.
 * Must be used AFTER the `authenticate` middleware.
 *
 * @param  {...string} roles - Allowed roles, e.g. 'admin', 'supplier'
 * @returns {import('express').RequestHandler}
 */
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

/**
 * Allow access only if the authenticated user's role includes a specific
 * permission string defined in the PERMISSIONS map.
 *
 * @param {string} permission - e.g. 'manage_users', 'place_orders'
 * @returns {import('express').RequestHandler}
 */
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
