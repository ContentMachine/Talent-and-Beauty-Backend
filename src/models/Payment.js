const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  ad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank-transfer', 'ussd', 'other'],
  },
  paymentGateway: {
    type: String,
    default: 'paystack',
  },
  paystackReference: {
    type: String,
  },
  paystackAccessCode: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'refunded'],
    default: 'pending',
  },
  paidAt: Date,
  metadata: {
    type: Map,
    of: String,
  },
  receiptUrl: String,
  refundReason: String,
  refundedAt: Date,
  refundAmount: Number,
}, {
  timestamps: true,
});

paymentSchema.index({ client: 1, status: 1 });
paymentSchema.index({ paystackReference: 1 }, { unique: true, sparse: true });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
