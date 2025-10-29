const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Talent = require('../models/Talent');
const Client = require('../models/Client');
const Ad = require('../models/Ad');
const Payment = require('../models/Payment');
const Contact = require('../models/Contact');

const getDashboardStats = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments({ isActive: true });
  const totalTalents = await Talent.countDocuments();
  const totalClients = await Client.countDocuments();
  const totalAds = await Ad.countDocuments();

  const pendingTalentApprovals = await Talent.countDocuments({ arconApprovalStatus: 'pending' });
  const approvedTalents = await Talent.countDocuments({ arconApprovalStatus: 'approved' });

  const pendingAdApprovals = await Ad.countDocuments({ arconStatus: 'pending' });
  const approvedAds = await Ad.countDocuments({ arconStatus: 'approved' });

  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const pendingContacts = await Contact.countDocuments({ status: 'new' });

  const recentTalents = await Talent.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'email');

  const recentAds = await Ad.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('client', 'companyName')
    .populate('talent', 'firstName lastName');

  const recentPayments = await Payment.find({ status: 'success' })
    .sort({ paidAt: -1 })
    .limit(5)
    .populate('client', 'companyName');

  const usersByRole = await User.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);

  const adsByCategory = await Ad.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const monthlyRevenue = await Payment.aggregate([
    { $match: { status: 'success' } },
    {
      $group: {
        _id: {
          year: { $year: '$paidAt' },
          month: { $month: '$paidAt' },
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalTalents,
        totalClients,
        totalAds,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingContacts,
      },
      approvals: {
        pendingTalentApprovals,
        approvedTalents,
        pendingAdApprovals,
        approvedAds,
      },
      recent: {
        talents: recentTalents,
        ads: recentAds,
        payments: recentPayments,
      },
      analytics: {
        usersByRole,
        adsByCategory,
        monthlyRevenue,
      },
    },
  });
});

const getAllUsers = asyncHandler(async (req, res, next) => {
  const { role, isActive, page = 1, limit = 20 } = req.query;

  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const users = await User.find(query)
    .select('-password')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { userId, isActive } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { isActive },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: user,
  });
});

const createAdminUser = asyncHandler(async (req, res, next) => {
  const { email, password, role } = req.body;

  if (!['admin', 'arcon'].includes(role)) {
    return next(new ErrorResponse('Can only create admin or ARCON users', 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('Email already registered', 400));
  }

  const user = await User.create({
    email,
    password,
    role,
    isEmailVerified: true,
  });

  res.status(201).json({
    success: true,
    message: `${role} user created successfully`,
    data: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
});

const getSystemLogs = asyncHandler(async (req, res, next) => {
  const recentActivities = [];

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('email role createdAt');

  recentUsers.forEach(user => {
    recentActivities.push({
      type: 'user_created',
      description: `New ${user.role} registered: ${user.email}`,
      timestamp: user.createdAt,
    });
  });

  const recentPayments = await Payment.find({ status: 'success' })
    .sort({ paidAt: -1 })
    .limit(10)
    .populate('client', 'companyName');

  recentPayments.forEach(payment => {
    recentActivities.push({
      type: 'payment_success',
      description: `Payment received: ₦${payment.amount.toLocaleString()} from ${payment.client.companyName}`,
      timestamp: payment.paidAt,
    });
  });

  recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.status(200).json({
    success: true,
    data: {
      activities: recentActivities.slice(0, 20),
    },
  });
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  createAdminUser,
  getSystemLogs,
};
