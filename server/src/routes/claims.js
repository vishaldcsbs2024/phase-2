const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { runFraudChecks } = require('../services/fraudDetector');

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

module.exports = router;
