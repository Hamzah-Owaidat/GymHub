const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Role = require('../../models/Role');
const PasswordResetOtp = require('../../models/PasswordResetOtp');
const { signToken } = require('../../utils/jwt');
const AppError = require('../../utils/AppError');
const { sendPasswordResetOtpEmail } = require('../../utils/mailer');

async function loadPermissionCodes(roleId) {
  if (!roleId) return [];
  try {
    const rows = await Role.getPermissions(roleId);
    return (rows || []).map((r) => r.code).filter(Boolean);
  } catch {
    return [];
  }
}

function generateSixDigitOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeOtpInput(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

/**
 * Shared auth controller for API.
 * Used by: web (browser) and mobile – same endpoints, same JSON responses.
 */

async function register(req, res, next) {
  try {
    const { first_name, last_name, email, password, dob, phone, phone_country_code } = req.body;

    const roleId = await User.getRoleIdByName('user');
    if (!roleId) return next(new AppError('User role not found', 500, 'SERVER_CONFIG'));

    const exists = await User.existsByEmail(email);
    if (exists) return next(new AppError('Email already registered', 409, 'EMAIL_EXISTS'));

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await User.create({
      first_name,
      last_name,
      email,
      passwordHash,
      role_id: roleId,
      dob: dob || null,
      phone,
      phone_country_code: phone_country_code || '',
    });

    const user = await User.findById(userId);
    if (!user) return next(new AppError('User not found after create', 500, 'INTERNAL_ERROR'));

    res.status(201).json({ success: true, user, message: 'Registration successful. Please log in.' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, loginAs, rememberMe } = req.body;
    const remember = rememberMe === true || rememberMe === 'true';

    const user = await User.findByEmail(email, { includePassword: true });
    if (!user) return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    if (!user.is_active) return next(new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE'));

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));

    if (loginAs && user.role !== loginAs) {
      return next(
        new AppError(
          `This account is not a ${loginAs}. Please use the correct login.`,
          403,
          'FORBIDDEN_ROLE',
        ),
      );
    }

    const permissions = await loadPermissionCodes(user.role_id);

    const { password: _omit, ...userWithoutPassword } = user;
    const token = signToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        is_active: user.is_active,
      },
      { rememberMe: remember },
    );

    res.json({
      success: true,
      user: userWithoutPassword,
      token,
      permissions,
      remember_me: remember,
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404, 'NOT_FOUND'));
    const permissions = await loadPermissionCodes(user.role_id);
    res.json({ success: true, user, permissions });
  } catch (err) {
    next(err);
  }
}

async function requestPasswordResetOtp(req, res, next) {
  try {
    const isDev = (process.env.ENVIRONMENT || '').toLowerCase() !== 'production';
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return next(new AppError('Email is required', 400));

    const user = await User.findByEmail(email, { includePassword: false });
    if (user && user.is_active) {
      const otpCode = generateSixDigitOtp();
      const expiresInMinutes = Number(process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 5);

      await PasswordResetOtp.create({
        user_id: user.id,
        email: user.email,
        otp_code: otpCode,
        expires_in_minutes: expiresInMinutes,
      });
      await sendPasswordResetOtpEmail({ toEmail: user.email, otpCode });
      if (isDev) {
        console.log(`[forgot-password] OTP created for user_id=${user.id}, email=${user.email}`);
      }
    } else if (isDev) {
      console.log(
        `[forgot-password] No OTP created. user_found=${!!user}, active=${user ? !!user.is_active : false}, email=${email}`,
      );
    }

    res.json({
      success: true,
      message: `If this email exists, an OTP has been sent. The OTP expires in ${Number(process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 5)} minutes.`,
      expires_in_minutes: Number(process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 5),
    });
  } catch (err) {
    next(err);
  }
}

async function resetPasswordWithOtp(req, res, next) {
  try {
    const isDev = (process.env.ENVIRONMENT || '').toLowerCase() !== 'production';
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = normalizeOtpInput(req.body?.otp);
    const newPassword = String(req.body?.new_password || '');

    const activeOtp = await PasswordResetOtp.findValidByEmailAndCode(email, otp);
    if (!activeOtp) {
      if (isDev) {
        const latest = await PasswordResetOtp.findLatestActiveByEmail(email);
        const sameCodeAnyState = await PasswordResetOtp.findLatestByEmailAndCode(email, otp);
        console.log(
          `[forgot-password] Reset failed for email=${email}. latest_exists=${!!latest} ` +
          `latest_expires_at=${latest ? latest.expires_at : 'n/a'} latest_code=${latest ? latest.otp_code : 'n/a'} ` +
          `submitted_otp=${otp} same_code_record_exists=${!!sameCodeAnyState}`,
        );
      }
      const sameCode = await PasswordResetOtp.findLatestByEmailAndCode(email, otp);
      if (sameCode) return next(new AppError('OTP is expired. Please request a new one.', 400));
      return next(new AppError('Incorrect OTP code.', 400));
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await User.updatePasswordById(activeOtp.user_id, passwordHash);
    if (!updated) return next(new AppError('Unable to reset password', 500));

    await PasswordResetOtp.consume(activeOtp.id);
    res.json({ success: true, message: 'Password reset successful. You can now sign in.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, requestPasswordResetOtp, resetPasswordWithOtp };
