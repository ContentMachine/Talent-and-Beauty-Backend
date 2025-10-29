const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
  },
  talent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Talent',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Ad title is required'],
  },
  description: {
    type: String,
    required: [true, 'Ad description is required'],
  },
  category: {
    type: String,
    required: [true, 'Ad category is required'],
    enum: ['tv-commercial', 'radio', 'print', 'digital', 'social-media', 'billboard', 'other'],
  },
  media: [{
    url: String,
    publicId: String,
    type: {
      type: String,
      enum: ['image', 'video'],
    },
    caption: String,
  }],
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
  },
  arconStatus: {
    type: String,
    enum: ['pending', 'under-review', 'approved', 'rejected'],
    default: 'pending',
  },
  arconSubmissionDate: Date,
  arconReviewDate: Date,
  arconReviewNotes: String,
  arconRejectionReason: String,
  arconApprovedBy: String,
  arconDownloadedNIN: {
    type: Boolean,
    default: false,
  },
  arconDownloadedPhotos: {
    type: Boolean,
    default: false,
  },
  publishStatus: {
    type: String,
    enum: ['draft', 'pending-arcon', 'approved', 'rejected', 'published', 'archived'],
    default: 'draft',
  },
  publishDate: Date,
  expiryDate: Date,
  views: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

adSchema.index({ client: 1, arconStatus: 1 });
adSchema.index({ talent: 1 });
adSchema.index({ arconStatus: 1, arconSubmissionDate: -1 });
adSchema.index({ publishStatus: 1, publishDate: -1 });

module.exports = mongoose.model('Ad', adSchema);
