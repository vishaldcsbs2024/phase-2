const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { runFraudChecks } = require('../services/fraudDetector');
const { calculatePayout, processPayout } = require('../services/payoutService');
const { get, set } = require('../config/redis');

const router = express.Router();

// GET /trigger-scenario
router.get('/trigger-scenario', async (req, res, next) => {
  try {
    // Step 1: Create fake partner if doesn't exist
    const partnerId = uuidv4();
    let demoPartnerId = partnerId;

    try {
      await query(
        'INSERT INTO partners (id, phone, name, platform, city, kyc_verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [partnerId, '9999999999', 'Demo Partner', 'zomato', 'Mumbai', true]
      );
    } catch (error) {
      // Partner might exist, get existing one
      const existing = await query(
        'SELECT id FROM partners LIMIT 1'
      );
      if (existing.rows.length > 0) {
        demoPartnerId = existing.rows[0].id;
      }
    }

    const steps = [];

    // Step 2: Create fake disruption
    const disruptionId = uuidv4();
    try {
      await query(
        'INSERT INTO disruptions (id, location, type, severity, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [disruptionId, 'Mumbai', 'heavy_rain', 4]
      );
      steps.push({
        step: 1,
        action: 'Create Disruption',
        status: 'success',
        disruption_id: disruptionId
      });
    } catch (error) {
      steps.push({
        step: 1,
        action: 'Create Disruption',
        status: 'error',
        message: error.message
      });
    }

    // Step 3: Create active policy if not exists
    let policyId = null;
    try {
      const policyCheck = await query(
        'SELECT id FROM policies WHERE partner_id = $1 AND status = $2',
        [demoPartnerId, 'active']
      );

      if (policyCheck.rows.length === 0) {
        policyId = uuidv4();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        await query(
          'INSERT INTO policies (id, partner_id, platform, city, weekly_premium, coverage_amount, status, start_date, end_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())',
          [policyId, demoPartnerId, 'zomato', 'Mumbai', 249, 124500, 'active', endDate]
        );
      } else {
        policyId = policyCheck.rows[0].id;
      }

      steps.push({
        step: 2,
        action: 'Verify/Create Policy',
        status: 'success',
        policy_id: policyId
      });
    } catch (error) {
      steps.push({
        step: 2,
        action: 'Verify/Create Policy',
        status: 'error',
        message: error.message
      });
    }

    // Step 4: Create claim
    let claimId = null;
    try {
      claimId = uuidv4();
      const claimData = {
        reason: 'heavy_rain',
        location: 'Mumbai'
      };

      await query(
        'INSERT INTO claims (id, partner_id, policy_id, reason, location, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [claimId, demoPartnerId, policyId, claimData.reason, claimData.location, 'submitted']
      );

      steps.push({
        step: 3,
        action: 'Create Claim',
        status: 'success',
        claim_id: claimId
      });
    } catch (error) {
      steps.push({
        step: 3,
        action: 'Create Claim',
        status: 'error',
        message: error.message
      });
    }

    // Step 5: Run fraud check
    let fraudCheck = null;
    try {
      fraudCheck = await runFraudChecks(demoPartnerId, {
        reason: 'heavy_rain',
        location: 'Mumbai'
      });

      steps.push({
        step: 4,
        action: 'Run Fraud Check',
        status: 'success',
        fraud_score: fraudCheck.fraud_score,
        is_fraudulent: fraudCheck.is_fraudulent,
        checks: fraudCheck.checks
      });
    } catch (error) {
      steps.push({
        step: 4,
        action: 'Run Fraud Check',
        status: 'error',
        message: error.message
      });
    }

    // Step 6: Approve claim and process payout
    let payoutData = null;
    try {
      if (claimId && !fraudCheck.is_fraudulent) {
        await query(
          'UPDATE claims SET status = $1 WHERE id = $2',
          ['approved', claimId]
        );

        const payout = await calculatePayout(demoPartnerId, claimId, {
          reason: 'heavy_rain',
          severity: 4
        });

        if (payout > 0) {
          payoutData = await processPayout(demoPartnerId, claimId, payout);
        }

        steps.push({
          step: 5,
          action: 'Approve and Process Payout',
          status: 'success',
          payout: payoutData
        });
      }
    } catch (error) {
      steps.push({
        step: 5,
        action: 'Approve and Process Payout',
        status: 'error',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        scenario: 'End-to-end Demo Flow',
        partner_id: demoPartnerId,
        steps,
        final_status: 'Demo scenario completed'
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
