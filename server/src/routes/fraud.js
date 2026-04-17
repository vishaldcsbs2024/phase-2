const express = require('express');
const { analyzeFraud } = require('../services/fraudDetectionService');

const router = express.Router();

router.post('/analyze', async (req, res, next) => {
  try {
    const result = await analyzeFraud(req.body || {});

    res.status(200).json({
      success: true,
      data: result,
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;