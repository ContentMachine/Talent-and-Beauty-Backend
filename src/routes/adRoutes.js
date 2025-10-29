const express = require('express');
const router = express.Router();
const {
  createAd,
  getClientAds,
  getTalentAds,
  getAllAdsForARCON,
  reviewAdByARCON,
  downloadTalentDocumentsForAd,
  getAdById,
  getAllAds,
} = require('../controllers/adController');
const { protect, authorize } = require('../middlewares/auth');
const { upload } = require('../config/cloudinary');
const { adCreationValidation } = require('../middlewares/validation');

router.post(
  '/',
  protect,
  authorize('client'),
  upload.fields([{ name: 'adMedia', maxCount: 10 }]),
  adCreationValidation,
  createAd
);

router.get('/client', protect, authorize('client'), getClientAds);

router.get('/talent', protect, authorize('talent'), getTalentAds);

router.get('/arcon', protect, authorize('arcon', 'admin', 'superadmin'), getAllAdsForARCON);

router.post('/arcon-review', protect, authorize('arcon', 'admin', 'superadmin'), reviewAdByARCON);

router.get(
  '/:adId/documents/:documentType',
  protect,
  authorize('arcon', 'admin', 'superadmin'),
  downloadTalentDocumentsForAd
);

router.get('/all', protect, authorize('admin', 'superadmin'), getAllAds);

router.get('/:id', protect, getAdById);

module.exports = router;
