const express = require('express');
const { simulateDisruption, getActiveDisruptions, resolveDisruption } = require('../services/disruptionService');
const { verifyToken } = require('../middleware/auth');
const { runWeatherAutomation } = require('../services/weatherAutomationService');
const { emitRealtimeEvent } = require('../realtime/socketBus');

const router = express.Router();

router.post('/simulate', verifyToken, async (req, res, next) => {
  try {
    const result = await simulateDisruption(req.body || {});
    emitRealtimeEvent('disruption:new', {
      id: result?.disruption?.id,
      type: result?.disruption?.type || result?.disruption?.disruption_type,
      location: result?.disruption?.location,
      severity: result?.disruption?.severity || result?.disruption?.severity_level,
    });

    res.status(200).json({
      success: true,
      data: result,
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/active', verifyToken, async (req, res, next) => {
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

router.post('/:disruptionId/resolve', verifyToken, async (req, res, next) => {
  try {
    const disruption = await resolveDisruption(req.params.disruptionId);

    if (!disruption) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Disruption not found',
      });
    }

    emitRealtimeEvent('disruption:resolved', {
      id: disruption.id,
      status: disruption.status,
    });

    res.status(200).json({
      success: true,
      data: disruption,
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/weather-scan', verifyToken, async (req, res, next) => {
  try {
    const events = await runWeatherAutomation();
    res.status(200).json({
      success: true,
      data: { events, triggered: events.length },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;