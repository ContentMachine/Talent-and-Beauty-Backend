const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  talent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Talent',
    required: true,
  },
  projectTitle: {
    type: String,
    required: [true, 'Project title is required'],
  },
  projectDescription: {
    type: String,
    required: [true, 'Project description is required'],
  },
  budget: {
    amount: Number,
    currency: {
      type: String,
      default: 'NGN',
    },
  },
  timeline: {
    startDate: Date,
    endDate: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled', 'completed'],
    default: 'pending',
  },
  talentResponse: {
    decision: {
      type: String,
      enum: ['accepted', 'declined'],
    },
    message: String,
    respondedAt: Date,
  },
  clientNotes: String,
}, {
  timestamps: true,
});

requestSchema.index({ client: 1, status: 1 });
requestSchema.index({ talent: 1, status: 1 });
requestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Request', requestSchema);
