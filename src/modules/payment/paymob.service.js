

const crypto = require('crypto');


const PAYMOB_SECRET_KEY   = process.env.PAYMOB_SECRET_KEY;
const PAYMOB_PUBLIC_KEY   = process.env.PAYMOB_PUBLIC_KEY;
const PAYMOB_HMAC_KEY     = process.env.PAYMOB_HMAC_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;


async function createPaymentKey({ amount, currency = 'EGP', items = [], billingData = {}, orderGroupId }) {
  if (!PAYMOB_SECRET_KEY || !PAYMOB_INTEGRATION_ID) {
    throw Object.assign(
      new Error('Paymob credentials are not configured. Check your .env file.'),
      { statusCode: 500, code: 'PAYMOB_CONFIG_ERROR' }
    );
  }

  try {
    
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: PAYMOB_SECRET_KEY }),
    });
    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(`Auth failed: ${authData.message || authData.detail}`);
    const token = authData.token;

    
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: 'false',
        amount_cents: amount.toString(),
        currency: currency,
        merchant_order_id: orderGroupId, 
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


function verifyWebhookHmac(rawBody, receivedHmac) {
  if (!PAYMOB_HMAC_KEY) {
    console.error('❌ PAYMOB_HMAC_KEY is not set');
    return false;
  }

  if (!receivedHmac) {
    console.error('❌ Webhook missing HMAC header');
    return false;
  }

  
  const calculatedHmac = crypto
    .createHmac('sha512', PAYMOB_HMAC_KEY)
    .update(rawBody)
    .digest('hex');

  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac, 'hex'),
      Buffer.from(receivedHmac, 'hex')
    );
  } catch {
    
    return false;
  }
}


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


function parseWebhookTransaction(body) {
  const txn = body.obj || body;
  
  
  const orderGroupId = txn.order?.merchant_order_id
                       || txn.payment_key_claims?.billing_data?.extra_description 
                       || txn.order?.payment_key_claims?.billing_data?.extra_description
                       || txn.data?.message; 
                       
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
