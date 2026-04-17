const express = require('express');
const { getPayoutsByUser } = require('../services/paymentService');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/my-payouts', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

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

router.get('/stats', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

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

router.get('/total', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

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