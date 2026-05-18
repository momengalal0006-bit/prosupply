/**
 * ─────────────────────────────────────────────────────────────
 *  Paymob Payment Service
 * ─────────────────────────────────────────────────────────────
 *
 *  Encapsulates all server-side interactions with the Paymob
 *  Accept API.  No secret keys ever leave this module.
 *
 *  Flow overview:
 *    1. Frontend calls POST /api/create-payment-intention
 *    2. This service POSTs to Paymob's /v1/intention/ endpoint
 *    3. Paymob returns a `client_secret`
 *    4. The controller sends *only* the client_secret back to
 *       the frontend, which uses it + the PUBLIC key to render
 *       the embedded Pixel checkout.
 *    5. After the customer pays, Paymob sends a webhook to
 *       POST /api/paymob/webhook
 *    6. This service verifies the HMAC signature and returns
 *       the parsed transaction data.
 * ─────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');

// ── Paymob credentials (loaded once from .env) ───────────────
const PAYMOB_SECRET_KEY   = process.env.PAYMOB_SECRET_KEY;
const PAYMOB_PUBLIC_KEY   = process.env.PAYMOB_PUBLIC_KEY;
const PAYMOB_HMAC_KEY     = process.env.PAYMOB_HMAC_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;

/* ────────────────────────────────────────────────────────────
 * 1.  Create Payment Key (Classic API)
 * ────────────────────────────────────────────────────────────
 *  Executes the 3-step Paymob Classic flow:
 *  Step 1: Get Auth Token
 *  Step 2: Register Order
 *  Step 3: Request Payment Key
 *
 *  @param {Object}  params
 *  @param {number}  params.amount       – Amount in **cents** (e.g. 5000 = 50.00 EGP)
 *  @param {string}  params.currency     – ISO currency code (default "EGP")
 *  @param {Array}   params.items        – Array of item objects
 *  @param {Object}  params.billingData  – Customer billing information
 *
 *  @param {string}  params.orderGroupId – Internal ProSupply order group ID
 *
 *  @returns {string} payment_key – one-time token for the iframe
 */
async function createPaymentKey({ amount, currency = 'EGP', items = [], billingData = {}, orderGroupId }) {
  if (!PAYMOB_SECRET_KEY || !PAYMOB_INTEGRATION_ID) {
    throw Object.assign(
      new Error('Paymob credentials are not configured. Check your .env file.'),
      { statusCode: 500, code: 'PAYMOB_CONFIG_ERROR' }
    );
  }

  try {
    // ── Step 1: Authentication ─────────────────────────────
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: PAYMOB_SECRET_KEY }),
    });
    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(`Auth failed: ${authData.message || authData.detail}`);
    const token = authData.token;

    // ── Step 2: Order Registration ─────────────────────────
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: 'false',
        amount_cents: amount.toString(),
        currency: currency,
        merchant_order_id: orderGroupId, // We use our order group ID as the merchant_order_id
        items: items.map((item) => ({
          name:        item.name        || 'Product',
          amount_cents: (item.amount || amount).toString(),
          description: item.description || '',
          quantity:    item.quantity    || 1,
        })),
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) throw new Error(`Order registration failed: ${orderData.message || orderData.detail}`);
    const paymobOrderId = orderData.id;

    // ── Step 3: Payment Key Request ────────────────────────
    const paymentKeyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amount.toString(),
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: {
          first_name:    billingData.first_name    || 'N/A',
          last_name:     billingData.last_name     || 'N/A',
          email:         billingData.email         || 'N/A',
          phone_number:  billingData.phone_number  || 'N/A',
          street:        billingData.street        || 'N/A',
          city:          billingData.city          || 'N/A',
          country:       billingData.country       || 'EG',
          state:         billingData.state         || 'N/A',
          apartment:     billingData.apartment     || 'N/A',
          floor:         billingData.floor         || 'N/A',
          building:      billingData.building      || 'N/A',
          // extra_description holds our group ID just in case, though merchant_order_id is also set
          extra_description: orderGroupId          || 'N/A',
        },
        currency: currency,
        integration_id: parseInt(PAYMOB_INTEGRATION_ID, 10),
      }),
    });
    const paymentKeyData = await paymentKeyRes.json();
    if (!paymentKeyRes.ok) throw new Error(`Payment key request failed: ${paymentKeyData.message || paymentKeyData.detail}`);

    console.log('✅ Paymob classic payment key created for order:', paymobOrderId);
    return paymentKeyData.token;

  } catch (error) {
    console.error('❌ Paymob Classic API error:', error.message);
    throw Object.assign(
      new Error('Failed to generate Paymob payment token'),
      { statusCode: 502, code: 'PAYMOB_CLASSIC_ERROR', originalError: error.message }
    );
  }
}

