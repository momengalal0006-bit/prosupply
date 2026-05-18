/**
 * ─────────────────────────────────────────────────────────────
 *  Paymob Payment Routes
 * ─────────────────────────────────────────────────────────────
 *
 *  POST /api/create-payment-intention
 *    → Creates a Paymob payment intention; returns client_secret.
 *    → Body: { amount, currency?, items?, billing_data? }
 *
 *  POST /api/paymob/webhook
 *    → Receives and verifies Paymob's payment callbacks.
 *    → Uses express.raw() so the body stays as a Buffer
 *      for accurate HMAC signature verification.
 *
 *  IMPORTANT:
 *    The webhook route uses express.raw() instead of express.json().
 *    This is critical — parsing the body with JSON first would change
 *    the byte-sequence and break the HMAC calculation.
 * ─────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();

const paymobController = require('./paymob.controller');

// ── Paymob Webhook ───────────────────────────────────────────
// We intentionally use express.raw() here so the body arrives
// as a raw Buffer.  This is required for correct HMAC verification.
// Note: We need to ensure the global express.json() does NOT parse
//       this route's body first — see the mounting order in app.js.
router.post(
  '/paymob/webhook',
  express.raw({ type: 'application/json' }),
  paymobController.handleWebhook
);

// ── Paymob Callback Redirect ─────────────────────────────────
router.get('/paymob/callback', paymobController.handleCallback);

module.exports = router;
