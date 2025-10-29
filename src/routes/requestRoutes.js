const express = require('express');
const router = express.Router();
const {
  createRequest,
  getClientRequests,
  getTalentRequests,
  respondToRequest,
  getRequestById,
  cancelRequest,
} = require('../controllers/requestController');
const { protect, authorize } = require('../middlewares/auth');
const { requestValidation } = require('../middlewares/validation');

router.post('/', protect, authorize('client'), requestValidation, createRequest);

router.get('/client', protect, authorize('client'), getClientRequests);

router.get('/talent', protect, authorize('talent'), getTalentRequests);

router.post('/:requestId/respond', protect, authorize('talent'), respondToRequest);

router.get('/:id', protect, getRequestById);

router.delete('/:id', protect, authorize('client'), cancelRequest);

module.exports = router;
