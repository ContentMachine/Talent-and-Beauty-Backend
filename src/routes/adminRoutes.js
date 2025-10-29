const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  createAdminUser,
  getSystemLogs,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/dashboard', protect, authorize('admin', 'superadmin'), getDashboardStats);

router.get('/users', protect, authorize('admin', 'superadmin'), getAllUsers);

router.put('/users/status', protect, authorize('superadmin'), updateUserStatus);

router.post('/users/create', protect, authorize('superadmin'), createAdminUser);

router.get('/logs', protect, authorize('admin', 'superadmin'), getSystemLogs);

module.exports = router;
