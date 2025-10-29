const express = require('express');
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  getPaymentById,
  getClientPayments,
  getAllPayments,
  requestRefund,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/auth');
const { paymentInitValidation } = require('../middlewares/validation');

router.post('/initialize', protect, authorize('client'), paymentInitValidation, initializePayment);

router.get('/verify/:reference', protect, verifyPayment);

router.get('/client', protect, authorize('client'), getClientPayments);

router.get('/all', protect, authorize('admin', 'superadmin'), getAllPayments);

router.get('/:id', protect, getPaymentById);

router.post('/refund', protect, authorize('admin', 'superadmin'), requestRefund);

module.exports = router;
