const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  setPassword,
  forgotPassword,
  resetPassword,
  getMe,
  updatePassword,
  verifyEmail,
  resendVerifyEmail,
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { signupValidation, loginValidation } = require('../middlewares/validation');

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/set-password', setPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);
router.get('/verify-email', verifyEmail); 
router.get('/resend-verify-email', resendVerifyEmail); 

module.exports = router;
