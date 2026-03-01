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
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone too long'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('loginAs').optional().trim().custom((v) => !v || isValidRole(v)).withMessage(`loginAs must be one of: ${ROLES.join(', ')}`),
];

module.exports = { validate, registerRules, loginRules };
