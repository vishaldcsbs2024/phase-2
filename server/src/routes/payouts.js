const express = require('express');
const { getPayoutsByUser } = require('../services/paymentService');

const router = express.Router();

router.get('/my-payouts', async (req, res, next) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'userId is required',
      });
    }

    const payouts = await getPayoutsByUser(String(userId));

    res.status(200).json({
      success: true,
      data: { payouts },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'userId is required',
      });
    }

    const payouts = await getPayoutsByUser(String(userId));
    const totalAmount = payouts.reduce((sum, payout) => sum + Number(payout.payout_amount || payout.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        total_amount: totalAmount,
        by_status: {
          pending: payouts.filter((payout) => payout.status === 'pending').length,
          processing: payouts.filter((payout) => payout.status === 'processing').length,
          completed: payouts.filter((payout) => payout.status === 'completed').length,
        },
        recent_payouts: payouts.slice(0, 5),
      },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/total', async (req, res, next) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'userId is required',
      });
    }

    const payouts = await getPayoutsByUser(String(userId));
    const total = payouts.reduce((sum, payout) => sum + Number(payout.payout_amount || payout.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: { total_payouts: total },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;