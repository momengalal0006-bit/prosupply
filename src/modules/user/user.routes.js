const router = require('express').Router();
const ctrl = require('./user.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const { validateUpdateRole, handleValidation } = require('../auth/auth.validator');

// Any authenticated user
router.get('/me', authenticate, ctrl.getMe);

// Admin-only routes
router.get('/', authenticate, authorize('admin'), ctrl.getAllUsers);
router.get('/:id', authenticate, authorize('admin'), ctrl.getUserById);
router.patch('/:id/role', authenticate, authorize('admin'), validateUpdateRole, handleValidation, ctrl.updateUserRole);
router.patch('/:id/deactivate', authenticate, authorize('admin'), ctrl.deactivateUser);
router.patch('/:id/reactivate', authenticate, authorize('admin'), ctrl.reactivateUser);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteUser);

module.exports = router;
