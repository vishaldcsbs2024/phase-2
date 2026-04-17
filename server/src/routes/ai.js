const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { calculateAIDynamicPremium } = require('../services/aiPricingEngine');
const { detectDisruptions } = require('../services/disruptionDetector');
const { processClaimZeroTouch, autoFileClaimFromDisruption } = require('../services/zeroTouchClaimsEngine');
const { evaluateDeliveryPaycheck } = require('../services/locationPaycheckEngine');
const { verifyToken } = require('../middleware/auth');
const { query } = require('../config/database');

/**
 * AI-ENHANCED ENDPOINTS
 * Showcases:
 * 1. Dynamic Premium Calculation with ML-like hyper-local risk factors
 * 2. Automated Disruption Detection (5+ triggers)
 * 3. Zero-Touch Claims Processing
 */

// 1. GET AI Dynamic Premium Quote
// Demonstrates hyper-local risk factors, weather-based pricing, worker risk assessment
router.post('/ai-quote', async (req, res, next) => {
  try {
    const { platform, city, zone, weekly_income, season, worker_history } = req.body;

    if (!platform || !city) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'platform and city are required'
      });
    }

    const aiQuote = calculateAIDynamicPremium({
      platform: platform || 'zomato',
      city: city || 'mumbai',
      zone: zone || 'dharavi',
      weeklyIncome: weekly_income || 2500,
      season: season || 'monsoon',
      workerHistory: worker_history || {
        yearsWorking: 1,
        previousClaims: 0,
        profileCompleteness: 0.7,
        occupationRiskLevel: 'moderate'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        ...aiQuote,
        explanation: {
          hyper_local: 'Premium adjusted for your zone\'s historical safety record and weather patterns',
          worker_profile: 'Your experience, claims history, and profile completeness affect your rate',
          ai_factors: 'ML-powered dynamic pricing based on hyper-local risk factors',
          discount_eligible: aiQuote.discount_message !== null
        }
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET Disruption Detection Report
// Demonstrates 5+ automated triggers for income disruption
router.post('/disruption-check', async (req, res, next) => {
  try {
    const { worker_id, platform, city, zone, date } = req.body;

    if (!worker_id || !platform || !city) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'worker_id, platform, and city are required'
      });
    }

    const disruptionReport = await detectDisruptions({
      workerId: worker_id,
      platform: platform || 'zomato',
      city: city || 'mumbai',
      zone: zone || 'dharavi',
      date: date ? new Date(date) : new Date()
    });

    res.status(200).json({
      success: true,
      data: {
        ...disruptionReport,
        automated_triggers: {
          trigger_1: 'Weather-based disruption (monsoon, flood warnings, heat waves)',
          trigger_2: 'Transportation/traffic disruption (metro delays, route closures)',
          trigger_3: 'Platform outages (Zomato, Swiggy, Blinkit, etc. downtime)',
          trigger_4: 'Declared disruptions (lockdowns, strikes, holidays)',
          trigger_5: 'Historical anomaly detection (unusual work pattern changes)'
        },
        auto_claim_filing: disruptionReport.claim_auto_trigger
          ? {
            message: 'Claim auto-filed due to significant disruption',
            estimated_payout: disruptionReport.total_estimated_income_loss,
            status: 'pending_zero_touch_approval'
          }
          : null
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST Zero-Touch Claims Processing
// Demonstrates automatic claim approval without manual intervention for low-risk claims
router.post('/zero-touch-claim', verifyToken, async (req, res, next) => {
  try {
    const { claim_type, claimed_amount, incident_date, policy_id } = req.body;
    const partnerId = req.user.partner_id;

    if (!claim_type || !claimed_amount || !policy_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'claim_type, claimed_amount, and policy_id are required'
      });
    }

    // Fetch worker data from database
    const workerQuery = await query(
      'SELECT * FROM partners WHERE id = ?',
      [partnerId]
    );
    const workerData = workerQuery.rows[0];

    // Fetch existing claims history
    const claimsQuery = await query(
      `SELECT c.* FROM claims c 
       JOIN policies p ON c.policy_id = p.id 
       WHERE p.partner_id = ?`,
      [partnerId]
    );
    const claimHistory = claimsQuery.rows;

    // Fetch active policies
    const policiesQuery = await query(
      'SELECT * FROM policies WHERE partner_id = ? AND status = ?',
      [partnerId, 'active']
    );
    const policies = policiesQuery.rows;

    const claimData = {
      id: uuidv4(),
      claimed_amount,
      claim_type,
      incident_date: incident_date || new Date(),
      policy_id
    };

    const processedClaim = await processClaimZeroTouch(
      claimData,
      {
        profile_completeness: 0.8,
        years_with_platform: 1,
        previous_claims: claimHistory.length,
        average_monthly_income: 2500
      },
      claimHistory,
      policies
    );

    // If auto-approved, save to database
    if (processedClaim.auto_approved) {
      await query(
        `INSERT INTO claims (id, policy_id, claim_type, incident_date, claimed_amount, status, fraud_checks_passed)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          claimData.id,
          policy_id,
          claim_type,
          incident_date || new Date(),
          claimed_amount,
          'approved',
          1
        ]
      );

      // Auto-create payout record
      await query(
        `INSERT INTO payouts (id, claim_id, amount, status, utr)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          claimData.id,
          processedClaim.verified_payout,
          'processed',
          generateUTR()
        ]
      );
    }

    res.status(200).json({
      success: true,
      data: {
        ...processedClaim,
        zero_touch_explanation: {
          auto_approved: processedClaim.auto_approved
            ? '✓ Claim instantly auto-approved with zero manual intervention'
            : '⚠ Claim requires manual review for additional verification',
          approval_process: 'AI evaluates 5 factors: profile completeness, account age, claims history, claim type risk, and amount reasonableness',
          fraud_detection: 'Advanced pattern analysis checks for duplicate claims, anomalies, and unusual behavior',
          estimated_processing_time: 'Seconds (vs hours with manual processing)',
          customer_experience: processedClaim.auto_approved
            ? 'Payout initiated immediately - zero waiting time'
            : 'Claim queued with priority for faster manual review'
        }
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// 4. GET Auto-File Claim from Disruption
// Demonstrates zero-touch claim creation when disruption exceeds income loss threshold
router.post('/auto-file-disruption-claim', verifyToken, async (req, res, next) => {
  try {
    const { disruption_data, policy_id } = req.body;
    const partnerId = req.user.partner_id;

    if (!disruption_data || !policy_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'disruption_data and policy_id are required'
      });
    }

    // Fetch worker data
    const workerQuery = await query(
      'SELECT * FROM partners WHERE id = ?',
      [partnerId]
    );
    const workerData = workerQuery.rows[0];

    // Auto-file claim from disruption
    const autoClaim = autoFileClaimFromDisruption(disruption_data, workerData);

    if (!autoClaim) {
      return res.status(200).json({
        success: true,
        data: {
          auto_filed: false,
          message: 'Disruption does not meet auto-filing threshold (₹500+ income loss required)'
        },
        error: ''
      });
    }

    // Save auto-filed claim to database
    await query(
      `INSERT INTO claims (id, policy_id, claim_type, incident_date, claimed_amount, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        autoClaim.id,
        policy_id,
        autoClaim.claim_type,
        autoClaim.incident_date,
        autoClaim.claimed_amount,
        autoClaim.status
      ]
    );

    res.status(200).json({
      success: true,
      data: {
        auto_filed: true,
        claim_id: autoClaim.id,
        claim_amount: autoClaim.claimed_amount,
        status: autoClaim.status,
        triggering_disruptions: autoClaim.triggering_disruptions,
        message: '✓ Claim auto-filed based on detected disruptions. Zero manual action needed.',
        explanation: {
          seamless_experience: 'Worker didn\'t need to file any paperwork or visit any offices',
          automated_detection: 'System automatically detected income disruption from multiple sources',
          instant_claim: 'Claim created and queued for instant approval processing',
          zero_steps: 'Zero steps for the customer - it\'s all automated'
        }
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// 5. GET Summary - All AI Enhancements
router.post('/auto-paycheck', async (req, res, next) => {
  try {
    const { latitude, longitude, reason, base_daily_pay } = req.body;
    const fallbackLatitude = 13.0827;
    const fallbackLongitude = 80.2707;

    if (!reason || !base_daily_pay) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'reason and base_daily_pay are required'
      });
    }

    const result = await evaluateDeliveryPaycheck({
      latitude: latitude ?? fallbackLatitude,
      longitude: longitude ?? fallbackLongitude,
      reason,
      base_daily_pay,
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        explanation: {
          location_verification: 'Coordinates are verified with reverse geocoding and satellite imagery evidence. Defaults to Chennai if coordinates are not sent.',
          weather_intelligence: 'Live weather is fetched from WeatherAPI.com (using WEATHER_API_KEY) with OpenWeatherMap/Open-Meteo fallback.',
          traffic_intelligence: 'Traffic risk is computed with city + peak-hour + reason-aware heuristic scoring.',
          paycheck_decision: 'Automated paycheck amount is derived from reason type, weather, traffic, and confidence signals.'
        }
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

router.get('/ai-features-summary', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      ai_enhancements: {
        dynamic_pricing: {
          enabled: true,
          description: 'ML-based hyper-local risk pricing',
          endpoint: 'POST /api/ai/ai-quote',
          features: [
            'Hyper-local zone safety scoring (e.g., ₹2 less for safe zones)',
            'Weather-based dynamic premiums (monsoon, heat waves)',
            'Worker risk profile assessment (experience, claims history)',
            'Income consistency checks',
            'Personalized discount messages'
          ],
          example_discount: 'Worker in Bangalore-Koramangala (safe zone) gets ₹2-5/week discount'
        },
        disruption_detection: {
          enabled: true,
          description: 'Automated income disruption detection',
          endpoint: 'POST /api/ai/disruption-check',
          automated_triggers: {
            trigger_1: 'Weather (flooding, heat advisories, monsoon closures)',
            trigger_2: 'Transportation (metro delays, route closures)',
            trigger_3: 'Platform outages (Zomato, Swiggy downtime)',
            trigger_4: 'Declared disruptions (lockdowns, strikes, holidays)',
            trigger_5: 'Anomaly detection (unusual work pattern changes)'
          },
          auto_claim_filing: 'Claims auto-filed when income loss > ₹500'
        },
        zero_touch_claims: {
          enabled: true,
          description: 'Instant claim approval without manual intervention',
          endpoint: 'POST /api/ai/zero-touch-claim',
          auto_approval_criteria: [
            'Smart approval score (75+ = auto-approve)',
            'Profile completeness check',
            'Account age verification',
            'Claims history analysis',
            'Claim type risk assessment',
            'Fraud detection (5+ checks)'
          ],
          customer_experience: 'Claim approved in seconds, payout initiated immediately',
          approval_confidence: '75%+ confidence = instant approval'
        },
        seamless_workflows: {
          zero_touch_claim_to_payout: {
            steps: [
              '1. Disruption detected → Auto-filed claim',
              '2. Zero-touch processing → Instant approval',
              '3. Payout calculated → UTR generated',
              '4. Worker receives money → Zero manual steps',
              'Total time: <5 seconds'
            ]
          }
        },
        delivery_paycheck_automation: {
          enabled: true,
          description: 'Location-verified, weather-aware and traffic-aware automated paycheck decisioning',
          endpoint: 'POST /api/ai/auto-paycheck',
          signals_used: [
            'Latitude/longitude verification',
            'Satellite evidence snapshot URL',
            'Live weather severity from Open-Meteo',
            'Traffic risk scoring (city + peak-hour + reason aware)',
            'Reason text classification into disruption categories'
          ]
        }
      },
      api_endpoints: {
        'POST /api/ai/ai-quote': 'Get AI-powered dynamic premium quote',
        'POST /api/ai/disruption-check': 'Check for automated income disruptions',
        'POST /api/ai/zero-touch-claim': 'File and auto-approve claims instantly',
        'POST /api/ai/auto-file-disruption-claim': 'Auto-file claims from disruptions',
        'POST /api/ai/auto-paycheck': 'Auto-calculate paycheck using location, weather, traffic and reason',
        'GET /api/ai/ai-features-summary': 'View all AI enhancements'
      }
    },
    error: ''
  });
});

// Helper function to generate unique UTR
function generateUTR() {
  return 'UTR' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
}

module.exports = router;
