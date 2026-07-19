

const express = require('express');
const router = express.Router();

const paymobController = require('./paymob.controller');






router.post(
  '/paymob/webhook',
  express.raw({ type: 'application/json' }),
  paymobController.handleWebhook
);


router.get('/paymob/callback', paymobController.handleCallback);

module.exports = router;
