const { body, validationResult } = require('express-validator');
const { ROLES, isValidRole } = require('../constants/roles');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(messages, 400));
  }
  next();
}

const registerRules = [
  body('first_name').trim().notEmpty().withMessage('First name is required').isLength({ max: 60 }).withMessage('First name too long'),
  body('last_name').trim().notEmpty().withMessage('Last name is required').isLength({ max: 60 }).withMessage('Last name too long'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail().isLength({ max: 120 }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('dob').optional().isISO8601().withMessage('Invalid date format for dob'),
  body('phone_country_code')
    .trim()
    .notEmpty()
    .withMessage('Country code is required')
    .isLength({ max: 10 })
    .withMessage('Country code too long'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .isLength({ max: 30 })
    .withMessage('Phone too long'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('loginAs').optional().trim().custom((v) => !v || isValidRole(v)).withMessage(`loginAs must be one of: ${ROLES.join(', ')}`),
];

const requestResetOtpRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .customSanitizer((v) => String(v).trim().toLowerCase()),
];

const resetPasswordWithOtpRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .customSanitizer((v) => String(v).trim().toLowerCase()),
  body('otp')
    .customSanitizer((v) => String(v || '').replace(/\D/g, '').slice(0, 6))
    .matches(/^\d{6}$/)
    .withMessage('OTP must be exactly 6 digits'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  requestResetOtpRules,
  resetPasswordWithOtpRules,
};
