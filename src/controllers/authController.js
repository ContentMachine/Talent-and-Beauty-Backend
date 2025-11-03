const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Client = require('../models/Client');
const Talent = require('../models/Talent');
const { generateToken } = require('../utils/jwt');
const {
  sendPasswordSetEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendVerificationEmail
} = require('../services/emailService');

const signup = asyncHandler(async (req, res, next) => {
  const { email, password, role, ...profileData } = req.body;

  // Validate role
  if (!['client', 'talent'].includes(role)) {
    return next(new ErrorResponse('Invalid role for signup', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('Email already registered', 400));
  }

  // Create user with email unverified
  const user = await User.create({
    email,
    password,
    role,
    isEmailVerified: false, // ⛔ initially unverified
  });

  // Create client profile if applicable
  if (role === 'client') {
    await Client.create({
      user: user._id,
      companyName: profileData.companyName,
      industry: profileData.industry,
      location: profileData.location,
    });
  }

  // Generate verification token (24-hour expiry)
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();
  

  // Send verification email
  await sendVerificationEmail(email, verificationToken, profileData.companyName || email);

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Please check your email to verify your account.',
  });
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.isActive) {
    return next(new ErrorResponse('Invalid email credentials', 401));
  }

    // Check if email verified
  if (!user.isEmailVerified) {
    return next(new ErrorResponse('Please verify your email before logging in', 403));
  }

  if (user.isAnonymous) {
    return next(new ErrorResponse('Please set your password first using the link sent to your email', 401));
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid password credentials', 401));
  }

  user.lastLogin = Date.now();
  await user.save();

  const token = generateToken(user._id, user.role);

  let profile = null;
  if (user.role === 'talent') {
    profile = await Talent.findOne({ user: user._id });
  } else if (user.role === 'client') {
    profile = await Client.findOne({ user: user._id });
  } else if (user.role === 'superadmin') {
    profile = await Client.findOne({ user: user._id });
  }

  res.status(200).json({
    success: true,
    data: {
      user: user,
      profile,
      token,
    },
  });
});

const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.query;
  console.log("🔹 Received token:", token);

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  console.log("User found:", user);


const users = await User.find({}, { emailVerificationToken: 1 }).limit(3);
console.log("Sample tokens in DB:", users.map(u => u.emailVerificationToken));

console.log("Sample tokens",users.emailVerificationExpires, Date.now());

  if (!user) {
    return next(new ErrorResponse('Invalid or expired verification link', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  

  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
  });
});

const resendVerifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.query;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired verification link', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
  });
});


const setPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new ErrorResponse('Token and password are required', 400));
  }

  if (password.length < 6) {
    return next(new ErrorResponse('Password must be at least 6 characters', 400));
  }

  const passwordSetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordSetToken,
    passwordSetExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  user.password = password;
  user.isAnonymous = false;
  user.passwordSetToken = undefined;
  user.passwordSetExpire = undefined;
  user.isEmailVerified = true;
  await user.save();

  const jwtToken = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Password set successfully. You can now log in.',
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      token: jwtToken,
    },
  });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorResponse('No account with that email exists', 404));
  }

  if (user.isAnonymous) {
    return next(new ErrorResponse('Please set your password first using the link sent to your email', 400));
  }

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  let name = email;
  if (user.role === 'talent') {
    const talent = await Talent.findOne({ user: user._id });
    if (talent) name = talent.firstName;
  } else if (user.role === 'client') {
    const client = await Client.findOne({ user: user._id });
    if (client) name = client.companyName;
  }

  try {
    await sendPasswordResetEmail(email, resetToken, name);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new ErrorResponse('Token and password are required', 400));
  }

  if (password.length < 6) {
    return next(new ErrorResponse('Password must be at least 6 characters', 400));
  }

  const passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken,
    passwordResetExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  await user.save();

  const jwtToken = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
    data: {
      token: jwtToken,
    },
  });
});

const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  let profile = null;
  if (user.role === 'talent') {
    profile = await Talent.findOne({ user: user._id });
  } else if (user.role === 'client') {
    profile = await Client.findOne({ user: user._id });
  }

  res.status(200).json({
    success: true,
    data: {
      user,
      profile,
    },
  });
});

const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorResponse('Please provide current and new password', 400));
  }

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  const token = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    data: { token },
  });
});

module.exports = {
  signup,
  login,
  setPassword,
  forgotPassword,
  resetPassword,
  getMe,
  updatePassword,
  verifyEmail,
  resendVerifyEmail
};
