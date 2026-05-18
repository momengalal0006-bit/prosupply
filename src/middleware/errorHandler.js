/**
 * Global Express error handler.
 * Must have exactly 4 parameters so Express recognises it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error.';
  let errors = null;

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'A record with that value already exists.';
    errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
  }

  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation failed.';
    errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
  }

  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token.'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token has expired.'; }

  if (process.env.NODE_ENV === 'development') console.error('Error:', err);

  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
