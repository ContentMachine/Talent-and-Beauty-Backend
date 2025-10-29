const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: function() {
      return !this.isAnonymous;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'client', 'talent', 'arcon'],
    default: 'talent',
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationExpires: {
  type: Date,
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,
  passwordSetToken: String,
  passwordSetExpire: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.virtual('profile', {
  ref: function() {
    return this.role === 'talent' ? 'Talent' : 'Client';
  },
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpire = Date.now() + 30 * 60 * 1000;
  return resetToken;
};

userSchema.methods.generatePasswordSetToken = function() {
  const setToken = require('crypto').randomBytes(32).toString('hex');
  this.passwordSetToken = require('crypto')
    .createHash('sha256')
    .update(setToken)
    .digest('hex');
  this.passwordSetExpire = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return setToken;
};

module.exports = mongoose.model('User', userSchema);
