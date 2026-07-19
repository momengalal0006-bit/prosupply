const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../../models/user.model');
const { sendEmail } = require('../../utils/mailer');

const SALT_ROUNDS = 12;

const getProfile = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return user.toSafeObject();
};

const updateProfile = async (userId, { fullName, phone, email }) => {
  const user = await User.findByPk(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  const updates = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) {
    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone && existingPhone.id !== user.id) {
      throw Object.assign(new Error('Phone number is already registered.'), { statusCode: 409, code: 'PHONE_ALREADY_EXISTS' });
    }
    updates.phone = phone;
  }

  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing && existing.id !== user.id) {
      throw Object.assign(new Error('Email is already registered.'), { statusCode: 409, code: 'EMAIL_ALREADY_EXISTS' });
    }
    updates.email = normalizedEmail;
  }

  if (Object.keys(updates).length === 0) {
    return user.toSafeObject();
  }

  await user.update(updates);
  return user.toSafeObject();
};

const requestPasswordChange = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });

  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);

  user.passwordResetToken = hashedOtp;
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); 
  await user.save();

  const { buildEmail } = require('../../utils/emailTemplate');
  await sendEmail(user.email, 'Password Change OTP - ProSupply',
    buildEmail({
      heading: 'Password Change Request',
      greeting: `Hi <strong style="color:#FFFFFF;">${user.fullName}</strong>,`,
      body: `<p style="margin:0 0 24px;">You requested a password change for your ProSupply account. Use the code below to complete the process:</p>
             <div style="text-align:center;margin:0 0 24px;">
               <div style="display:inline-block;background-color:#0B1121;border:2px solid #00E5FF;border-radius:10px;padding:18px 36px;">
                 <span style="font-size:2.5rem;font-weight:700;letter-spacing:0.3em;color:#00E5FF;font-family:'Courier New',monospace;">${otp}</span>
               </div>
             </div>
             <p style="margin:0 0 8px;color:#F59E0B;font-size:14px;font-weight:600;">⚠️ This code expires in 15 minutes.</p>`,
      footerNote: 'If you didn\'t request this, you can safely ignore this email. Your account remains secure.',
    })
  );
};

const confirmPasswordChange = async (userId, { otp, newPassword }) => {
  const user = await User.findByPk(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });

  if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw Object.assign(new Error('OTP has expired. Please request a new one.'), { statusCode: 400, code: 'TOKEN_EXPIRED' });
  }

  const isValid = await bcrypt.compare(otp, user.passwordResetToken);
  if (!isValid) {
    throw Object.assign(new Error('Invalid OTP.'), { statusCode: 400, code: 'INVALID_TOKEN' });
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();
};


const getDeliveryAddress = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return {
    street: user.deliveryStreet || '',
    building: user.deliveryBuilding || '',
    area: user.deliveryArea || '',
    city: user.deliveryCity || '',
    district: user.deliveryDistrict || '',
    notes: user.deliveryNotes || '',
  };
};

const saveDeliveryAddress = async (userId, { street, building, area, city, district, notes }) => {
  const user = await User.findByPk(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });

  if (!street || !street.trim()) {
    throw Object.assign(new Error('Street address is required.'), { statusCode: 400 });
  }
  if (!city || !city.trim()) {
    throw Object.assign(new Error('City is required.'), { statusCode: 400 });
  }

  await user.update({
    deliveryStreet: street.trim(),
    deliveryBuilding: (building || '').trim(),
    deliveryArea: (area || '').trim(),
    deliveryCity: city.trim(),
    deliveryDistrict: (district || '').trim(),
    deliveryNotes: (notes || '').trim(),
  });

  return {
    street: user.deliveryStreet,
    building: user.deliveryBuilding,
    area: user.deliveryArea,
    city: user.deliveryCity,
    district: user.deliveryDistrict,
    notes: user.deliveryNotes,
  };
};

module.exports = { getProfile, updateProfile, requestPasswordChange, confirmPasswordChange, getDeliveryAddress, saveDeliveryAddress };
