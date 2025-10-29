const express = require('express');
const router = express.Router();
const {
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContactStatus,
  addInternalNote,
  sendResponse,
} = require('../controllers/contactController');
const { protect, authorize } = require('../middlewares/auth');
const { contactValidation } = require('../middlewares/validation');

router.post('/', contactValidation, submitContactForm);

router.get(
  '/',
  protect,
  authorize('admin', 'superadmin'),
  getAllContacts
);

router.get(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  getContactById
);

router.put(
  '/:id/status',
  protect,
  authorize('admin', 'superadmin'),
  updateContactStatus
);

router.post(
  '/:id/notes',
  protect,
  authorize('admin', 'superadmin'),
  addInternalNote
);

router.post(
  '/:id/respond',
  protect,
  authorize('admin', 'superadmin'),
  sendResponse
);

module.exports = router;
