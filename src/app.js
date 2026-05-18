const path = require('path');
require('dotenv').config({
  
});

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// Ensure uploads directory exists
fs.mkdirSync(path.resolve(__dirname, '../uploads'), { recursive: true });

// Import models to register associations
require('./models/index');

// Import error handler from auth module
const errorHandler = require('./middleware/errorHandler');

// Import route modules from auth
const authRouter = require('./modules/auth/auth.routes');
const userRouter = require('./modules/user/user.routes');

// Import new route modules
const adRouter = require('./modules/ads/ad.routes');
const orderRouter = require('./modules/orders/order.routes');
const reviewRouter = require('./modules/reviews/review.routes');
const sellerRouter = require('./modules/seller/seller.routes');
const profileRouter = require('./modules/profile/profile.routes');
const cartRouter = require('./modules/cart/cart.routes');
const adminRouter = require('./modules/admin/admin.routes');

const app = express();

// ─── Security ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,   // Disable CSP for development (frontend uses inline scripts/styles & Google Fonts)
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false, // Allow images/uploads to load from different origins
}));
const corsAllowlist = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://localhost:5174',
  'null',
];

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

// ─── Paymob webhook (raw body) ───────────────────────
// IMPORTANT: The webhook route MUST be mounted BEFORE express.json()
// so that the raw body bytes are preserved for HMAC signature verification.
app.post('/api/paymob/webhook',
  express.raw({ type: 'application/json' }),
  require('./modules/payment/paymob.controller').handleWebhook
);

app.get('/api/paymob/callback',
  require('./modules/payment/paymob.controller').handleCallback
);

// ─── Body parsers & cookies ──────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static files ────────────────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ─── Rate limiting ───────────────────────────────────
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

// ─── Health check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ProSupply API is running.', timestamp: new Date().toISOString() });
});

// ─── Routes (mount order matters) ────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/ads', adRouter);
app.use('/api/orders', orderRouter);
app.use('/api/ads', reviewRouter);       // POST /api/ads/:id/rate
app.use('/api/sellers', reviewRouter);   // POST /api/sellers/:id/rate
app.use('/api/seller', sellerRouter);
app.use('/api/seller', orderRouter);     // GET /api/seller/sales
app.use('/api/profile', profileRouter);
app.use('/api/cart', cartRouter);
app.use('/api/admin', adminRouter);

// ─── Serve React build in production ─────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Global error handler ───────────────────────────
app.use(errorHandler);

module.exports = app;
