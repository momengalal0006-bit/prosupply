const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const trustController = require('./trust.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/isAdmin.middleware');


router.use(authenticate, isAdmin);

router.get('/dashboard', adminController.dashboard);


router.get('/seller-applications', adminController.getApplications);
router.get('/seller-applications/:id', adminController.getApplicationById);
router.put('/seller-applications/:id/approve', adminController.approveApplication);
router.put('/seller-applications/:id/reject', adminController.rejectApplication);


router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/unban', adminController.unbanUser);
router.delete('/users/:id', adminController.deleteUser);


router.get('/ads', adminController.getAds);
router.delete('/ads/:id', adminController.deleteAd);


router.get('/commissions', adminController.getCommissions);


router.get('/trust/flagged', trustController.getFlagged);
router.post('/trust/recalculate', trustController.recalculate);
router.get('/trust/:id', trustController.getSellerTrust);

module.exports = router;
