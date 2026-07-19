const authService = require('./auth.service');
const { setTokenCookies, clearTokenCookies, verifyRefreshToken } = require('../../utils/jwt.utils');

const registerCtrl = async (req, res, next) => {
  try {
    const { fullName, email, phone, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.register({ fullName, email, phone, password });
    setTokenCookies(res, accessToken, refreshToken);
    return res.status(201).json({ success: true, message: 'Account created successfully.', user: user.toSafeObject() });
  } catch (err) { next(err); }
};

const loginCtrl = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login({ email, password });
    setTokenCookies(res, accessToken, refreshToken);
    return res.status(200).json({ success: true, message: 'Login successful.', user: user.toSafeObject() });
  } catch (err) { next(err); }
};

const logoutCtrl = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    clearTokenCookies(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) { next(err); }
};

const refreshTokenCtrl = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }
    const decoded = verifyRefreshToken(token);
    const { accessToken } = await authService.refreshAccessToken(decoded.id, token);
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true, secure: isProduction, sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, path: '/',
    });
    return res.status(200).json({ success: true, message: 'Token refreshed.' });
  } catch (err) { next(err); }
};

const forgotPasswordCtrl = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    return res.status(200).json({ success: true, message: 'If that email exists, a reset code was sent.' });
  } catch (err) { next(err); }
};

const resetPasswordCtrl = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    await authService.resetPassword({ email, otp, newPassword });
    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { next(err); }
};

module.exports = { registerCtrl, loginCtrl, logoutCtrl, refreshTokenCtrl, forgotPasswordCtrl, resetPasswordCtrl };
