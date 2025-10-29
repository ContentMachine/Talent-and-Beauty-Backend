const mongoose = require('mongoose');

const talentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  talentCategory: {
    type: String,
    required: [true, 'Talent category is required'],
    enum: ['actor', 'model', 'voice-artist', 'musician', 'dancer', 'influencer', 'other'],
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters'],
  },
  experience: {
    type: String,
  },
  specialties: [{
    type: String,
  }],
  portfolio: [{
    url: String,
    publicId: String,
    type: {
      type: String,
      enum: ['image', 'video'],
    },
    caption: String,
  }],
  nin: {
    documentUrl: String,
    publicId: String,
    verified: {
      type: Boolean,
      default: false,
    },
    submittedToARCON: {
      type: Boolean,
      default: false,
    },
    arconSubmissionDate: Date,
  },
  photos: [{
    url: String,
    publicId: String,
  }],
  socialMedia: {
    instagram: String,
    twitter: String,
    website: String,
    other: String,
  },
  arconApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under-review'],
    default: 'pending',
  },
  arconApprovalDate: Date,
  arconRejectionReason: String,
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  isPubliclyVisible: {
    type: Boolean,
    default: false,
  },
  completedJobs: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

talentSchema.index({ firstName: 'text', lastName: 'text', bio: 'text', specialties: 'text' });
talentSchema.index({ talentCategory: 1, arconApprovalStatus: 1 });
talentSchema.index({ location: 1 });

talentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Talent', talentSchema);
