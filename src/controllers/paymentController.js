const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const paystackService = require('../services/paystackService');

const initializePayment = asyncHandler(async (req, res, next) => {
  const { amount, metadata } = req.body;

  if (!amount || amount <= 0) {
    return next(new ErrorResponse('Invalid payment amount', 400));
  }

  const client = await Client.findOne({ user: req.user._id }).populate('user', 'email');
  if (!client) {
    return next(new ErrorResponse('Client profile not found', 404));
  }

  const payment = await Payment.create({
    client: client._id,
    amount,
    currency: 'NGN',
    status: 'pending',
    paymentGateway: 'paystack',
    metadata,
  });

  try {
    const paystackData = await paystackService.initializeTransaction(
      client.user.email,
      amount,
      {
        paymentId: payment._id.toString(),
        clientId: client._id.toString(),
        ...metadata,
      }
    );

    payment.paystackReference = paystackData.reference;
    payment.paystackAccessCode = paystackData.access_code;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        paymentId: payment._id,
        reference: paystackData.reference,
        accessCode: paystackData.access_code,
        authorizationUrl: paystackData.authorization_url,
      },
    });
  } catch (error) {
    payment.status = 'failed';
    await payment.save();
    return next(new ErrorResponse(`Payment initialization failed: ${error.message}`, 500));
  }
});

const verifyPayment = asyncHandler(async (req, res, next) => {
  const { reference } = req.params;

  const payment = await Payment.findOne({ paystackReference: reference });

  if (!payment) {
    return next(new ErrorResponse('Payment not found', 404));
  }

  if (payment.status === 'success') {
    return res.status(200).json({
      success: true,
      message: 'Payment already verified',
      data: payment,
    });
  }

  try {
    const paystackData = await paystackService.verifyTransaction(reference);

    if (paystackData.status === 'success') {
      payment.status = 'success';
      payment.paidAt = new Date();
      payment.paymentMethod = paystackData.channel;

      const client = await Client.findById(payment.client);
      if (client) {
        client.totalSpent += payment.amount;
        await client.save();
      }
    } else {
      payment.status = 'failed';
    }

    await payment.save();

    res.status(200).json({
      success: true,
      message: `Payment ${payment.status}`,
      data: payment,
    });
  } catch (error) {
    return next(new ErrorResponse(`Payment verification failed: ${error.message}`, 500));
  }
});

const getPaymentById = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('client')
    .populate('ad');

  if (!payment) {
    return next(new ErrorResponse('Payment not found', 404));
  }

  const client = await Client.findOne({ user: req.user._id });

  const isAuthorized =
    req.user.role === 'admin' ||
    req.user.role === 'superadmin' ||
    (client && payment.client._id.toString() === client._id.toString());

  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to view this payment', 403));
  }

  res.status(200).json({
    success: true,
    data: payment,
  });
});

const getClientPayments = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const client = await Client.findOne({ user: req.user._id });
  if (!client) {
    return next(new ErrorResponse('Client profile not found', 404));
  }

  const query = { client: client._id };
  if (status) {
    query.status = status;
  }

  const payments = await Payment.find(query)
    .populate('ad', 'title category')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Payment.countDocuments(query);

  const totalSpent = await Payment.aggregate([
    { $match: { client: client._id, status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  res.status(200).json({
    success: true,
    data: payments,
    summary: {
      totalSpent: totalSpent[0]?.total || 0,
    },
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const getAllPayments = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) {
    query.status = status;
  }

  const payments = await Payment.find(query)
    .populate('client')
    .populate({
      path: 'client',
      populate: { path: 'user', select: 'email' }
    })
    .populate('ad', 'title category')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Payment.countDocuments(query);

  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  res.status(200).json({
    success: true,
    data: payments,
    summary: {
      totalRevenue: totalRevenue[0]?.total || 0,
    },
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const requestRefund = asyncHandler(async (req, res, next) => {
  const { paymentId, reason } = req.body;

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    return next(new ErrorResponse('Payment not found', 404));
  }

  if (payment.status !== 'success') {
    return next(new ErrorResponse('Only successful payments can be refunded', 400));
  }

  try {
    await paystackService.createRefund(payment.paystackReference);

    payment.status = 'refunded';
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    payment.refundAmount = payment.amount;
    await payment.save();

    const client = await Client.findById(payment.client);
    if (client) {
      client.totalSpent -= payment.amount;
      await client.save();
    }

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: payment,
    });
  } catch (error) {
    return next(new ErrorResponse(`Refund failed: ${error.message}`, 500));
  }
});

module.exports = {
  initializePayment,
  verifyPayment,
  getPaymentById,
  getClientPayments,
  getAllPayments,
  requestRefund,
};
