/**
 * ─────────────────────────────────────────────────────────────
 *  Paymob Payment Controller
 * ─────────────────────────────────────────────────────────────
 *
 *  Handles HTTP requests/responses for the Paymob payment flow:
 *
 *  POST /api/create-payment-intention
 *    → Accepts { amount, currency, items, billing_data }
 *    → Returns { success, client_secret }
 *
 *  POST /api/paymob/webhook
 *    → Receives Paymob callback with HMAC header
 *    → Verifies signature, logs status, returns 200
 * ─────────────────────────────────────────────────────────────
 */

const paymobService = require('./paymob.service');
const { Order, User, Ad } = require('../../models/index');
const { sendEmail } = require('../../utils/mailer');
const { buildEmail } = require('../../utils/emailTemplate');

/**
 * POST /api/paymob/webhook
 *
 * This endpoint receives asynchronous payment status updates from Paymob.
 *
 * IMPORTANT:
 *   • The route MUST use express.raw() so we receive the raw Buffer
 *     (needed for accurate HMAC recalculation).
 *   • We always respond with 200 to acknowledge receipt — Paymob
 *     will retry on non-2xx responses.
 */
async function handleWebhook(req, res) {
  try {
    // ── 1. Extract the HMAC header ───────────────────────────
    const receivedHmac = req.headers['hmac'] || req.query.hmac;

    // ── 2. Verify the signature ──────────────────────────────
    const isValid = paymobService.verifyWebhookHmac(req.body, receivedHmac);

    if (!isValid) {
      console.warn('⚠️  Paymob webhook – INVALID HMAC signature');
      // Still return 200 to prevent Paymob from retrying
      // (an attacker shouldn't know whether verification failed)
      return res.status(200).json({ received: true });
    }

    // ── 3. Parse the raw body into JSON ──────────────────────
    const parsed = JSON.parse(req.body.toString());

    // ── 4. Extract meaningful transaction data ───────────────
    const txn = paymobService.parseWebhookTransaction(parsed);

    // ── 5. Handle based on status ────────────────────────────
    if (!txn.orderGroupId) {
      console.warn('⚠️ Webhook received but no orderGroupId found in extra_description.');
      return res.status(200).json({ received: true, status: txn.status, note: 'No orderGroupId' });
    }

    switch (txn.status) {
      case 'success':
        console.log(`✅ Payment SUCCESS — Transaction #${txn.transactionId}, Amount: ${txn.amountCents} ${txn.currency}, Group: ${txn.orderGroupId}`);
        
        const orderService = require('../orders/order.service');
        await orderService.processSuccessfulPayment(txn.orderGroupId);
        break;

      case 'pending':
        console.log(`⏳ Payment PENDING — Transaction #${txn.transactionId}, Group: ${txn.orderGroupId}`);
        // Orders are already 'pending' by default, no action needed.
        break;

      case 'failed':
        console.log(`❌ Payment FAILED — Transaction #${txn.transactionId}, Group: ${txn.orderGroupId}`);
        await Order.update(
          { paymentStatus: 'failed' }, 
          { where: { orderGroupId: txn.orderGroupId } }
        );
        break;

      default:
        console.log(`❓ Unknown payment status for Transaction #${txn.transactionId}:`, txn.status);
    }

    // ── 6. Always acknowledge receipt ────────────────────────
    return res.status(200).json({ received: true, status: txn.status });
  } catch (error) {
    console.error('❌ Paymob webhook processing error:', error.message);
    // Always return 200 so Paymob does not keep retrying
    return res.status(200).json({ received: true, error: 'Processing error' });
  }
}

/**
 * GET /api/paymob/callback
 * 
 * Handles user redirect from Paymob after transaction attempt.
 */
async function handleCallback(req, res) {
  try {
    const query = req.query;
    
    // We expect at least success and order id
    if (query.success === undefined) {
      return res.redirect(`${process.env.CLIENT_URL}/orders`);
    }

    // Verify HMAC using the dedicated callback verifier
    const isValid = paymobService.verifyCallbackHmac(query);
    if (!isValid) {
      console.warn('⚠️ Paymob callback – INVALID HMAC signature');
      return res.redirect(`${process.env.CLIENT_URL}/orders?payment=failed&error=invalid_signature`);
    }

    const merchantOrderId = query.merchant_order_id || query.order;
    const isSuccess = query.success === 'true';

    if (isSuccess) {
      const orderService = require('../orders/order.service');
      await orderService.processSuccessfulPayment(merchantOrderId);
      return res.redirect(`${process.env.CLIENT_URL}/orders?payment=success&order_id=${merchantOrderId}`);
    } else {
      // For failed payments, order status is already pending. We could update to failed if we want,
      // but user wants order status to be updated to failed.
      await Order.update({ paymentStatus: 'failed' }, { where: { orderGroupId: merchantOrderId } });
      return res.redirect(`${process.env.CLIENT_URL}/orders?payment=failed&order_id=${merchantOrderId}`);
    }
  } catch (err) {
    console.error('Callback handling error:', err);
    res.redirect(`${process.env.CLIENT_URL}/orders?payment=failed&error=server_error`);
  }
}

module.exports = {
  handleWebhook,
  handleCallback,
};
