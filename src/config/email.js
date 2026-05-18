const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Verify SMTP connection on startup (non-blocking).
 */
transporter.verify()
  .then(() => console.log('📧 SMTP connection verified.'))
  .catch((err) => console.error('📧 SMTP connection failed:', err.message));

module.exports = transporter;
