const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  createAdminUser,
  getSystemLogs,
  getSingleUser,

} = require('../controllers/adminController');
const { createAdminValidation } = require('../middlewares/validation');
const { protect, authorize } = require('../middlewares/auth');

router.get('/dashboard', protect, authorize('admin', 'superadmin'),  getDashboardStats);

router.get('/users', protect, authorize('admin', 'superadmin'), getAllUsers);

router.put('/users/status', protect, authorize('superadmin'), updateUserStatus);

router.post('/users/create', protect, authorize('superadmin'), createAdminValidation, createAdminUser);

router.get('/logs', protect, authorize('admin', 'superadmin'), getSystemLogs);

router.get('/users/:userId', protect, authorize('admin', 'superadmin'), getSingleUser);

module.exports = router;
