const path = require('path');
const transporter = require('../config/email');

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
};

module.exports = { sendEmail };
