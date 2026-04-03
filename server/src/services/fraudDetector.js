const { query } = require('../config/database');

const runFraudChecks = async (partnerId, claimData) => {
  let fraudScore = 0;
  const checks = {};

  // Check 1: Duplicate claim in last 24 hours
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM claims WHERE partner_id = $1 AND DATE(created_at) = CURRENT_DATE',
      [partnerId]
    );
    const claimCount = parseInt(result.rows[0].count);
    checks.duplicate_claim = claimCount > 0;
    if (claimCount > 0) fraudScore += 20;
  } catch (error) {
    console.error('Duplicate check error:', error.message);
  }

  // Check 2: Policy active
  try {
    const result = await query(
      'SELECT id FROM policies WHERE partner_id = $1 AND status = $2',
      [partnerId, 'active']
    );
    const policyExists = result.rows.length > 0;
    checks.policy_active = policyExists;
    if (!policyExists) fraudScore += 50;
  } catch (error) {
    console.error('Policy check error:', error.message);
  }

  // Check 3: Claim frequency (more than 4 claims per week)
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM claims WHERE partner_id = $1 AND DATE(created_at) >= CURRENT_DATE - INTERVAL \'7 days\'',
      [partnerId]
    );
    const weeklyClaimCount = parseInt(result.rows[0].count);
    checks.claim_frequency = weeklyClaimCount <= 4;
    if (weeklyClaimCount > 4) fraudScore += 30;
  } catch (error) {
    console.error('Frequency check error:', error.message);
  }

  return {
    fraud_score: fraudScore,
    is_fraudulent: fraudScore >= 50,
    checks
  };
};

module.exports = { runFraudChecks };
