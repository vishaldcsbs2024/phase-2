const express = require('express');
const { evaluateRisk } = require('../services/riskEngine');

const router = express.Router();

router.post('/evaluate', async (req, res, next) => {
  try {
    const result = await evaluateRisk(req.body || {});

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