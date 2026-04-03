const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { get, set } = require('../config/redis');
const { verifyToken } = require('../middleware/auth');
const { calculatePremium } = require('../services/premiumCalculator');

const router = express.Router();

// POST /quote
router.post('/quote', async (req, res, next) => {
  try {
    const { platform, city, riskFactors } = req.body;

    if (!platform || !city) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Platform and city are required'
      });
    }

    const cacheKey = `premium:${platform}:${city}`;
    const cached = await get(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        data: { ...cached, cached: true },
        error: ''
      });
    }

    const quote = calculatePremium(platform, city, riskFactors);
    await set(cacheKey, quote, 21600); // Cache for 6 hours

    res.status(200).json({
      success: true,
      data: quote,
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// POST /enroll
router.post('/enroll', verifyToken, async (req, res, next) => {
  try {
    const { platform, city, riskFactors } = req.body;

    if (!platform || !city) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Platform and city are required'
      });
    }

    // Check if partner has active policy
    const activePolicy = await query(
      'SELECT id FROM policies WHERE partner_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (activePolicy.rows.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Partner already has an active policy'
      });
    }

    const quote = calculatePremium(platform, city, riskFactors);
    const policyId = uuidv4();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const result = await query(
      'INSERT INTO policies (id, partner_id, platform, city, weekly_premium, coverage_amount, status, start_date, end_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW()) RETURNING *',
      [
        policyId,
        req.user.id,
        platform,
        city,
        quote.weekly_premium,
        quote.coverage_amount,
        'active',
        endDate
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        policy_id: result.rows[0].id,
        weekly_premium: result.rows[0].weekly_premium,
        coverage_amount: result.rows[0].coverage_amount,
        status: 'active'
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
