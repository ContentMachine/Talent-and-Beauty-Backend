const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Ad = require('../models/Ad');
const Payment = require('../models/Payment');
const Request = require('../models/Request');
const Client = require('../models/Client');
const Talent = require('../models/Talent');
const { sendARCONNotificationEmail } = require('../services/emailService');

const createAd = asyncHandler(async (req, res, next) => {
  const { requestId, title, description, category, paymentId } = req.body;

  const client = await Client.findOne({ user: req.user._id });
  if (!client) {
    return next(new ErrorResponse('Client profile not found', 404));
  }

  const request = await Request.findById(requestId);
  if (!request) {
    return next(new ErrorResponse('Request not found', 404));
  }

  if (request.client.toString() !== client._id.toString()) {
    return next(new ErrorResponse('Not authorized to create ad for this request', 403));
  }

  if (request.status !== 'accepted') {
    return next(new ErrorResponse('Can only create ads for accepted requests', 400));
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return next(new ErrorResponse('Payment not found', 404));
  }

  if (payment.client.toString() !== client._id.toString()) {
    return next(new ErrorResponse('Not authorized to use this payment', 403));
  }

  if (payment.status !== 'success') {
    return next(new ErrorResponse('Payment must be successful before creating ad', 400));
  }

  if (payment.ad) {
    return next(new ErrorResponse('This payment has already been used for an ad', 400));
  }

  const mediaFiles = req.files?.adMedia || [];
  const media = mediaFiles.map(file => ({
    url: file.path,
    publicId: file.filename,
    type: file.mimetype.startsWith('video') ? 'video' : 'image',
  }));

  const ad = await Ad.create({
    client: client._id,
    request: requestId,
    talent: request.talent,
    title,
    description,
    category,
    media,
    payment: paymentId,
    publishStatus: 'pending-arcon',
    arconStatus: 'pending',
    arconSubmissionDate: Date.now(),
  });

  payment.ad = ad._id;
  await payment.save();

  client.totalAdsSubmitted += 1;
  await client.save();

  const talent = await Talent.findById(request.talent);

  await sendARCONNotificationEmail(
    'New Ad Submitted for Review',
    `<p>A new advertisement has been submitted for ARCON approval:</p>
     <p><strong>Ad Title:</strong> ${title}</p>
     <p><strong>Category:</strong> ${category}</p>
     <p><strong>Client:</strong> ${client.companyName}</p>
     <p><strong>Talent:</strong> ${talent.firstName} ${talent.lastName}</p>
     <p><strong>Amount Paid:</strong> ₦${payment.amount.toLocaleString()}</p>
     <p>Please review and approve/reject this ad.</p>`
  );

  await ad.populate([
    { path: 'client', populate: { path: 'user', select: 'email' } },
    { path: 'talent' },
    { path: 'payment' },
  ]);

  res.status(201).json({
    success: true,
    message: 'Ad created and submitted to ARCON for approval',
    data: ad,
  });
});

