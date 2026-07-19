const express = require('express');
const router = express.Router();
const adController = require('./ad.controller');
const recommendationController = require('./recommendation.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { optionalAuth } = require('../../middleware/optionalAuth.middleware');
const { isSeller } = require('../../middleware/isSeller.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { validateCreateAd, validateUpdateAd } = require('./ad.validation');
const { uploadImages } = require('../../config/multer');

router.get('/', adController.getAll);
router.get('/compare', adController.compare);
router.get('/recommendations/personal', optionalAuth, recommendationController.personal);
router.get('/recommendations/sellers', optionalAuth, recommendationController.matchedSellers);
router.get('/:id', adController.getById);
router.get('/:id/similar', recommendationController.similar);
router.get('/:id/alternatives', recommendationController.alternatives);

router.post('/', authenticate, isSeller, uploadImages.array('images', 10), validateCreateAd, validate, adController.create);
router.get('/:id/edit', authenticate, isSeller, adController.getForEdit);
router.put('/:id', authenticate, isSeller, uploadImages.array('images', 10), validateUpdateAd, validate, adController.update);
router.delete('/:id', authenticate, isSeller, adController.remove);
router.delete('/:id/hard', authenticate, isSeller, adController.hardRemove);

module.exports = router;
