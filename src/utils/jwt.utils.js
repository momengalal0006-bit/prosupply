const jwt = require('jsonwebtoken');

// ─── Token generators ────────────────────────────────

/**
 * Sign a short-lived access token.
 * @param {object} payload - e.g. { id, email, role }
 * @returns {string} signed JWT
 */
const generateAccessToken = (payload) => {
  return jwt.sign({ ...payload }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Sign a long-lived refresh token.
 * @param {object} payload - e.g. { id }
 * @returns {string} signed JWT
 */
const generateRefreshToken = (payload) => {
  return jwt.sign({ ...payload }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

// ─── Token verifiers ─────────────────────────────────

/**
 * Verify and decode an access token.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Verify and decode a refresh token.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// ─── Cookie helpers ──────────────────────────────────

/**
 * Helper to compute milliseconds from a human-readable duration string
 * such as "7d", "30d", "1h", "15m".
 * @param {string} duration
 * @returns {number} milliseconds
 */
const durationToMs = (duration) => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] || 86400000);
};

/**
 * Set accessToken and refreshToken as httpOnly, sameSite strict cookies.
 * @param {import('express').Response} res
 * @param {string} accessToken
 * @param {string} refreshToken
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: durationToMs(process.env.JWT_EXPIRES_IN || '7d'),
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: durationToMs(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
    path: '/',
  });
};

/**
 * Clear both token cookies.
 * @param {import('express').Response} res
 */
const clearTokenCookies = (res) => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  res.cookie('refreshToken', '', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies,
};
