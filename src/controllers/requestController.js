const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Request = require('../models/Request');
const Talent = require('../models/Talent');
const Client = require('../models/Client');

const createRequest = asyncHandler(async (req, res, next) => {
  const { talentId, projectTitle, projectDescription, budget, timeline, clientNotes } = req.body;

  const client = await Client.findOne({ user: req.user._id });
  if (!client) {
    return next(new ErrorResponse('Client profile not found', 404));
  }

  const talent = await Talent.findById(talentId);
  if (!talent) {
    return next(new ErrorResponse('Talent not found', 404));
  }

  if (talent.arconApprovalStatus !== 'approved') {
    return next(new ErrorResponse('This talent is not yet approved', 400));
  }

  const request = await Request.create({
    client: client._id,
    talent: talentId,
    projectTitle,
    projectDescription,
    budget,
    timeline,
    clientNotes,
    status: 'pending',
  });

  await request.populate([
    { path: 'client', populate: { path: 'user', select: 'email' } },
    { path: 'talent', populate: { path: 'user', select: 'email' } },
  ]);

  res.status(201).json({
    success: true,
    message: 'Request sent to talent successfully',
    data: request,
  });
});

const getClientRequests = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const client = await Client.findOne({ user: req.user._id });
  if (!client) {
    return next(new ErrorResponse('Client profile not found', 404));
  }

  const query = { client: client._id };
  if (status) {
    query.status = status;
  }

  const requests = await Request.find(query)
    .populate('talent', 'firstName lastName talentCategory photos')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Request.countDocuments(query);

  res.status(200).json({
    success: true,
    data: requests,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const getTalentRequests = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const talent = await Talent.findOne({ user: req.user._id });
  if (!talent) {
    return next(new ErrorResponse('Talent profile not found', 404));
  }

  const query = { talent: talent._id };
  if (status) {
    query.status = status;
  }

  const requests = await Request.find(query)
    .populate('client')
    .populate({
      path: 'client',
      populate: { path: 'user', select: 'email' }
    })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Request.countDocuments(query);

  res.status(200).json({
    success: true,
    data: requests,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const respondToRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { decision, message } = req.body;

  if (!['accepted', 'declined'].includes(decision)) {
    return next(new ErrorResponse('Invalid decision. Must be "accepted" or "declined"', 400));
  }

  const talent = await Talent.findOne({ user: req.user._id });
  if (!talent) {
    return next(new ErrorResponse('Talent profile not found', 404));
  }

  const request = await Request.findById(requestId);

  if (!request) {
    return next(new ErrorResponse('Request not found', 404));
  }

  if (request.talent.toString() !== talent._id.toString()) {
    return next(new ErrorResponse('Not authorized to respond to this request', 403));
  }

  if (request.status !== 'pending') {
    return next(new ErrorResponse('This request has already been responded to', 400));
  }

  request.status = decision;
  request.talentResponse = {
    decision,
    message,
    respondedAt: Date.now(),
  };

  await request.save();

  await request.populate([
    { path: 'client', populate: { path: 'user', select: 'email' } },
    { path: 'talent', populate: { path: 'user', select: 'email' } },
  ]);

  res.status(200).json({
    success: true,
    message: `Request ${decision} successfully`,
    data: request,
  });
});

const getRequestById = asyncHandler(async (req, res, next) => {
  const request = await Request.findById(req.params.id)
    .populate('client')
    .populate({
      path: 'client',
      populate: { path: 'user', select: 'email' }
    })
    .populate('talent')
    .populate({
      path: 'talent',
      populate: { path: 'user', select: 'email' }
    });

  if (!request) {
    return next(new ErrorResponse('Request not found', 404));
  }

  const client = await Client.findOne({ user: req.user._id });
  const talent = await Talent.findOne({ user: req.user._id });

  const isAuthorized =
    req.user.role === 'admin' ||
    req.user.role === 'superadmin' ||
    (client && request.client._id.toString() === client._id.toString()) ||
    (talent && request.talent._id.toString() === talent._id.toString());

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to view this request', 403));
  }

  res.status(200).json({
    success: true,
    data: request,
  });
});

const cancelRequest = asyncHandler(async (req, res, next) => {
  const request = await Request.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse('Request not found', 404));
  }

  const client = await Client.findOne({ user: req.user._id });
  if (!client || request.client.toString() !== client._id.toString()) {
    return next(new ErrorResponse('Not authorized to cancel this request', 403));
  }

  if (request.status !== 'pending') {
    return next(new ErrorResponse('Cannot cancel a request that has been responded to', 400));
  }

  request.status = 'cancelled';
  await request.save();

  res.status(200).json({
    success: true,
    message: 'Request cancelled successfully',
    data: request,
  });
});

module.exports = {
  createRequest,
  getClientRequests,
  getTalentRequests,
  respondToRequest,
  getRequestById,
  cancelRequest,
};
