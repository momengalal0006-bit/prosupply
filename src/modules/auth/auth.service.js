const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../../models/user.model');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwt.utils');
const { sendPasswordResetEmail } = require('../../utils/email.utils');

const SALT_ROUNDS = 12;

/**
 * Register a new user.
 */
const register = async ({ fullName, email, phone, password }) => {
  // Check uniqueness
  const existingEmail = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existingEmail) {
    const err = new Error('Email is already registered.');
    err.statusCode = 409;
    throw err;
  }

  const existingPhone = await User.findOne({ where: { phone } });
  if (existingPhone) {
    const err = new Error('Phone number is already registered.');
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    fullName,
    email,
    phone,
    password: hashedPassword,
    role: 'user',
    isActive: true,
  });

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};

/**
 * Login an existing user.
 */
const login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account has been deactivated. Contact support.');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  user.lastLoginAt = new Date();

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};

/**
 * Logout — clear refresh token in DB.
 */
const logout = async (userId) => {
  await User.update({ refreshToken: null }, { where: { id: userId } });
};

/**
 * Refresh the access token using a valid refresh token.
 */
const refreshAccessToken = async (userId, storedToken) => {
  const user = await User.findByPk(userId);
  if (!user || user.refreshToken !== storedToken) {
    const err = new Error('Invalid refresh token.');
    err.statusCode = 401;
    throw err;
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  return { accessToken };
};

/**
 * Forgot password — generate OTP, hash it, email it.
 */
const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) return; // silent — prevent enumeration

  // Generate 6-digit numeric OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);
  const expiresMinutes = parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES, 10) || 15;

  user.passwordResetToken = hashedOtp;
  user.passwordResetExpires = new Date(Date.now() + expiresMinutes * 60 * 1000);
  await user.save();

  await sendPasswordResetEmail(user.email, user.fullName, otp);
};

/**
 * Reset password using email + OTP + new password.
 */
const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    const err = new Error('Reset code has expired. Please request a new one.');
    err.statusCode = 400;
    throw err;
  }

  const isValid = await bcrypt.compare(otp, user.passwordResetToken);
  if (!isValid) {
    const err = new Error('Invalid reset code.');
    err.statusCode = 400;
    throw err;
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();
};

module.exports = { register, login, logout, refreshAccessToken, forgotPassword, resetPassword };
