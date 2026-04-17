const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { runFraudChecks } = require('../services/fraudDetector');
const { createClaimFromDisruption, getClaimById, processExistingClaim } = require('../services/claimService');

const router = express.Router();

// GET /my-claims
router.get('/my-claims', verifyToken, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM claims WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      data: {
        claims: result.rows,
        total: result.rows.length
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// GET /history
router.get('/history', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT * FROM claims WHERE user_id = ? OR partner_id = ? ORDER BY created_at DESC LIMIT 50',
      [String(userId), String(userId)],
    );

    res.status(200).json({
      success: true,
      data: {
        claims: result.rows,
        total: result.rows.length,
      },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

// POST /manual
router.post('/manual', verifyToken, async (req, res, next) => {
  try {
    const { reason, location, lost_hours, daily_income } = req.body;

    if (!reason || !location) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Reason and location are required'
      });
    }

    // Check active policy
    const policyResult = await query(
      'SELECT id FROM policies WHERE partner_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (policyResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'No active policy found'
      });
    }

    const claimId = uuidv4();
    const disruptionData = { reason, location, severity: 3 };

    // Run fraud checks
    const fraudResult = await runFraudChecks(req.user.id, {
      reason,
      location
    });

    if (fraudResult.is_fraudulent) {
      return res.status(400).json({
        success: false,
        data: {
          fraud_score: fraudResult.fraud_score,
          checks: fraudResult.checks
        },
        error: 'Claim flagged as fraudulent'
      });
    }

    const result = await query(
      'INSERT INTO claims (id, partner_id, policy_id, reason, location, lost_hours, daily_income, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *',
      [claimId, req.user.id, policyResult.rows[0].id, reason, location, lost_hours || 0, daily_income || 0, 'submitted']
    );

    res.status(201).json({
      success: true,
      data: {
        claim_id: result.rows[0].id,
        status: 'submitted',
        fraud_check: {
          fraud_score: fraudResult.fraud_score,
          is_fraudulent: false
        }
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// POST /auto-trigger
router.post('/auto-trigger', async (req, res, next) => {
  try {
    const result = await createClaimFromDisruption({
      userId: req.body.userId || req.user?.id || null,
      partnerId: req.body.partnerId || req.user?.id || null,
      policyId: req.body.policyId || null,
      city: req.body.city || 'Mumbai',
      location: req.body.location || req.body.city || 'Mumbai',
      disruptionType: req.body.disruptionType || 'rainstorm',
      source: req.body.source || 'manual-trigger',
      weather: req.body.weather,
      traffic: req.body.traffic,
      locationRisk: req.body.locationRisk,
      pastClaims: req.body.pastClaims,
      incomePattern: req.body.incomePattern,
      currentGps: req.body.currentGps,
      historicalLocations: req.body.historicalLocations,
      currentIncome: req.body.currentIncome,
      last7DayAverageIncome: req.body.last7DayAverageIncome,
      disruptionDetected: true,
      amount: req.body.amount,
    });

    res.status(201).json({
      success: true,
      data: result,
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

// GET /timeline/:claimId
router.get('/timeline/:claimId', verifyToken, async (req, res, next) => {
  try {
    const claim = await getClaimById(req.params.claimId);

    if (!claim) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Claim not found',
      });
    }

    const reasoning = claim.reasoning_json ? JSON.parse(claim.reasoning_json) : [];
    res.status(200).json({
      success: true,
      data: {
        claim,
        reasoning,
      },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

// POST /:claimId/process
router.post('/:claimId/process', verifyToken, async (req, res, next) => {
  try {
    const result = await processExistingClaim(req.params.claimId, req.body || {});
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
