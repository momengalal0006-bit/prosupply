const jwt = require('jsonwebtoken');

/**
 * Optional authentication — attaches req.user if a valid token exists,
 * but does NOT reject the request if no token is present.
 * Useful for endpoints that behave differently for logged-in vs anonymous users.
 */
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch {
    // Token invalid/expired — proceed as anonymous
  }
  next();
};

module.exports = { optionalAuth };
