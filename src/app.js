const path = require('path');
require('dotenv').config({
  
});

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

fs.mkdirSync(path.resolve(__dirname, '../uploads'), { recursive: true });

require('./models/index');

const errorHandler = require('./middleware/errorHandler');

const authRouter = require('./modules/auth/auth.routes');
const userRouter = require('./modules/user/user.routes');

const adRouter = require('./modules/ads/ad.routes');
const orderRouter = require('./modules/orders/order.routes');
const reviewRouter = require('./modules/reviews/review.routes');
const sellerRouter = require('./modules/seller/seller.routes');
const profileRouter = require('./modules/profile/profile.routes');
const cartRouter = require('./modules/cart/cart.routes');
const adminRouter = require('./modules/admin/admin.routes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));
const corsAllowlist = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://localhost:5174',
  'null',
];

// Add production client URL from env (e.g. https://prosupply.vercel.app)
if (process.env.CLIENT_URL) {
  corsAllowlist.push(process.env.CLIENT_URL);
}

const lanOriginPattern =
  /^https?:\/\/(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|localhost)(?::\d+)?$/;

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsAllowlist.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production' && lanOriginPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.post('/api/paymob/webhook',
  express.raw({ type: 'application/json' }),
  require('./modules/payment/paymob.controller').handleWebhook
);

app.get('/api/paymob/callback',
  require('./modules/payment/paymob.controller').handleCallback
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many checkout attempts. Please try again later.' },
});

const sellerApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many seller applications. Please try again later.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/orders/checkout', checkoutLimiter);
app.use('/api/orders/checkout-cart', checkoutLimiter);
app.use('/api/seller/apply', sellerApplyLimiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ProSupply API is running.', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/ads', adRouter);
app.use('/api/orders', orderRouter);
app.use('/api/ads', reviewRouter);
app.use('/api/sellers', reviewRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/seller', orderRouter);
app.use('/api/profile', profileRouter);
app.use('/api/cart', cartRouter);
app.use('/api/admin', adminRouter);

// Frontend is served by Vercel — no static file serving needed here

app.use(errorHandler);

module.exports = app;
