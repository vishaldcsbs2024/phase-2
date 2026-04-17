const { query } = require('../config/database');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const sigmoid = (value) => 1 / (1 + Math.exp(-value));

const calculateLocationRisk = (location = '') => {
  const locationKey = String(location || '').toLowerCase();
  if (locationKey.includes('chennai') || locationKey.includes('mumbai')) {
    return 70;
  }
  if (locationKey.includes('bangalore') || locationKey.includes('delhi')) {
    return 55;
  }
  return 45;
};

const isHighRiskTimeWindow = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= 0 && hour <= 5;
};

const getUserClaimSignals = async (userId) => {
  if (!userId) {
    return {
      pastClaims: 0,
      claimsIn7Days: 0,
    };
  }

  const totalResult = await query(
    `SELECT COUNT(*) AS count
     FROM claims
     WHERE user_id = ? OR partner_id = ?`,
    [userId, userId],
  );

  const recentResult = await query(
    `SELECT COUNT(*) AS count
     FROM claims
     WHERE (user_id = ? OR partner_id = ?)
       AND created_at >= datetime('now', '-7 days')`,
    [userId, userId],
  );

  return {
    pastClaims: Number(totalResult.rows[0]?.count || 0),
    claimsIn7Days: Number(recentResult.rows[0]?.count || 0),
  };
};

const analyzeFraud = async ({
  userId,
  claimId = null,
  location = '',
  locationRisk,
  timestamp,
} = {}) => {
  const signals = await getUserClaimSignals(userId);
  const eventTime = timestamp ? new Date(timestamp) : new Date();
  const derivedLocationRisk = Number.isFinite(Number(locationRisk))
    ? Number(locationRisk)
    : calculateLocationRisk(location);

  const features = {
    pastClaims: signals.pastClaims,
    claimFrequency: signals.claimsIn7Days,
    timeRisk: isHighRiskTimeWindow(eventTime) ? 1 : 0,
    locationRisk: derivedLocationRisk,
  };

  const z =
    (features.pastClaims * 0.09) +
    (features.claimFrequency * 0.23) +
    (features.timeRisk * 0.55) +
    ((features.locationRisk / 100) * 0.85) -
    1.4;

  const fraudProbability = clamp(Math.round(sigmoid(z) * 100), 0, 100);
  const fraudScore = fraudProbability;
  const decision = fraudProbability >= 70 ? 'FRAUD' : fraudProbability >= 45 ? 'SUSPICIOUS' : 'SAFE';

  return {
    fraudScore,
    fraudProbability,
    decision,
    flags: [
      features.pastClaims > 4 ? 'High number of prior claims' : null,
      features.claimFrequency > 2 ? 'Frequent recent claims pattern' : null,
      features.timeRisk ? 'Claim submitted in high-risk time window' : null,
      features.locationRisk > 65 ? 'High-risk geo-zone' : null,
    ].filter(Boolean),
    features,
    claimId,
  };
};

module.exports = {
  analyzeFraud,
};