const getClientAds = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const client = await Client.findOne({ user: req.user._id });
  if (!client) {
    return next(new ErrorResponse('Client profile not found', 404));
  }

  const query = { client: client._id };
  if (status) {
    query.arconStatus = status;
  }

  const ads = await Ad.find(query)
    .populate('talent', 'firstName lastName talentCategory')
    .populate('payment', 'amount status')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Ad.countDocuments(query);

  res.status(200).json({
    success: true,
    data: ads,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const getTalentAds = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const talent = await Talent.findOne({ user: req.user._id });
  if (!talent) {
    return next(new ErrorResponse('Talent profile not found', 404));
  }

  const ads = await Ad.find({ talent: talent._id })
    .populate('client', 'companyName logo')
    .populate('payment', 'amount')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Ad.countDocuments({ talent: talent._id });

  res.status(200).json({
    success: true,
    data: ads,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const getAllAdsForARCON = asyncHandler(async (req, res, next) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;

  const ads = await Ad.find({ arconStatus: status })
    .populate('client', 'companyName')
    .populate({
      path: 'client',
      populate: { path: 'user', select: 'email' }
    })
    .populate('talent', 'firstName lastName nin photos')
    .populate('payment', 'amount paystackReference')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ arconSubmissionDate: 1 });

  const count = await Ad.countDocuments({ arconStatus: status });

  res.status(200).json({
    success: true,
    data: ads,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const reviewAdByARCON = asyncHandler(async (req, res, next) => {
  const { adId, decision, reviewNotes, rejectionReason } = req.body;

  if (!['approved', 'rejected', 'under-review'].includes(decision)) {
    return next(new ErrorResponse('Invalid decision', 400));
  }

  const ad = await Ad.findById(adId);

  if (!ad) {
    return next(new ErrorResponse('Ad not found', 404));
  }

  ad.arconStatus = decision;
  ad.arconReviewDate = Date.now();
  ad.arconReviewNotes = reviewNotes;
  ad.arconApprovedBy = req.user.email;

  if (decision === 'approved') {
    ad.publishStatus = 'approved';
    ad.publishDate = Date.now();
  } else if (decision === 'rejected') {
    ad.publishStatus = 'rejected';
    ad.arconRejectionReason = rejectionReason;
  }

  await ad.save();

  res.status(200).json({
    success: true,
    message: `Ad ${decision} successfully`,
    data: ad,
  });
});

const downloadTalentDocumentsForAd = asyncHandler(async (req, res, next) => {
  const { adId, documentType } = req.params;

  const ad = await Ad.findById(adId).populate('talent');

  if (!ad) {
    return next(new ErrorResponse('Ad not found', 404));
  }

  const talent = ad.talent;

  if (documentType === 'nin') {
    if (!talent.nin?.documentUrl) {
      return next(new ErrorResponse('NIN document not available', 404));
    }

    ad.arconDownloadedNIN = true;
    await ad.save();

    return res.status(200).json({
      success: true,
      data: {
        documentUrl: talent.nin.documentUrl,
        publicId: talent.nin.publicId,
      },
    });
  }

  if (documentType === 'photos') {
    if (!talent.photos || talent.photos.length === 0) {
      return next(new ErrorResponse('Photos not available', 404));
    }

    ad.arconDownloadedPhotos = true;
    await ad.save();

    return res.status(200).json({
      success: true,
      data: {
        photos: talent.photos,
      },
    });
  }

  return next(new ErrorResponse('Invalid document type', 400));
});

const getAdById = asyncHandler(async (req, res, next) => {
  const ad = await Ad.findById(req.params.id)
    .populate('client')
    .populate({
      path: 'client',
      populate: { path: 'user', select: 'email' }
    })
    .populate('talent')
    .populate('payment')
    .populate('request');

  if (!ad) {
    return next(new ErrorResponse('Ad not found', 404));
  }

  const client = await Client.findOne({ user: req.user._id });
  const talent = await Talent.findOne({ user: req.user._id });

  const isAuthorized =
    req.user.role === 'admin' ||
    req.user.role === 'superadmin' ||
    req.user.role === 'arcon' ||
    (client && ad.client._id.toString() === client._id.toString()) ||
    (talent && ad.talent._id.toString() === talent._id.toString());

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to view this ad', 403));
  }

  res.status(200).json({
    success: true,
    data: ad,
  });
});

const getAllAds = asyncHandler(async (req, res, next) => {
  const { status, category, page = 1, limit = 20 } = req.query;

  const query = {};

  if (status) {
    query.arconStatus = status;
  }

  if (category) {
    query.category = category;
  }

  const ads = await Ad.find(query)
    .populate('client', 'companyName logo')
    .populate('talent', 'firstName lastName talentCategory')
    .populate('payment', 'amount status')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Ad.countDocuments(query);

  const stats = await Ad.aggregate([
    {
      $group: {
        _id: '$arconStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: ads,
    stats,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

module.exports = {
  createAd,
  getClientAds,
  getTalentAds,
  getAllAdsForARCON,
  reviewAdByARCON,
  downloadTalentDocumentsForAd,
  getAdById,
  getAllAds,
};
