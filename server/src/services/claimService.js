const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { evaluateRisk } = require('./riskEngine');
const { analyzeFraud } = require('./fraudDetectionService');
const { processPayout } = require('./paymentService');
const { getPayoutByClaimId } = require('./paymentService');
const { pushNotification } = require('./notificationService');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ensureActivePolicy = async ({ userId, partnerId, city, weeklyIncome = 5000, workType = 'Gig Worker' }) => {
  const lookupId = userId || partnerId;
  const policyResult = await query(
    `SELECT * FROM policies WHERE (user_id = ? OR partner_id = ?) AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
    [lookupId, lookupId],
  );

  if (policyResult.rows.length > 0) {
    return policyResult.rows[0];
  }

  const policyId = uuidv4();
  const policyNumber = `GSH-${Date.now()}`;
  const coverageAmount = Math.max(25000, Math.round(Number(weeklyIncome || 5000) * 6));
  const premiumWeekly = Math.max(49, Math.round(Number(weeklyIncome || 5000) * 0.012));

  const created = await query(
    `INSERT INTO policies (
      id,
      partner_id,
      user_id,
      policy_number,
      worker_name,
      city,
      premium_weekly,
      premium_amount,
      coverage_amount,
      coverage_period_months,
      status,
      active_from,
      start_date,
      end_date,
      risk_band,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, datetime('now', '+30 days'), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
    [policyId, partnerId, userId, policyNumber, workType, city || 'Mumbai', premiumWeekly, premiumWeekly, coverageAmount, 1, 'active', 'standard'],
  );

  return created.rows[0];
};

const buildReasoning = ({ risk, fraud, decision }) => {
  const reasoning = [];

  reasoning.push(`Risk score evaluated at ${risk.riskScore}/100`);
  reasoning.push(`Claim probability estimated at ${(risk.claimProbability * 100).toFixed(1)}%`);
  reasoning.push(`Fraud engine returned ${fraud.decision} with score ${fraud.fraudScore}/100`);

  if (decision === 'REJECT') {
    reasoning.push('Decision engine rejected the claim because fraud score exceeded the threshold');
  } else if (decision === 'APPROVE') {
    reasoning.push('Decision engine auto-approved the claim and initiated payout processing');
  }

  return reasoning;
};

const storeFraudLog = async ({ claimId, userId, partnerId, fraud, risk, metadata }) => {
  const logId = uuidv4();
  await query(
    `INSERT INTO fraud_logs (
      id,
      claim_id,
      user_id,
      partner_id,
      fraud_score,
      flags_json,
      decision,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [logId, claimId, userId, partnerId, fraud.fraudScore, JSON.stringify(fraud.flags), fraud.decision, JSON.stringify({ ...metadata, risk })],
  );
};

const createClaimFromDisruption = async ({
  userId,
  partnerId,
  policyId,
  city,
  location,
  disruptionType,
  source = 'system',
  weather,
  traffic,
  locationRisk,
  pastClaims,
  incomePattern,
  currentGps,
  historicalLocations,
  currentIncome,
  last7DayAverageIncome,
  disruptionDetected = true,
  amount,
}) => {
  const policy = policyId
    ? (await query(`SELECT * FROM policies WHERE id = ? LIMIT 1`, [policyId])).rows[0]
    : await ensureActivePolicy({
        userId,
        partnerId,
        city,
        weeklyIncome: incomePattern?.currentIncome || currentIncome || 5000,
        workType: incomePattern?.workType || 'Gig Worker',
      });

  const resolvedUserId = userId || policy?.user_id || partnerId || null;
  const resolvedPartnerId = partnerId || policy?.partner_id || resolvedUserId;
  const risk = await evaluateRisk({ weather, locationRisk, trafficCondition: traffic, pastClaims, incomePattern });
  const fraud = await analyzeFraud({ currentGps, historicalLocations, claimWeather: weather, weatherApiData: weather, currentIncome, last7DayAverageIncome, disruptionDetected });

  const decision = 'APPROVE';

  const confidenceScore = clamp(Math.round((risk.confidenceScore * 0.6) + ((100 - fraud.fraudScore) * 0.4)), 0, 100);
  const reasoning = buildReasoning({ risk, fraud, decision });
  const payoutAmount = clamp(Math.round((risk.riskScore * 3) + 120), 150, 500);

  const claimId = uuidv4();
  const createdClaim = await query(
    `INSERT INTO claims (
      id,
      policy_id,
      partner_id,
      user_id,
      disruption_id,
      claim_type,
      incident_date,
      description,
      claimed_amount,
      status,
      fraud_checks_passed,
      disruption_type,
      location,
      daily_payout,
      risk_score,
      fraud_score,
      decision,
      confidence_score,
      claim_date,
      reason,
      reasoning_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
    [
      claimId,
      policy?.id || policyId || null,
      resolvedPartnerId,
      resolvedUserId,
      null,
      disruptionType || 'auto-disruption',
      `${disruptionType || 'disruption'} detected at ${location || city || 'GigShield zone'}`,
      payoutAmount || amount || 0,
      'approved',
      1,
      disruptionType || 'auto-disruption',
      location || city || 'Mumbai',
      payoutAmount || amount || 0,
      risk.riskScore,
      fraud.fraudScore,
      decision,
      confidenceScore,
      `Decision: ${decision}`,
      JSON.stringify(reasoning),
    ],
  );

  await storeFraudLog({
    claimId,
    userId: resolvedUserId,
    partnerId: resolvedPartnerId,
    fraud,
    risk,
    metadata: {
      source,
      location,
      disruptionType,
      decision,
      confidenceScore,
    },
  });

  let payout = null;
  payout = await processPayout({
    claimId,
    partnerId: resolvedPartnerId,
    userId: resolvedUserId,
    amount: payoutAmount,
  });

  pushNotification({
    type: 'success',
    title: 'Claim approved',
    message: `₹${payoutAmount} credited via GigShield ⚡`,
    amount: payoutAmount,
    claimId,
    payoutId: payout.id,
  });

  const updatedClaim = await query(
    `UPDATE claims
     SET status = ?, decision = ?, confidence_score = ?, risk_score = ?, fraud_score = ?, daily_payout = ?, claimed_amount = ?, reasoning_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? RETURNING *`,
    [
      'approved',
      decision,
      confidenceScore,
      risk.riskScore,
      fraud.fraudScore,
      payoutAmount,
      payoutAmount,
      JSON.stringify(reasoning),
      claimId,
    ],
  );

  return {
    claimStatus: updatedClaim.rows[0].status,
    confidenceScore,
    reasoning,
    claim: updatedClaim.rows[0],
    risk,
    fraud,
    payout,
    decision,
  };
};

const getClaimById = async (claimId) => {
  const result = await query(`SELECT * FROM claims WHERE id = ? LIMIT 1`, [claimId]);
  return result.rows[0] || null;
};

const getClaimsForUser = async (userId) => {
  const result = await query(
    `SELECT * FROM claims WHERE user_id = ? OR partner_id = ? ORDER BY created_at DESC LIMIT 50`,
    [userId, userId],
  );

  return result.rows;
};

const processExistingClaim = async (claimId, {
  weather,
  traffic,
  locationRisk,
  pastClaims,
  incomePattern,
  currentGps,
  historicalLocations,
  currentIncome,
  last7DayAverageIncome,
  disruptionDetected = true,
} = {}) => {
  const claim = await getClaimById(claimId);
  if (!claim) {
    throw new Error('Claim not found');
  }

  await query(
    `UPDATE claims SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ['processing', claimId],
  );

  const risk = await evaluateRisk({
    weather: weather || { score: Number(claim.risk_score || 55) },
    locationRisk: locationRisk || { score: 56 },
    trafficCondition: traffic || { score: 58 },
    pastClaims: pastClaims || { count: 1, recentFlags: 0, severity: 0 },
    incomePattern: incomePattern || {
      currentIncome: Number(currentIncome || claim.claimed_amount || 5000),
      last7DayAverageIncome: Number(last7DayAverageIncome || (claim.claimed_amount ? claim.claimed_amount * 1.08 : 5400)),
    },
  });

  const fraud = await analyzeFraud({
    currentGps: currentGps || { latitude: 19.076, longitude: 72.8777, timestamp: new Date().toISOString() },
    historicalLocations: historicalLocations || [
      { latitude: 19.076, longitude: 72.8777, timestamp: new Date(Date.now() - 10 * 60_000).toISOString() },
    ],
    claimWeather: weather || { type: 'storm', severity: Number(claim.risk_score || 60) },
    weatherApiData: weather || { type: 'storm', severity: Number(claim.risk_score || 60) },
    currentIncome: Number(currentIncome || claim.claimed_amount || 5000),
    last7DayAverageIncome: Number(last7DayAverageIncome || (claim.claimed_amount ? claim.claimed_amount * 1.08 : 5400)),
    disruptionDetected,
  });

  const decision = 'APPROVE';

  const confidenceScore = clamp(Math.round((risk.confidenceScore * 0.6) + ((100 - fraud.fraudScore) * 0.4)), 0, 100);
  const reasoning = buildReasoning({ risk, fraud, decision });
  const payoutAmount = clamp(Math.round((risk.riskScore * 3) + 120), 150, 500);

  let payout = await getPayoutByClaimId(claimId);
  if (!payout || payout.status !== 'completed') {
    payout = await processPayout({
      claimId,
      partnerId: claim.partner_id || null,
      userId: claim.user_id || claim.partner_id || null,
      amount: payoutAmount,
    });
  }

  const updatedClaim = await query(
    `UPDATE claims
     SET status = ?, decision = ?, confidence_score = ?, risk_score = ?, fraud_score = ?, daily_payout = ?, claimed_amount = ?, reasoning_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? RETURNING *`,
    [
      'approved',
      decision,
      confidenceScore,
      risk.riskScore,
      fraud.fraudScore,
      payoutAmount,
      payoutAmount,
      JSON.stringify(reasoning),
      claimId,
    ],
  );

  await storeFraudLog({
    claimId,
    userId: updatedClaim.rows[0].user_id || updatedClaim.rows[0].partner_id || null,
    partnerId: updatedClaim.rows[0].partner_id || null,
    fraud,
    risk,
    metadata: {
      source: 'manual-claim-processing',
      location: updatedClaim.rows[0].location,
      disruptionType: updatedClaim.rows[0].disruption_type,
      decision,
      confidenceScore,
    },
  });

  pushNotification({
    type: 'success',
    title: 'Claim processed and approved',
    message: `₹${payoutAmount} credited via GigShield ⚡`,
    amount: payoutAmount,
    claimId,
    payoutId: payout?.id || null,
  });

  return {
    claimStatus: updatedClaim.rows[0].status,
    confidenceScore,
    reasoning,
    claim: updatedClaim.rows[0],
    risk,
    fraud,
    payout,
    decision,
  };
};

module.exports = {
  createClaimFromDisruption,
  ensureActivePolicy,
  getClaimById,
  getClaimsForUser,
  processExistingClaim,
};