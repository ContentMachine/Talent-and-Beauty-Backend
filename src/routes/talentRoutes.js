const express = require('express');
const router = express.Router();
const {
  submitTalentAnonymous,
  createOrUpdateTalentProfile,
  getTalentProfile,
  getAllApprovedTalents,
  getTalentById,
  updateARCONApprovalStatus,
  downloadTalentDocuments,
} = require('../controllers/talentController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');
const { asyncHandler } = require("../middlewares/asyncHandler");
const { upload } = require('../config/cloudinary');
const { talentSubmissionValidation } = require('../middlewares/validation');


// Optional: normalize social media fields
const normalizeSocialMedia = (req, _res, next) => {
  req.body.socialMedia = {
    instagram: req.body["socialMedia[instagram]"] || "",
    twitter: req.body["socialMedia[twitter]"] || "",
    website: req.body["socialMedia[website]"] || "",
    other: req.body["socialMedia[other]"] || "",
  };
  next();
};

// Talent submission route
router.post(
  "/submit-anonymous",
  upload.fields([
    { name: "nin", maxCount: 1 },
    { name: "photos", maxCount: 5 },
    { name: "portfolio", maxCount: 10 },
  ]),
  normalizeSocialMedia,
  talentSubmissionValidation,
  asyncHandler(submitTalentAnonymous)
);

router.post(
  '/profile',
  protect,
  authorize('talent'),
  upload.fields([
    { name: 'portfolio', maxCount: 10 },
    { name: 'nin', maxCount: 1 },
    { name: 'photos', maxCount: 5 },
  ]),
  createOrUpdateTalentProfile
);

router.get('/profile', protect, authorize('talent'), getTalentProfile);

router.get('/approved', optionalAuth, getAllApprovedTalents);

router.get('/:id', protect, getTalentById);

router.post(
  '/arcon-approval',
  protect,
  authorize('arcon', 'admin', 'superadmin'),
  updateARCONApprovalStatus
);

router.get(
  '/:talentId/documents/:documentType',
  protect,
  authorize('arcon', 'admin', 'superadmin'),
  downloadTalentDocuments
);

module.exports = router;
