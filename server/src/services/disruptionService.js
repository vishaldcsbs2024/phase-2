const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { evaluateRisk } = require('./riskEngine');
const { createClaimFromDisruption, getClaimsForUser } = require('./claimService');
const { pushNotification } = require('./notificationService');

const scenarioPresets = {
  rainstorm: {
    disruptionType: 'rainstorm',
    weather: { type: 'storm', severity: 92, score: 92 },
    traffic: { type: 'delay', score: 78 },
    locationRisk: { score: 68 },
  },
  traffic: {
    disruptionType: 'traffic_delay',
    weather: { type: 'clear', severity: 25, score: 25 },
    traffic: { type: 'jam', score: 88 },
    locationRisk: { score: 58 },
  },
  outage: {
    disruptionType: 'platform_outage',
    weather: { type: 'clear', severity: 20, score: 20 },
    traffic: { type: 'normal', score: 34 },
    locationRisk: { score: 52 },
  },
  fraud: {
    disruptionType: 'fraud_attempt',
    weather: { type: 'clear', severity: 18, score: 18 },
    traffic: { type: 'normal', score: 20 },
    locationRisk: { score: 42 },
  },
};

const simulateDisruption = async ({
  userId,
  partnerId,
  policyId,
  city = 'Mumbai',
  location = 'Mumbai',
  scenario = 'rainstorm',
  currentIncome = 5000,
  last7DayAverageIncome = 5200,
  historicalLocations = [],
  currentGps = null,
  pastClaims = { count: 0, recentFlags: 0, severity: 0 },
}) => {
  const preset = scenarioPresets[scenario] || scenarioPresets.rainstorm;
  const risk = await evaluateRisk({
    weather: preset.weather,
    locationRisk: preset.locationRisk,
    trafficCondition: preset.traffic,
    pastClaims,
    incomePattern: { currentIncome, last7DayAverageIncome },
  });

  const disruptionId = uuidv4();
  const createdDisruption = await query(
    `INSERT INTO disruptions (
      id,
      policy_id,
      partner_id,
      user_id,
      disruption_type,
      type,
      location,
      source,
      severity_level,
      severity,
      risk_score,
      status,
      detected_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
    [
      disruptionId,
      policyId || null,
      partnerId || null,
      userId || null,
      preset.disruptionType,
      preset.disruptionType,
      location,
      'GigShield Simulator',
      Math.max(1, Math.round(risk.riskScore / 20)),
      Math.max(1, Math.round(risk.riskScore / 20)),
      risk.riskScore,
      'active',
    ],
  );

  let claimResult = null;
  // For simulation, always create a claim for testing purposes
  const shouldAutoClaim = true;

  if (shouldAutoClaim) {
    claimResult = await createClaimFromDisruption({
      userId,
      partnerId,
      policyId,
      city,
      location,
      disruptionType: preset.disruptionType,
      source: 'disruption-engine',
      weather: preset.weather,
      traffic: preset.traffic,
      locationRisk: preset.locationRisk,
      pastClaims,
      incomePattern: { currentIncome, last7DayAverageIncome },
      currentGps: currentGps || { latitude: 19.076, longitude: 72.8777, timestamp: new Date().toISOString() },
      historicalLocations,
      currentIncome,
      last7DayAverageIncome,
      disruptionDetected: true,
      amount: scenario === 'rainstorm' ? 320 : 180,
    });

    await query(
      `UPDATE disruptions SET claim_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [claimResult.claim.id, disruptionId],
    );

    await pushNotification({
      type: claimResult.decision === 'REJECT' ? 'warning' : 'success',
      title: claimResult.decision === 'REJECT' ? 'Fraud attempt blocked' : 'Disruption processed',
      message: claimResult.decision === 'REJECT'
        ? 'Fraud analysis stopped the claim instantly'
        : 'Auto-claim completed from disruption event',
      claimId: claimResult.claim.id,
      disruptionId,
      amount: claimResult.payout ? claimResult.payout.payout_amount : 0,
      userId: claimResult.claim?.user_id || null,
      partnerId: claimResult.claim?.partner_id || null,
    });
  }

  return {
    disruption: createdDisruption.rows[0],
    risk,
    autoClaimTriggered: shouldAutoClaim,
    claim: claimResult ? claimResult.claim : null,
    fraud: claimResult ? claimResult.fraud : null,
    payout: claimResult ? claimResult.payout : null,
    reasoning: claimResult ? claimResult.reasoning : [],
    claimStatus: claimResult ? claimResult.claimStatus : 'monitoring',
  };
};

const getActiveDisruptions = async () => {
  const result = await query(
    `SELECT * FROM disruptions WHERE status = 'active' ORDER BY detected_at DESC LIMIT 25`,
  );

  return result.rows;
};

const resolveDisruption = async (disruptionId) => {
  const result = await query(
    `UPDATE disruptions SET status = ?, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
    ['resolved', disruptionId],
  );

  return result.rows[0] || null;
};

const getClaimsByUser = async (userId) => getClaimsForUser(userId);

module.exports = {
  simulateDisruption,
  getActiveDisruptions,
  resolveDisruption,
  getClaimsByUser,
};