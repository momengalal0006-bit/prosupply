const processPayment = async ({ amount, paymentMethod }) => {
  if (process.env.PAYMOB_SIMULATE_FAILURE === 'true') {
    throw Object.assign(new Error('Payment failed.'), { statusCode: 400, code: 'PAYMENT_FAILED' });
  }
  return { success: true, transactionId: `mock_${Date.now()}`, amount, paymentMethod };
};

module.exports = { processPayment };
