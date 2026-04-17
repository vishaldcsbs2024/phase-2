const express = require('express');
const { finalizeWebhookPayment } = require('../services/paymentService');

const router = express.Router();

router.post('/payment-success', async (req, res, next) => {
  try {
    const { payoutId, gatewayReference } = req.body || {};

    if (!payoutId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'payoutId is required',
      });
    }

    const payout = await finalizeWebhookPayment({ payoutId, gatewayReference });

    res.status(200).json({
      success: true,
      data: payout,
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;