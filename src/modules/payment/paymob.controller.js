

const paymobService = require('./paymob.service');
const { Order, User, Ad } = require('../../models/index');
const { sendEmail } = require('../../utils/mailer');
const { buildEmail } = require('../../utils/emailTemplate');


async function handleWebhook(req, res) {
  try {
    
    const receivedHmac = req.headers['hmac'] || req.query.hmac;

    
    const isValid = paymobService.verifyWebhookHmac(req.body, receivedHmac);

    if (!isValid) {
      console.warn('⚠️  Paymob webhook – INVALID HMAC signature');
      
      
      return res.status(200).json({ received: true });
    }

    
    const parsed = JSON.parse(req.body.toString());

    
    const txn = paymobService.parseWebhookTransaction(parsed);

    
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

    
    return res.status(200).json({ received: true, status: txn.status });
  } catch (error) {
    console.error('❌ Paymob webhook processing error:', error.message);
    
    return res.status(200).json({ received: true, error: 'Processing error' });
  }
}


async function handleCallback(req, res) {
  try {
    const query = req.query;
    
    
    if (query.success === undefined) {
      return res.redirect(`${process.env.CLIENT_URL}/orders`);
    }

    
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
