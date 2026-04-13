const express = require('express');
const authController = require('../controllers/api/authController');
const authValidator = require('../validators/authValidator');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authValidator.registerRules, authValidator.validate, authController.register);
router.post('/login', authValidator.loginRules, authValidator.validate, authController.login);
router.post(
  '/forgot-password/request-otp',
  authValidator.requestResetOtpRules,
  authValidator.validate,
  authController.requestPasswordResetOtp,
);
router.post(
  '/forgot-password/reset',
  authValidator.resetPasswordWithOtpRules,
  authValidator.validate,
  authController.resetPasswordWithOtp,
);
router.get('/me', requireAuth, authController.me);

module.exports = router;
