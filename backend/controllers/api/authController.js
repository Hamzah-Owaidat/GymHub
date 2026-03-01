const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const { signToken } = require('../../utils/jwt');
const AppError = require('../../utils/AppError');

/**
 * Shared auth controller for API.
 * Used by: web (browser) and mobile – same endpoints, same JSON responses.
 */

async function register(req, res, next) {
  try {
    const { first_name, last_name, email, password, dob, phone } = req.body;

    const roleId = await User.getRoleIdByName('user');
    if (!roleId) return next(new AppError('User role not found', 500));

    const exists = await User.existsByEmail(email);
    if (exists) return next(new AppError('Email already registered', 409));

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await User.create({
      first_name,
      last_name,
      email,
      passwordHash,
      role_id: roleId,
      dob: dob || null,
      phone: phone || null,
    });

    const user = await User.findById(userId);
    if (!user) return next(new AppError('User not found after create', 500));

    res.status(201).json({ success: true, user, message: 'Registration successful. Please log in.' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, loginAs } = req.body;

    const user = await User.findByEmail(email, { includePassword: true });
    if (!user) return next(new AppError('Invalid email or password', 401));
    if (!user.is_active) return next(new AppError('Account is deactivated', 403));

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return next(new AppError('Invalid email or password', 401));

    if (loginAs && user.role !== loginAs) {
      return next(new AppError(`This account is not a ${loginAs}. Please use the correct login.`, 403));
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
      is_active: user.is_active,
    });

    res.json({ success: true, user: userWithoutPassword, token });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