/* ────────────────────────────────────────────────────────────
 * 2.  Verify Webhook HMAC Signature
 * ────────────────────────────────────────────────────────────
 *  Paymob signs every webhook callback with an HMAC-SHA512
 *  digest placed in the `hmac` request header.
 *
 *  We recalculate the signature over the raw body bytes and
 *  use constant-time comparison to prevent timing attacks.
 *
 *  @param {Buffer} rawBody          – The raw, unparsed request body
 *  @param {string} receivedHmac     – Value from req.headers['hmac']
 *  @returns {boolean}               – true if signature is valid
 */
function verifyWebhookHmac(rawBody, receivedHmac) {
  if (!PAYMOB_HMAC_KEY) {
    console.error('❌ PAYMOB_HMAC_KEY is not set');
    return false;
  }

  if (!receivedHmac) {
    console.error('❌ Webhook missing HMAC header');
    return false;
  }

  // Calculate the expected signature using SHA-512
  const calculatedHmac = crypto
    .createHmac('sha512', PAYMOB_HMAC_KEY)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac, 'hex'),
      Buffer.from(receivedHmac, 'hex')
    );
  } catch {
    // Length mismatch → signature is definitely wrong
    return false;
  }
}

/**
 * 2.5 Verify Paymob HMAC Signature (GET Callback)
 *
 * Paymob calculates the HMAC for GET requests by sorting specific keys
 * alphabetically and concatenating their values without any delimiters.
 * 
 * @param {Object} query - req.query from Express
 * @returns {boolean}
 */
function verifyCallbackHmac(query) {
  if (!PAYMOB_HMAC_KEY || !query.hmac) return false;

  const hmacKeys = [
    'amount_cents', 'created_at', 'currency', 'error_occured',
    'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
    'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
    'is_voided', 'order', 'owner', 'pending', 'source_data.pan',
    'source_data.sub_type', 'source_data.type', 'success'
  ];

  let hmacString = '';
  hmacKeys.forEach(key => {
    // Express parses 'source_data.pan' into query['source_data.pan']
    if (query[key] !== undefined && query[key] !== null) {
      hmacString += query[key];
    }
  });

  const calculatedHmac = crypto
    .createHmac('sha512', PAYMOB_HMAC_KEY)
    .update(hmacString)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac.toLowerCase(), 'utf8'),
      Buffer.from(query.hmac.toLowerCase(), 'utf8')
    );
  } catch {
    return false;
  }
}

/* ────────────────────────────────────────────────────────────
 * 3.  Parse Transaction Status from Webhook Body
 * ────────────────────────────────────────────────────────────
 *  After HMAC verification, this helper extracts the key fields
 *  from the Paymob callback so the controller can act on them.
 *
 *  @param {Object} body – Parsed JSON body of the webhook
 *  @returns {Object}    – { id, orderId, status, amount, currency, ... }
 */
function parseWebhookTransaction(body) {
  const txn = body.obj || body;
  
  // orderGroupId was passed in merchant_order_id during order registration
  const orderGroupId = txn.order?.merchant_order_id
                       || txn.payment_key_claims?.billing_data?.extra_description 
                       || txn.order?.payment_key_claims?.billing_data?.extra_description
                       || txn.data?.message; // fallback just in case
                       
  return {
    transactionId: txn.id,
    orderId:       txn.order?.id || txn.order,
    orderGroupId:  orderGroupId,
    status:        txn.success === true  ? 'success'
                 : txn.pending === true  ? 'pending'
                 :                         'failed',
    success:       txn.success,
    pending:       txn.pending,
    amountCents:   txn.amount_cents,
    currency:      txn.currency,
    createdAt:     txn.created_at,
    raw:           txn,
  };
}

module.exports = {
  createPaymentKey,
  verifyWebhookHmac,
  verifyCallbackHmac,
  parseWebhookTransaction,
};
