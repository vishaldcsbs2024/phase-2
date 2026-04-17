const express = require('express');
const { simulateDisruption, getActiveDisruptions, resolveDisruption } = require('../services/disruptionService');

const router = express.Router();

router.post('/simulate', async (req, res, next) => {
  try {
    const result = await simulateDisruption(req.body || {});

    res.status(200).json({
      success: true,
      data: result,
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/active', async (req, res, next) => {
  try {
    const disruptions = await getActiveDisruptions();

    res.status(200).json({
      success: true,
      data: { disruptions },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:disruptionId/resolve', async (req, res, next) => {
  try {
    const disruption = await resolveDisruption(req.params.disruptionId);

    if (!disruption) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Disruption not found',
      });
    }

    res.status(200).json({
      success: true,
      data: disruption,
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;