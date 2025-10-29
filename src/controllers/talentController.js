const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Talent = require('../models/Talent');
const { sendPasswordSetEmail, sendAdminNotificationEmail, sendARCONNotificationEmail } = require('../services/emailService');

const submitTalentAnonymous = async (req, res, next) => {
  const {
    email,
    firstName,
    lastName,
    phone,
    location,
    dateOfBirth,
    talentCategory,
    bio,
    experience,
    specialties,
    socialMedia,
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse("Email already registered. Please log in.", 400));
  }

  const user = await User.create({
    email,
    role: "talent",
    isAnonymous: true,
    isEmailVerified: false,
  });

  const ninFile = req.files?.nin?.[0];
  const photos = (req.files?.photos || []).map((f) => ({
    url: f.path,
    publicId: f.filename,
  }));
  const portfolio = (req.files?.portfolio || []).map((f) => ({
    url: f.path,
    publicId: f.filename,
    type: f.mimetype.startsWith("video") ? "video" : "image",
  }));

  const talent = await Talent.create({
    user: user._id,
    firstName,
    lastName,
    phone,
    location,
    dateOfBirth,
    talentCategory,
    bio,
    experience,
    specialties: Array.isArray(specialties) ? specialties : [specialties],
    nin: ninFile
      ? {
          documentUrl: ninFile.path,
          publicId: ninFile.filename,
          submittedToARCON: true,
          arconSubmissionDate: Date.now(),
        }
      : undefined,
    photos,
    portfolio,
    socialMedia,
    arconApprovalStatus: "pending",
  });

  const passwordSetToken = user.generatePasswordSetToken();
  await user.save({ validateBeforeSave: false });

  await sendPasswordSetEmail(email, passwordSetToken, firstName);
  await sendAdminNotificationEmail(
    "New Talent Submission (Anonymous)",
    `<p>${firstName} ${lastName} submitted a new ${talentCategory} portfolio.</p>`
  );

  if (ninFile && photos.length > 0) {
    await sendARCONNotificationEmail(
      "New Talent Verification Request",
      `<p>${firstName} ${lastName} requires verification.</p>`
    );
  }

  res.status(201).json({
    success: true,
    message: "Talent profile created. Check your email to set your password.",
    data: { email, talentId: talent._id },
  });
};

const createOrUpdateTalentProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, phone, location, dateOfBirth, talentCategory, bio, experience, specialties, socialMedia } = req.body;

  let talent = await Talent.findOne({ user: req.user._id });

  const portfolioFiles = req.files?.portfolio || [];
  const ninFile = req.files?.nin?.[0];
  const photoFiles = req.files?.photos || [];

  const portfolio = portfolioFiles.map(file => ({
    url: file.path,
    publicId: file.filename,
    type: file.mimetype.startsWith('video') ? 'video' : 'image',
  }));

  const photos = photoFiles.map(file => ({
    url: file.path,
    publicId: file.filename,
  }));

  const updateData = {
    firstName,
    lastName,
    phone,
    location,
    dateOfBirth,
    talentCategory,
    bio,
    experience,
    specialties: Array.isArray(specialties) ? specialties : [specialties],
    socialMedia,
  };

  if (portfolio.length > 0) {
    updateData.portfolio = talent ? [...talent.portfolio, ...portfolio] : portfolio;
  }

  if (photos.length > 0) {
    updateData.photos = talent ? [...talent.photos, ...photos] : photos;
  }

  if (ninFile) {
    updateData.nin = {
      documentUrl: ninFile.path,
      publicId: ninFile.filename,
      submittedToARCON: true,
      arconSubmissionDate: Date.now(),
    };

    await sendARCONNotificationEmail(
      'Talent Verification Request',
      `<p>Talent profile requires verification:</p>
       <p><strong>Name:</strong> ${firstName} ${lastName}</p>
       <p><strong>Email:</strong> ${req.user.email}</p>
       <p><strong>Category:</strong> ${talentCategory}</p>
       <p><strong>NIN Document:</strong> ${ninFile.path}</p>`
    );
  }

  if (talent) {
    talent = await Talent.findByIdAndUpdate(talent._id, updateData, {
      new: true,
      runValidators: true,
    });
  } else {
    talent = await Talent.create({
      user: req.user._id,
      ...updateData,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Talent profile updated successfully',
    data: talent,
  });
});

const getTalentProfile = asyncHandler(async (req, res, next) => {
  const talent = await Talent.findOne({ user: req.user._id }).populate('user', 'email role');

  if (!talent) {
    return next(new ErrorResponse('Talent profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: talent,
  });
});

const getAllApprovedTalents = asyncHandler(async (req, res, next) => {
  const { category, location, search, page = 1, limit = 20 } = req.query;

  const query = {
    arconApprovalStatus: 'approved',
    isPubliclyVisible: true,
  };

  if (category) {
    query.talentCategory = category;
  }

  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  if (search) {
    query.$text = { $search: search };
  }

  const talents = await Talent.find(query)
    .populate('user', 'email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ rating: -1, createdAt: -1 });

  const count = await Talent.countDocuments(query);

  res.status(200).json({
    success: true,
    data: talents,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const getTalentById = asyncHandler(async (req, res, next) => {
  const talent = await Talent.findById(req.params.id).populate('user', 'email');

  if (!talent) {
    return next(new ErrorResponse('Talent not found', 404));
  }

  if (talent.arconApprovalStatus !== 'approved' && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
    return next(new ErrorResponse('Talent profile not available', 403));
  }

  res.status(200).json({
    success: true,
    data: talent,
  });
});

const updateARCONApprovalStatus = asyncHandler(async (req, res, next) => {
  const { talentId, status, rejectionReason } = req.body;

  if (!['approved', 'rejected', 'under-review'].includes(status)) {
    return next(new ErrorResponse('Invalid approval status', 400));
  }

  const talent = await Talent.findById(talentId);

  if (!talent) {
    return next(new ErrorResponse('Talent not found', 404));
  }

  talent.arconApprovalStatus = status;
  talent.arconApprovalDate = Date.now();

  if (status === 'rejected') {
    talent.arconRejectionReason = rejectionReason;
  }

  if (status === 'approved') {
    talent.isPubliclyVisible = true;
    if (talent.nin) {
      talent.nin.verified = true;
    }
  }

  await talent.save();

  res.status(200).json({
    success: true,
    message: `Talent ${status} successfully`,
    data: talent,
  });
});

const downloadTalentDocuments = asyncHandler(async (req, res, next) => {
  const { talentId, documentType } = req.params;

  const talent = await Talent.findById(talentId);

  if (!talent) {
    return next(new ErrorResponse('Talent not found', 404));
  }

  let documentUrl;

  if (documentType === 'nin' && talent.nin?.documentUrl) {
    documentUrl = talent.nin.documentUrl;
  } else if (documentType === 'photos' && talent.photos.length > 0) {
    documentUrl = talent.photos.map(p => p.url);
  } else {
    return next(new ErrorResponse('Document not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      documentType,
      documents: Array.isArray(documentUrl) ? documentUrl : [documentUrl],
    },
  });
});

module.exports = {
  submitTalentAnonymous,
  createOrUpdateTalentProfile,
  getTalentProfile,
  getAllApprovedTalents,
  getTalentById,
  updateARCONApprovalStatus,
  downloadTalentDocuments,
};
